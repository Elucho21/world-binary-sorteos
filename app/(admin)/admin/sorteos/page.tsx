import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SorteoStatus } from "@/types/database.types";

interface SorteoRow {
  id: string;
  name: string;
  slug: string;
  status: SorteoStatus;
  created_at: string;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

const statusTone: Record<SorteoStatus, "neutral" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  ended: "danger",
};

export default async function AdminSorteosPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("sorteos")
    .select("id, name, slug, status, created_at, profiles(display_name)")
    .order("created_at", { ascending: false });

  const sorteos = (data ?? []) as unknown as SorteoRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Todos los sorteos</h1>
        <p className="text-sm text-brand-muted">Vista global de todos los educadores.</p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Sorteo</th>
              <th className="px-4 py-3">Educador</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">URL</th>
            </tr>
          </thead>
          <tbody>
            {sorteos.map((sorteo) => {
              const profile = Array.isArray(sorteo.profiles) ? sorteo.profiles[0] : sorteo.profiles;
              return (
                <tr key={sorteo.id} className="border-b border-brand-border/60">
                  <td className="px-4 py-3">{sorteo.name}</td>
                  <td className="px-4 py-3">{profile?.display_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[sorteo.status]}>{sorteo.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">/s/{sorteo.slug}</td>
                </tr>
              );
            })}
            {sorteos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-brand-muted">
                  Todavía no hay sorteos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
