import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MiniBarChart } from "@/components/dashboard/mini-bar-chart";
import { groupByDay } from "@/lib/stats";
import { ValueReportCard } from "@/components/dashboard/value-report-card";

export default async function SorteoStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase
    .from("sorteos")
    .select("id, name, educator_id, winners_count, drawn_at")
    .eq("id", id)
    .single();
  if (!sorteo) notFound();

  const [{ data: participants }, { count: prizesAvailable }, { data: thisSorteoEmails }, { data: otherSorteoEmails }] =
    await Promise.all([
      supabase.from("participants").select("created_at").eq("sorteo_id", id),
      supabase
        .from("prize_codes")
        .select("id", { count: "exact", head: true })
        .eq("sorteo_id", id)
        .eq("status", "available"),
      supabase.from("participants").select("email").eq("sorteo_id", id),
      supabase.from("participants").select("email").eq("educator_id", sorteo.educator_id).neq("sorteo_id", id),
    ]);

  const rows = participants ?? [];
  const total = rows.length;
  const chartData = groupByDay(rows.map((p) => p.created_at));

  const seenElsewhere = new Set((otherSorteoEmails ?? []).map((p) => p.email));
  const newCount = (thisSorteoEmails ?? []).filter((p) => !seenElsewhere.has(p.email)).length;
  const valueReport = { total: thisSorteoEmails?.length ?? 0, newCount, returningCount: (thisSorteoEmails?.length ?? 0) - newCount };

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
