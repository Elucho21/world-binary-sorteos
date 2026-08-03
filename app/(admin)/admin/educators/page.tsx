import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PendingEducatorsList } from "@/components/admin/pending-educators-list";
import { EducatorsList } from "@/components/admin/educators-list";

export default async function AdminEducatorsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data: educators } = await supabase
    .from("profiles")
    .select("id, display_name, brand_name, status, created_at")
    .eq("role", "educator")
    .is("managed_by", null)
    .order("created_at", { ascending: false });

  const pending = (educators ?? []).filter((e) => e.status === "pending");
  const rest = (educators ?? []).filter((e) => e.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Educadores</h1>
        <p className="text-sm text-brand-muted">Aprobá o rechazá las cuentas nuevas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pendientes de aprobación ({pending.length})</CardTitle>
        </CardHeader>
        <PendingEducatorsList educators={pending} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos los educadores</CardTitle>
          <CardDescription>{rest.length} cuentas ya revisadas.</CardDescription>
        </CardHeader>
        <EducatorsList educators={rest} />
      </Card>
    </div>
  );
}
