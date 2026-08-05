import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { StatsDashboard } from "@/components/admin/stats-dashboard";

interface ParticipantRow {
  email: string;
  sorteo_id: string;
  educator_id: string;
  created_at: string;
  sorteos: { name: string } | { name: string }[] | null;
}

export default async function AdminStatsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const [
    { data: participants },
    { count: totalParticipants },
    { count: totalIssued },
    { count: totalRedeemed },
    { data: prizeCodes },
    { data: educatorsData },
  ] = await Promise.all([
    supabase
      .from("participants")
      .select("email, sorteo_id, educator_id, created_at, sorteos(name)")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("participants").select("id", { count: "exact", head: true }),
    supabase.from("prize_codes").select("id", { count: "exact", head: true }).eq("status", "issued"),
    supabase.from("prize_codes").select("id", { count: "exact", head: true }).eq("status", "redeemed"),
    supabase.from("prize_codes").select("status, educator_id"),
    supabase.from("profiles").select("id, display_name").eq("role", "educator").order("display_name", { ascending: true }),
  ]);

  const participantRows = ((participants ?? []) as unknown as ParticipantRow[]).map((p) => {
    const sorteo = Array.isArray(p.sorteos) ? p.sorteos[0] : p.sorteos;
    return {
      email: p.email,
      sorteoId: p.sorteo_id,
      sorteoName: sorteo?.name ?? "?",
      educatorId: p.educator_id,
      createdAt: p.created_at,
    };
  });

  const prizeCodeRows = (prizeCodes ?? []).map((c) => ({ status: c.status, educatorId: c.educator_id }));
  const educators = (educatorsData ?? []).map((e) => ({ id: e.id, name: e.display_name ?? "—" }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas globales</h1>
        <p className="text-sm text-brand-muted">Vista general de todos los sorteos.</p>
      </div>

      <StatsDashboard
        participants={participantRows}
        prizeCodes={prizeCodeRows}
        educators={educators}
        totalParticipants={totalParticipants ?? 0}
        totalIssued={totalIssued ?? 0}
        totalRedeemed={totalRedeemed ?? 0}
      />
    </div>
  );
}
