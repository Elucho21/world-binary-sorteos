import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ParticipantsTable, type ParticipantRow } from "@/components/dashboard/participants-table";

interface WinnerRow {
  participant_id: string;
  position: number;
  prize_codes: { id: string; code: string; status: string; redeemed_at: string | null } | { id: string; code: string; status: string; redeemed_at: string | null }[] | null;
}

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name").eq("id", id).single();
  if (!sorteo) notFound();

  const [{ data: participantsData }, { data: winnersData }] = await Promise.all([
    supabase
      .from("participants")
      .select("id, name, email, created_at")
      .eq("sorteo_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("raffle_winners")
      .select("participant_id, position, prize_codes(id, code, status, redeemed_at)")
      .eq("sorteo_id", id),
  ]);

  const winnersByParticipant = new Map<string, { position: number; prizeCode: { id: string; code: string; status: string; redeemed_at: string | null } | null }>();
  for (const w of (winnersData ?? []) as unknown as WinnerRow[]) {
    const prizeCode = Array.isArray(w.prize_codes) ? w.prize_codes[0] ?? null : w.prize_codes;
    winnersByParticipant.set(w.participant_id, { position: w.position, prizeCode });
  }

  const participants: ParticipantRow[] = (participantsData ?? []).map((p) => {
    const winner = winnersByParticipant.get(p.id);
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      created_at: p.created_at,
      position: winner?.position ?? null,
      prize_code: winner?.prizeCode ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Participantes — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">{participants.length} inscriptos.</p>
      </div>

      <ParticipantsTable sorteoId={id} participants={participants} />
    </div>
  );
}
