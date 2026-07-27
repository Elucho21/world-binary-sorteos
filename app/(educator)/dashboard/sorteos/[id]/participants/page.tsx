import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ParticipantsTable } from "@/components/dashboard/participants-table";

interface EntryRow {
  id: string;
  spun_at: string;
  participants: { name: string; email: string } | null;
  wheel_segments: { label: string } | null;
  prize_codes: { id: string; code: string; status: string; redeemed_at: string | null } | null;
}

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name").eq("id", id).single();
  if (!sorteo) notFound();

  const { data } = await supabase
    .from("entries")
    .select(
      "id, spun_at, participants(name, email), wheel_segments(label), prize_codes(id, code, status, redeemed_at)"
    )
    .eq("sorteo_id", id)
    .order("spun_at", { ascending: false });

  const entries = (data ?? []) as unknown as EntryRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Participantes — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">{entries.length} giros registrados.</p>
      </div>

      <ParticipantsTable sorteoId={id} entries={entries} />
    </div>
  );
}
