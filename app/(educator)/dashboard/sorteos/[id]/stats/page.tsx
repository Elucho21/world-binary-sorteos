import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MiniBarChart } from "@/components/dashboard/mini-bar-chart";
import { groupByDay } from "@/lib/stats";

export default async function SorteoStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name").eq("id", id).single();
  if (!sorteo) notFound();

  const { data: entries } = await supabase
    .from("entries")
    .select("spun_at, prize_code_id")
    .eq("sorteo_id", id);

  const rows = entries ?? [];
  const total = rows.length;
  const withPrize = rows.filter((e) => e.prize_code_id).length;
  const prizeRate = total > 0 ? Math.round((withPrize / total) * 100) : 0;
  const chartData = groupByDay(rows.map((e) => e.spun_at));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">Últimos 14 días.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{total}</p>
          <p className="text-xs text-brand-muted">Giros totales</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{withPrize}</p>
          <p className="text-xs text-brand-muted">Con premio</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{prizeRate}%</p>
          <p className="text-xs text-brand-muted">Tasa de premio</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Giros por día</CardTitle>
          <CardDescription>Últimos 14 días.</CardDescription>
        </CardHeader>
        <MiniBarChart data={chartData} />
      </Card>
    </div>
  );
}
