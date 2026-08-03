import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ParticipantsTable, type ParticipantRow } from "@/components/dashboard/participants-table";

const PAGE_SIZE = 50;
const EXPORT_CAP = 5000;

interface WinnerRow {
  participant_id: string;
  position: number;
  prize_codes: { id: string; code: string; status: string; redeemed_at: string | null } | { id: string; code: string; status: string; redeemed_at: string | null }[] | null;
}

interface RawParticipant {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

function toParticipantRows(
  raw: RawParticipant[],
  winnersByParticipant: Map<string, { position: number; prizeCode: ParticipantRow["prize_code"] }>
): ParticipantRow[] {
  return raw.map((p) => {
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
}

export default async function ParticipantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { id } = await params;
  const { q, page: pageParam } = await searchParams;
  const profile = await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name, drawn_at").eq("id", id).single();
  if (!sorteo) notFound();

  const rootHref = profile.role === "super_admin" ? "/admin/sorteos" : "/dashboard";
  const rootLabel = profile.role === "super_admin" ? "Sorteos" : "Mis sorteos";

  const query = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let listQuery = supabase
    .from("participants")
    .select("id, name, email, created_at", { count: "exact" })
    .eq("sorteo_id", id)
    .order("created_at", { ascending: false })
    .range(from, to);
  let exportQuery = supabase
    .from("participants")
    .select("id, name, email, created_at")
    .eq("sorteo_id", id)
    .order("created_at", { ascending: false })
    .limit(EXPORT_CAP);

  if (query) {
    const filter = `name.ilike.%${query}%,email.ilike.%${query}%`;
    listQuery = listQuery.or(filter);
    exportQuery = exportQuery.or(filter);
  }

  const [{ data: participantsData, count }, { data: exportParticipantsData }, { data: winnersData }] =
    await Promise.all([
      listQuery,
      exportQuery,
      supabase
        .from("raffle_winners")
        .select("participant_id, position, prize_codes(id, code, status, redeemed_at)")
        .eq("sorteo_id", id),
    ]);

  const winnersByParticipant = new Map<string, { position: number; prizeCode: ParticipantRow["prize_code"] }>();
  for (const w of (winnersData ?? []) as unknown as WinnerRow[]) {
    const prizeCode = Array.isArray(w.prize_codes) ? w.prize_codes[0] ?? null : w.prize_codes;
    winnersByParticipant.set(w.participant_id, { position: w.position, prizeCode });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const participants = toParticipantRows(participantsData ?? [], winnersByParticipant);
  const exportRows = toParticipantRows(exportParticipantsData ?? [], winnersByParticipant);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: rootLabel, href: rootHref },
          { label: sorteo.name, href: `/dashboard/sorteos/${id}` },
          { label: "Participantes" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold">Participantes — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">{total} inscriptos.</p>
      </div>

      <form className="max-w-xs">
        <Input name="q" defaultValue={query} placeholder="Buscar por nombre o email..." />
      </form>

      <ParticipantsTable
        sorteoId={id}
        participants={participants}
        exportRows={exportRows}
        sorteoDrawn={Boolean(sorteo.drawn_at)}
      />

      <Pagination page={page} totalPages={totalPages} buildHref={(p) => `?q=${encodeURIComponent(query)}&page=${p}`} />
    </div>
  );
}
