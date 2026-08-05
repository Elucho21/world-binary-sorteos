import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getCachedAdminStats } from "@/lib/cache";
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

  const { participants, totalParticipants, totalIssued, totalRedeemed, prizeCodes } = await getCachedAdminStats();

  const { data: educatorsData } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("role", "educator")
    .order("display_name", { ascending: true });

  const participantRows = (participants as unknown as ParticipantRow[]).map((p) => {
    const sorteo = Array.isArray(p.sorteos) ? p.sorteos[0] : p.sorteos;
    return {
      email: p.email,
      sorteoId: p.sorteo_id,
      sorteoName: sorteo?.name ?? "?",
      educatorId: p.educator_id,
      createdAt: p.created_at,
    };
  });

  const prizeCodeRows = prizeCodes.map((c) => ({ status: c.status, educatorId: c.educator_id }));
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
        totalParticipants={totalParticipants}
        totalIssued={totalIssued}
        totalRedeemed={totalRedeemed}
      />
    </div>
  );
}
