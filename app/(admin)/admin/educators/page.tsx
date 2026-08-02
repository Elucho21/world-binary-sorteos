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
    .select("id, display_name, brand_name, status, created_at, referred_by")
    .eq("role", "educator")
    .is("managed_by", null)
    .order("created_at", { ascending: false });

  const referrerIds = Array.from(
    new Set((educators ?? []).map((e) => e.referred_by).filter((id): id is string => !!id))
  );
  const { data: referrers } =
    referrerIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", referrerIds)
      : { data: [] };
  const referrerNames = new Map((referrers ?? []).map((r) => [r.id, r.display_name]));

  const withReferrer = (educators ?? []).map((e) => ({
    ...e,
    referrerName: e.referred_by ? referrerNames.get(e.referred_by) : null,
  }));
  const pending = withReferrer.filter((e) => e.status === "pending");
  const rest = withReferrer.filter((e) => e.status !== "pending");

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
