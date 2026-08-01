import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DrawFlow } from "@/components/wheel/draw-flow";
import type { DrawnWinner } from "@/app/(educator)/dashboard/sorteos/actions";

interface WinnerRow {
  participant_id: string;
  position: number;
  participants: { name: string } | { name: string }[] | null;
  prize_codes: { code: string } | { code: string }[] | null;
}

export default async function SorteoWinnersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase
    .from("sorteos")
    .select("id, name, winners_count, drawn_at")
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
      .select("participant_id, position, participants(name), prize_codes(code)")
      .eq("sorteo_id", id)
      .order("position", { ascending: true });

    existingWinners = ((winnersData ?? []) as unknown as WinnerRow[]).map((w) => {
      const participant = Array.isArray(w.participants) ? w.participants[0] : w.participants;
      const code = Array.isArray(w.prize_codes) ? w.prize_codes[0] : w.prize_codes;
      return { participantId: w.participant_id, name: participant?.name ?? "?", code: code?.code ?? null };
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
      <div>
        <h1 className="text-2xl font-semibold">Sorteo — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">
          {sorteo.drawn_at
            ? "Este sorteo ya se realizó."
            : `${participants?.length ?? 0} inscriptos · se van a sortear ${sorteo.winners_count} ganador(es).`}
        </p>
      </div>

      <DrawFlow
        sorteoId={id}
        participants={participants ?? []}
        winnersCount={sorteo.winners_count}
        alreadyDrawn={!!sorteo.drawn_at}
        existingWinners={existingWinners}
      />
    </div>
  );
}
