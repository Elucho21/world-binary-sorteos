import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrationSchema } from "@/lib/validation";
import { hasMxRecord, isDisposableDomain } from "@/lib/mx-check";
import { verifyTurnstileToken } from "@/lib/turnstile";
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

async function fireWebhookBestEffort(payload: Record<string, unknown>) {
  try {
    // admin_settings.webhook_url is only readable by super admins now
    // (RLS, v1.8) — this read is server-only and never exposed to the
    // client, just used internally to fire the CRM ping.
    const supabase = createAdminClient();
    const { data: settings } = await supabase.from("admin_settings").select("webhook_url").eq("id", true).single();
    const url = settings?.webhook_url;
    if (!url) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => undefined);
    clearTimeout(timeout);
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

  if (isDisposableDomain(parsed.data.email)) {
    return NextResponse.json(
      { error: "Ese dominio de email temporal no está permitido. Usá tu email real." },
      { status: 400 }
    );
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
    void fireWebhookBestEffort({
      name: parsed.data.name,
      email: parsed.data.email,
      sorteo_slug: slug,
      evento: "nuevo_registro",
    });
  }

  return NextResponse.json(result);
}
