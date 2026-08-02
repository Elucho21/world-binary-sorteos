import { createClient } from "@supabase/supabase-js";

// Runs daily. A prize a winner never claims (still 'issued', never redeemed)
// after RECLAIM_AFTER_DAYS gets reassigned once to a random participant of
// the same sorteo who wasn't already a winner — so real value doesn't sit
// parked on someone who never showed up. Each raffle_winners row is only
// ever reassigned once (reassigned_at gates it) to keep this bounded.
const RECLAIM_AFTER_DAYS = 7;

const reassignUnclaimedPrizes = async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cutoff = new Date(Date.now() - RECLAIM_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleCodes, error: staleError } = await supabase
    .from("prize_codes")
    .select("id, sorteo_id, issued_to")
    .eq("status", "issued")
    .lt("issued_at", cutoff);

  if (staleError) {
    console.error("reassign-unclaimed-prizes: failed to list stale codes:", staleError.message);
    return;
  }

  for (const code of staleCodes ?? []) {
    if (!code.sorteo_id) continue;

    const { data: winnerRow } = await supabase
      .from("raffle_winners")
      .select("id, participant_id, original_participant_id")
      .eq("prize_code_id", code.id)
      .is("reassigned_at", null)
      .maybeSingle();

    if (!winnerRow) continue; // already reassigned once, or no matching winner row

    const [{ data: allParticipants }, { data: currentWinners }] = await Promise.all([
      supabase.from("participants").select("id").eq("sorteo_id", code.sorteo_id),
      supabase.from("raffle_winners").select("participant_id").eq("sorteo_id", code.sorteo_id),
    ]);

    const winnerIds = new Set((currentWinners ?? []).map((w) => w.participant_id));
    const eligible = (allParticipants ?? []).filter((p) => !winnerIds.has(p.id));
    if (eligible.length === 0) continue;

    const newParticipant = eligible[Math.floor(Math.random() * eligible.length)];
    const now = new Date().toISOString();

    const { error: winnerUpdateError } = await supabase
      .from("raffle_winners")
      .update({
        participant_id: newParticipant.id,
        original_participant_id: winnerRow.original_participant_id ?? winnerRow.participant_id,
        reassigned_at: now,
      })
      .eq("id", winnerRow.id);

    if (winnerUpdateError) {
      console.error("reassign-unclaimed-prizes: failed to update raffle_winners:", winnerUpdateError.message);
      continue;
    }

    await supabase.from("prize_codes").update({ issued_to: newParticipant.id, issued_at: now }).eq("id", code.id);

    await supabase.from("audit_log").insert({
      action: "raffle_winner_reassigned",
      target_id: code.sorteo_id,
      metadata: {
        prize_code_id: code.id,
        original_participant_id: winnerRow.participant_id,
        new_participant_id: newParticipant.id,
        reclaim_after_days: RECLAIM_AFTER_DAYS,
      },
    });
  }
};

export default reassignUnclaimedPrizes;

export const config = {
  schedule: "@daily",
};
