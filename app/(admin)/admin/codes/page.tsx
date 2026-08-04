import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WalletUploadForm, SorteoUploadForm, AssignFromWalletForm } from "@/components/admin/admin-code-forms";

interface SorteoQueryRow {
  id: string;
  name: string;
  educator_id: string;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

export default async function AdminCodesPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const [{ data: educators }, { data: sorteosRaw }, { data: unassignedRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, brand_name")
      .eq("role", "educator")
      .eq("status", "approved")
      .order("display_name"),
    supabase
      .from("sorteos")
      .select("id, name, educator_id, profiles(display_name)")
      .order("created_at", { ascending: false }),
    supabase.from("prize_codes").select("educator_id").eq("status", "unassigned"),
  ]);

  const sorteos = (sorteosRaw ?? []) as unknown as SorteoQueryRow[];

  const unassignedCounts = new Map<string, number>();
  for (const row of unassignedRows ?? []) {
    unassignedCounts.set(row.educator_id, (unassignedCounts.get(row.educator_id) ?? 0) + 1);
  }

  const educatorOptions = (educators ?? []).map((e) => {
    const pool = unassignedCounts.get(e.id) ?? 0;
    const name = e.brand_name ? `${e.display_name} (${e.brand_name})` : e.display_name ?? e.id;
    return { id: e.id, label: pool > 0 ? `${name} — bolsa: ${pool}` : name };
  });

  const sorteoOptions = sorteos.map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    const pool = unassignedCounts.get(s.educator_id) ?? 0;
    return {
      id: s.id,
      label: `${profile?.display_name ?? "?"} — ${s.name}${pool > 0 ? ` (bolsa del educador: ${pool})` : ""}`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cuentas bono</h1>
        <p className="text-sm text-brand-muted">
          Cargá y distribuí las cuentas bono generadas en el CRM de World Binary hacia los
          educadores: de antemano a su bolsa general, o directo a un sorteo puntual. Ojo: un
          código &quot;distribuido de antemano&quot; no cuenta como premio disponible de ningún
          sorteo hasta que alguien lo asigna — usá &quot;Cargar directo a un sorteo&quot; o
          &quot;Asignar desde la bolsa general&quot; si necesitás que quede listo ya mismo, sin
          depender de que el educador lo asigne desde su panel.
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
        <Card>
          <CardHeader>
            <CardTitle>Asignar desde la bolsa general</CardTitle>
            <CardDescription>
              Mové códigos que ya están en la bolsa general de un educador (sin asignar) directo a
              uno de sus sorteos, sin que el educador tenga que hacerlo.
            </CardDescription>
          </CardHeader>
          <AssignFromWalletForm sorteos={sorteoOptions} />
        </Card>
      </div>
    </div>
  );
}
