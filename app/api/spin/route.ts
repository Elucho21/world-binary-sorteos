import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { registrationSchema } from "@/lib/validation";

function friendlyError(message: string) {
  if (message.includes("sorteo not available")) return "Este sorteo no está disponible.";
  if (message.includes("too many attempts")) return "Demasiados intentos, probá más tarde.";
  if (message.includes("no prizes available")) return "No quedan premios disponibles en este sorteo.";
  if (message.includes("invalid email")) return "Ingresá un email válido.";
  if (message.includes("invalid name")) return "Ingresá tu nombre.";
  if (message.includes("sorteo has ended")) return "Este sorteo ya finalizó.";
  if (message.includes("sorteo not started")) return "Este sorteo todavía no empezó.";
  return "No se pudo procesar tu giro. Intentá de nuevo.";
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

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spin_wheel", {
    p_slug: slug,
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_honeypot: parsed.data.honeypot ?? "",
    p_ip_hash: ipHash,
  });

  if (error) {
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 400 });
  }

  return NextResponse.json(data);
}
