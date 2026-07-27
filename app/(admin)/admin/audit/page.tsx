import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

interface AuditRow {
  id: string;
  action: string;
  target_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

export default async function AdminAuditPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_log")
    .select("id, action, target_id, created_at, metadata, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as AuditRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-sm text-brand-muted">
          Últimos 200 cambios de rol/estado sobre educadores y promociones a super admin.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Cuándo</th>
              <th className="px-4 py-3">Quién</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Sobre</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
              return (
                <tr key={row.id} className="border-b border-brand-border/60">
                  <td className="px-4 py-3 text-xs">{new Date(row.created_at).toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3">{actor?.display_name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.target_id ?? "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-brand-muted">
                  Todavía no hay eventos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
