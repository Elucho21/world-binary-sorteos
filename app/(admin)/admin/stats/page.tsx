import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MiniBarChart } from "@/components/dashboard/mini-bar-chart";
import { groupByDay } from "@/lib/stats";

interface TopSorteoRow {
  sorteo_id: string;
  sorteos: { name: string } | { name: string }[] | null;
}

export default async function AdminStatsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const [
    { data: recentParticipants },
    { count: totalParticipants },
    { count: totalIssued },
    { count: totalRedeemed },
    { data: participantsBySorteo },
  ] = await Promise.all([
    supabase.from("participants").select("created_at").order("created_at", { ascending: false }).limit(5000),
    supabase.from("participants").select("id", { count: "exact", head: true }),
    supabase.from("prize_codes").select("id", { count: "exact", head: true }).eq("status", "issued"),
    supabase.from("prize_codes").select("id", { count: "exact", head: true }).eq("status", "redeemed"),
    supabase.from("participants").select("sorteo_id, sorteos(name)").limit(5000),
  ]);

  const rows = recentParticipants ?? [];
  const chartData = groupByDay(rows.map((p) => p.created_at));

  const counts = new Map<string, { name: string; count: number }>();
  for (const row of (participantsBySorteo ?? []) as unknown as TopSorteoRow[]) {
    const sorteo = Array.isArray(row.sorteos) ? row.sorteos[0] : row.sorteos;
    const current = counts.get(row.sorteo_id) ?? { name: sorteo?.name ?? "?", count: 0 };
    current.count += 1;
    counts.set(row.sorteo_id, current);
  }
  const topSorteos = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas globales</h1>
        <p className="text-sm text-brand-muted">Vista general de todos los sorteos.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{totalParticipants ?? 0}</p>
          <p className="text-xs text-brand-muted">Participantes totales</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{totalIssued ?? 0}</p>
          <p className="text-xs text-brand-muted">Códigos emitidos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{totalRedeemed ?? 0}</p>
          <p className="text-xs text-brand-muted">Códigos canjeados</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscriptos por día</CardTitle>
          <CardDescription>Últimos 14 días, todos los sorteos.</CardDescription>
        </CardHeader>
        <MiniBarChart data={chartData} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 sorteos por participantes</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {topSorteos.map((s, i) => (
            <div key={i} className="flex items-center justify-between border-b border-brand-border/60 py-2">
              <span>{s.name}</span>
              <span className="font-semibold">{s.count}</span>
            </div>
          ))}
          {topSorteos.length === 0 && <p className="text-sm text-brand-muted">Todavía no hay datos.</p>}
        </div>
      </Card>
    </div>
  );
}
