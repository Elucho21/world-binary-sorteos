import { NextResponse } from "next/server";
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

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_participant_prize", {
    p_slug: parsed.data.slug,
    p_participant_id: parsed.data.participantId,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo revisar tu premio." }, { status: 400 });
  }

  return NextResponse.json(data as CheckParticipantPrizeResult);
}
