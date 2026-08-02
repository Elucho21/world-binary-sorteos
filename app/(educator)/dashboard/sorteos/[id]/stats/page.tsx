import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MiniBarChart } from "@/components/dashboard/mini-bar-chart";
import { groupByDay } from "@/lib/stats";
import { getCachedSorteoStats, getCachedSorteoValueReport } from "@/lib/cache";
import { ValueReportCard } from "@/components/dashboard/value-report-card";

export default async function SorteoStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase
    .from("sorteos")
    .select("id, name, educator_id, winners_count, drawn_at, created_at")
    .eq("id", id)
    .single();
  if (!sorteo) notFound();

  // Ownership was just verified above via the RLS-scoped query (notFound()
  // would have fired otherwise), so it's safe to serve the heavier aggregate
  // for this exact sorteoId from the shared, time-based cache below.
  const [{ participants, prizesAvailable }, valueReport] = await Promise.all([
    getCachedSorteoStats(id),
    getCachedSorteoValueReport(id, sorteo.educator_id),
  ]);

  const rows = participants;
  const total = rows.length;
  const chartData = groupByDay(rows.map((p) => p.created_at));

  const rootHref = profile.role === "super_admin" ? "/admin/sorteos" : "/dashboard";
  const rootLabel = profile.role === "super_admin" ? "Sorteos" : "Mis sorteos";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: rootLabel, href: rootHref },
          { label: sorteo.name, href: `/dashboard/sorteos/${id}` },
          { label: "Estadísticas" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">Últimos 14 días.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{total}</p>
          <p className="text-xs text-brand-muted">Inscriptos totales</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{sorteo.winners_count}</p>
          <p className="text-xs text-brand-muted">Ganadores a sortear</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{prizesAvailable ?? 0}</p>
          <p className="text-xs text-brand-muted">Premios disponibles</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscriptos por día</CardTitle>
          <CardDescription>Últimos 14 días.</CardDescription>
        </CardHeader>
        <MiniBarChart data={chartData} />
      </Card>

      <ValueReportCard
        total={valueReport.total}
        newCount={valueReport.newCount}
        returningCount={valueReport.returningCount}
      />
    </div>
  );
}
