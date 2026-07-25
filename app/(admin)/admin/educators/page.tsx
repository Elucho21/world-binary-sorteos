import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setEducatorStatus } from "./actions";
import type { ProfileStatus } from "@/types/database.types";

const statusTone: Record<ProfileStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const statusLabel: Record<ProfileStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export default async function AdminEducatorsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data: educators } = await supabase
    .from("profiles")
    .select("id, display_name, brand_name, status, created_at")
    .eq("role", "educator")
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
        <div className="space-y-2">
          {pending.map((educator) => (
            <div
              key={educator.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border p-3"
            >
              <div>
                <p className="font-medium">{educator.display_name}</p>
                {educator.brand_name && <p className="text-xs text-brand-muted">{educator.brand_name}</p>}
              </div>
              <div className="flex gap-2">
                <form action={setEducatorStatus.bind(null, educator.id, "approved")}>
                  <Button type="submit" size="sm">
                    Aprobar
                  </Button>
                </form>
                <form action={setEducatorStatus.bind(null, educator.id, "rejected")}>
                  <Button type="submit" size="sm" variant="danger">
                    Rechazar
                  </Button>
                </form>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-sm text-brand-muted">No hay cuentas pendientes.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos los educadores</CardTitle>
          <CardDescription>{rest.length} cuentas ya revisadas.</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {rest.map((educator) => (
            <div key={educator.id} className="flex items-center justify-between border-b border-brand-border/60 py-2">
              <p>{educator.display_name}</p>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone[educator.status]}>{statusLabel[educator.status]}</Badge>
                {educator.status === "rejected" && (
                  <form action={setEducatorStatus.bind(null, educator.id, "approved")}>
                    <Button type="submit" size="sm" variant="secondary">
                      Aprobar igual
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
