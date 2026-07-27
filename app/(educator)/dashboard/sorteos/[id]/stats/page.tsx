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

  const { data: sorteo } = await supabase
    .from("sorteos")
    .select("id, name, winners_count, drawn_at")
    .eq("id", id)
    .single();
  if (!sorteo) notFound();

  const [{ data: participants }, { count: prizesAvailable }] = await Promise.all([
    supabase.from("participants").select("created_at").eq("sorteo_id", id),
    supabase
      .from("prize_codes")
      .select("id", { count: "exact", head: true })
      .eq("sorteo_id", id)
      .eq("status", "available"),
  ]);

  const rows = participants ?? [];
  const total = rows.length;
  const chartData = groupByDay(rows.map((p) => p.created_at));

  return (
    <div className="space-y-6">
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
    </div>
  );
}
