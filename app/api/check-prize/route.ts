import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { checkPrizeSchema } from "@/lib/validation";
import type { CheckParticipantPrizeResult } from "@/types/database.types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = checkPrizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_participant_prize", {
    p_slug: parsed.data.slug,
    p_participant_id: parsed.data.participantId,
    p_ip_hash: ipHash,
  });

  if (error) {
    const message = error.message.includes("too many attempts")
      ? "Demasiados intentos, probá más tarde."
      : "No se pudo revisar tu premio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json(data as CheckParticipantPrizeResult);
}
