import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WalletUploadForm, SegmentUploadForm } from "@/components/admin/admin-code-forms";

interface SegmentQueryRow {
  id: string;
  label: string;
  sorteos: { name: string; profiles: { display_name: string | null } | { display_name: string | null }[] | null } | null;
}

export default async function AdminCodesPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data: educators } = await supabase
    .from("profiles")
    .select("id, display_name, brand_name")
    .eq("role", "educator")
    .eq("status", "approved")
    .order("display_name");

  const { data: segmentsRaw } = await supabase
    .from("wheel_segments")
    .select("id, label, sorteos(name, profiles(display_name))")
    .eq("is_consolation", false)
    .order("sort_order");

  const segments = (segmentsRaw ?? []) as unknown as SegmentQueryRow[];

  const educatorOptions = (educators ?? []).map((e) => ({
    id: e.id,
    label: e.brand_name ? `${e.display_name} (${e.brand_name})` : e.display_name ?? e.id,
  }));

  const segmentOptions = segments.map((s) => {
    const profile = Array.isArray(s.sorteos?.profiles) ? s.sorteos?.profiles[0] : s.sorteos?.profiles;
    return {
      id: s.id,
      label: `${profile?.display_name ?? "?"} — ${s.sorteos?.name ?? "?"} — ${s.label}`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cuentas bono</h1>
        <p className="text-sm text-brand-muted">
          Cargá y distribuí las cuentas bono generadas en el CRM de World Binary hacia los
          educadores: de antemano a su bolsa general, o directo a un segmento puntual.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuir de antemano</CardTitle>
            <CardDescription>
              El educador después decide a qué sorteo/segmento asignar cada código.
            </CardDescription>
          </CardHeader>
          <WalletUploadForm educators={educatorOptions} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cargar directo a un sorteo</CardTitle>
            <CardDescription>Los códigos quedan disponibles inmediatamente en ese segmento.</CardDescription>
          </CardHeader>
          <SegmentUploadForm segments={segmentOptions} />
        </Card>
      </div>
    </div>
  );
}
