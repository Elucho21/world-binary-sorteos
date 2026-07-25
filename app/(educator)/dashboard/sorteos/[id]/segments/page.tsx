import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wheel } from "@/components/wheel/wheel";
import { SegmentRow } from "@/components/dashboard/segment-row";
import { AddSegmentForm, DEFAULT_COLORS } from "@/components/dashboard/add-segment-form";

export default async function SegmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name").eq("id", id).single();
  if (!sorteo) notFound();

  const { data: segments } = await supabase
    .from("wheel_segments")
    .select("*")
    .eq("sorteo_id", id)
    .order("sort_order", { ascending: true });

  const activeSegments = (segments ?? []).filter((s) => s.is_active);
  const nextColor = DEFAULT_COLORS[(segments?.length ?? 0) % DEFAULT_COLORS.length];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ruleta — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">
          El peso define la probabilidad relativa de cada segmento. Los segmentos con premio
          necesitan códigos cargados y disponibles para poder salir sorteados.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Wheel
          segments={activeSegments.map((s) => ({ id: s.id, label: s.label, color: s.color }))}
          size={220}
        />
        <div className="text-sm text-brand-muted">
          <p className="font-medium text-brand-text">Vista previa</p>
          <p>Se actualiza con los segmentos activos. El giro real ocurre en la página pública.</p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segmentos ({segments?.length ?? 0})</CardTitle>
          <CardDescription>Editá, activá/desactivá o borrá cada segmento.</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {(segments ?? []).map((segment) => (
            <SegmentRow key={segment.id} sorteoId={id} segment={segment} />
          ))}
          {(!segments || segments.length === 0) && (
            <p className="text-sm text-brand-muted">Todavía no agregaste segmentos.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregar segmento</CardTitle>
        </CardHeader>
        <AddSegmentForm sorteoId={id} nextColor={nextColor} />
      </Card>
    </div>
  );
}
