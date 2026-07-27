import { notFound } from "next/navigation";
import { requireApprovedEducator, effectiveEducatorId } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SorteoCodesPanel } from "@/components/dashboard/sorteo-codes-panel";

export default async function SorteoCodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireApprovedEducator();
  const educatorId = effectiveEducatorId(profile);
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name").eq("id", id).single();
  if (!sorteo) notFound();

  const { data: codes } = await supabase
    .from("prize_codes")
    .select("id, code, status")
    .eq("sorteo_id", id)
    .order("created_at", { ascending: false });

  const { count: poolAvailable } = await supabase
    .from("prize_codes")
    .select("id", { count: "exact", head: true })
    .eq("educator_id", educatorId)
    .eq("status", "unassigned");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Premios — {sorteo.name}</h1>
        <p className="text-sm text-brand-muted">
          Cargá acá las cuentas bono que se van a repartir entre los ganadores de este sorteo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas bono de este sorteo ({codes?.length ?? 0})</CardTitle>
          <CardDescription>
            Necesitás al menos 1 código disponible para poder activar el sorteo, y al menos
            tantos como ganadores quieras sortear.
          </CardDescription>
        </CardHeader>
        <SorteoCodesPanel sorteoId={id} codes={codes ?? []} poolAvailable={poolAvailable ?? 0} />
      </Card>
    </div>
  );
}
