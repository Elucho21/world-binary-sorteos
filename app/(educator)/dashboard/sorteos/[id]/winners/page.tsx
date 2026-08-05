import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DrawFlow } from "@/components/wheel/draw-flow";
import { LiveParticipantPulse } from "@/components/dashboard/live-participant-pulse";
import { VerifiableDrawCard } from "@/components/dashboard/verifiable-draw-card";
import { DownloadReportButton } from "@/components/dashboard/download-report-button";
import type { DrawnWinner } from "@/app/(educator)/dashboard/sorteos/actions";

interface WinnerRow {
  id: string;
  participant_id: string;
  position: number;
  participants: { name: string } | { name: string }[] | null;
  prize_codes: { code: string; tier: string | null } | { code: string; tier: string | null }[] | null;
}

export default async function SorteoWinnersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase
    .from("sorteos")
    .select("id, name, winners_count, drawn_at, draw_seed, draw_participants_hash")
    .eq("id", id)
    .single();
  if (!sorteo) notFound();

  const { data: participants } = await supabase
    .from("participants")
    .select("id, name")
    .eq("sorteo_id", id)
    .order("created_at", { ascending: true });

  let existingWinners: DrawnWinner[] = [];
  if (sorteo.drawn_at) {
    const { data: winnersData } = await supabase
      .from("raffle_winners")
      .select("id, participant_id, position, participants(name), prize_codes(code, tier)")
      .eq("sorteo_id", id)
      .order("position", { ascending: true });

    existingWinners = ((winnersData ?? []) as unknown as WinnerRow[]).map((w) => {
      const participant = Array.isArray(w.participants) ? w.participants[0] : w.participants;
      const code = Array.isArray(w.prize_codes) ? w.prize_codes[0] : w.prize_codes;
      return {
        participantId: w.participant_id,
        name: participant?.name ?? "?",
        code: code?.code ?? null,
        tier: code?.tier ?? null,
        raffleWinnerId: w.id,
      };
    });
  }

  const rootHref = profile.role === "super_admin" ? "/admin/sorteos" : "/dashboard";
  const rootLabel = profile.role === "super_admin" ? "Sorteos" : "Mis sorteos";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: rootLabel, href: rootHref },
          { label: sorteo.name, href: `/dashboard/sorteos/${id}` },
          { label: "Ganadores" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sorteo — {sorteo.name}</h1>
          <p className="text-sm text-brand-muted">
            {sorteo.drawn_at
              ? "Este sorteo ya se realizó."
              : `${participants?.length ?? 0} inscriptos · se van a sortear ${sorteo.winners_count} ganador(es).`}
          </p>
        </div>
        {sorteo.drawn_at && <DownloadReportButton sorteoId={id} />}
      </div>

      {!sorteo.drawn_at && <LiveParticipantPulse sorteoId={id} initialCount={participants?.length ?? 0} />}

      <DrawFlow
        sorteoId={id}
        participants={participants ?? []}
        winnersCount={sorteo.winners_count}
        alreadyDrawn={!!sorteo.drawn_at}
        existingWinners={existingWinners}
      />

      {sorteo.drawn_at && sorteo.draw_seed && (
        <VerifiableDrawCard seed={sorteo.draw_seed} participantsHash={sorteo.draw_participants_hash} />
      )}
    </div>
  );
}
