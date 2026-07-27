import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data: settings } = await supabase.from("admin_settings").select("*").eq("id", true).single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-brand-muted">Ajustes generales de la plataforma.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Nombre, contacto y webhook hacia el CRM de World Binary.</CardDescription>
        </CardHeader>
        {settings && <SiteSettingsForm settings={settings} />}
      </Card>
    </div>
  );
}
