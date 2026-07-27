import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApprovedEducator, effectiveEducatorId } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SegmentCodesPanel } from "@/components/dashboard/segment-codes-panel";

export default async function SorteoCodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireApprovedEducator();
  const educatorId = effectiveEducatorId(profile);
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name").eq("id", id).single();
  if (!sorteo) notFound();

  const { data: segments } = await supabase
    .from("wheel_segments")
    .select("*")
    .eq("sorteo_id", id)
    .order("sort_order", { ascending: true });

  const { data: codes } = await supabase
    .from("prize_codes")
    .select("id, code, status, segment_id")
    .eq("educator_id", educatorId)
    .not("segment_id", "is", null);

  const { count: poolAvailable } = await supabase
    .from("prize_codes")
    .select("id", { count: "exact", head: true })
    .eq("educator_id", educatorId)
    .eq("status", "unassigned");

  const codesBySegment = new Map<string, { id: string; code: string; status: string }[]>();
  for (const c of codes ?? []) {
    if (!c.segment_id) continue;
    const list = codesBySegment.get(c.segment_id) ?? [];
    list.push({ id: c.id, code: c.code, status: c.status });
    codesBySegment.set(c.segment_id, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Códigos — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">
          Asigná cuentas bono de tu pool general a cada segmento premiado, o cargalas
          directamente para este sorteo.
        </p>
      </div>

      {(!segments || segments.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay segmentos</CardTitle>
            <CardDescription>
              Creá primero los segmentos de la ruleta en{" "}
              <Link href={`/dashboard/sorteos/${id}/segments`} className="text-brand-primary hover:underline">
                la sección Ruleta
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-4">
        {(segments ?? []).map((segment) => (
          <SegmentCodesPanel
            key={segment.id}
            sorteoId={id}
            segment={segment}
            codes={codesBySegment.get(segment.id) ?? []}
            poolAvailable={poolAvailable ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
