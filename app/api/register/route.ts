import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { registrationSchema } from "@/lib/validation";
import { hasMxRecord } from "@/lib/mx-check";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendCrmWebhook } from "@/lib/webhook";
import type { RegisterParticipantResult } from "@/types/database.types";

function friendlyError(message: string) {
  if (message.includes("sorteo not available")) return "Este sorteo no está disponible.";
  if (message.includes("too many attempts")) return "Demasiados intentos, probá más tarde.";
  if (message.includes("invalid email")) return "Ingresá un email válido.";
  if (message.includes("invalid name")) return "Ingresá tu nombre.";
  if (message.includes("sorteo has ended")) return "Este sorteo ya cerró la inscripción.";
  if (message.includes("sorteo not started")) return "Este sorteo todavía no empezó.";
  return "No se pudo procesar tu registro. Intentá de nuevo.";
}

async function notifyRegistrationBestEffort(payload: { name: string; email: string; slug: string }) {
  try {
    const supabase = await createClient();
    const { data: settings } = await supabase.from("admin_settings").select("webhook_url").eq("id", true).single();
    const url = settings?.webhook_url;
    if (!url) return;

    const { data: sorteoRow } = await supabase
      .from("sorteos")
      .select("name, profiles(display_name)")
      .eq("slug", payload.slug)
      .single();
    const educatorProfile = Array.isArray(sorteoRow?.profiles) ? sorteoRow.profiles[0] : sorteoRow?.profiles;

    await sendCrmWebhook(url, {
      name: payload.name,
      email: payload.email,
      sorteo_slug: payload.slug,
      sorteo_name: sorteoRow?.name ?? null,
      educador: educatorProfile?.display_name ?? null,
      evento: "nuevo_registro",
      // El resultado del sorteo todavía no se conoce a esta altura — llega
      // en un segundo POST (evento "sorteo_resultado") cuando se sortea.
      gano: null,
      codigo: null,
    });
  } catch {
    // Best-effort only — a CRM outage should never affect registration.
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const { slug, ...rest } = (body as Record<string, unknown>) ?? {};
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Falta el sorteo." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." },
      { status: 400 }
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const turnstileOk = await verifyTurnstileToken(parsed.data.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json({ error: "No pudimos verificar que sos una persona. Probá de nuevo." }, { status: 400 });
  }

  const mxOk = await hasMxRecord(parsed.data.email);
  if (!mxOk) {
    return NextResponse.json({ error: "Ese dominio de email no parece existir. Revisalo." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_participant", {
    p_slug: slug,
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_honeypot: parsed.data.honeypot ?? "",
    p_ip_hash: ipHash,
  });

  if (error) {
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 400 });
  }

  const result = data as RegisterParticipantResult;
  if (!result.already_registered) {
    void notifyRegistrationBestEffort({
      name: parsed.data.name,
      email: parsed.data.email,
      slug,
    });
  }

  return NextResponse.json(result);
}
