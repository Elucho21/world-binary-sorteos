import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminNewSorteoForm } from "@/components/admin/admin-new-sorteo-form";

export default async function AdminNewSorteoPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data: educators } = await supabase
    .from("profiles")
    .select("id, display_name, brand_name")
    .eq("role", "educator")
    .eq("status", "approved")
    .order("display_name");

  const educatorOptions = (educators ?? []).map((e) => ({
    id: e.id,
    label: e.brand_name ? `${e.display_name} (${e.brand_name})` : e.display_name ?? e.id,
  }));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo sorteo</h1>
        <p className="text-sm text-brand-muted">
          Creá un sorteo en nombre de un educador. Después de crearlo, entrás a configurar la
          ruleta y los premios desde el mismo panel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del sorteo</CardTitle>
          <CardDescription>
            {educatorOptions.length === 0
              ? "Todavía no hay educadores aprobados a los que asignarle un sorteo."
              : "Elegí el educador dueño del sorteo."}
          </CardDescription>
        </CardHeader>
        <AdminNewSorteoForm educators={educatorOptions} />
      </Card>
    </div>
  );
}
