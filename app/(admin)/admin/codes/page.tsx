import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WalletUploadForm, SorteoUploadForm } from "@/components/admin/admin-code-forms";

interface SorteoQueryRow {
  id: string;
  name: string;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
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

  const { data: sorteosRaw } = await supabase
    .from("sorteos")
    .select("id, name, profiles(display_name)")
    .order("created_at", { ascending: false });

  const sorteos = (sorteosRaw ?? []) as unknown as SorteoQueryRow[];

  const educatorOptions = (educators ?? []).map((e) => ({
    id: e.id,
    label: e.brand_name ? `${e.display_name} (${e.brand_name})` : e.display_name ?? e.id,
  }));

  const sorteoOptions = sorteos.map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return {
      id: s.id,
      label: `${profile?.display_name ?? "?"} — ${s.name}`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cuentas bono</h1>
        <p className="text-sm text-brand-muted">
          Cargá y distribuí las cuentas bono generadas en el CRM de World Binary hacia los
          educadores: de antemano a su bolsa general, o directo a un sorteo puntual.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuir de antemano</CardTitle>
            <CardDescription>
              El educador después decide a qué sorteo asignar cada código.
            </CardDescription>
          </CardHeader>
          <WalletUploadForm educators={educatorOptions} />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cargar directo a un sorteo</CardTitle>
            <CardDescription>Los códigos quedan disponibles inmediatamente en ese sorteo.</CardDescription>
          </CardHeader>
          <SorteoUploadForm sorteos={sorteoOptions} />
        </Card>
      </div>
    </div>
  );
}
