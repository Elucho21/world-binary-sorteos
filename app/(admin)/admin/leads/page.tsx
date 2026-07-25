import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";

interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  sorteos: { name: string } | { name: string }[] | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

export default async function AdminLeadsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("participants")
    .select("id, name, email, created_at, sorteos(name), profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(2000);

  const participants = (data ?? []) as unknown as ParticipantRow[];

  const csvRows = participants.map((p) => {
    const sorteo = Array.isArray(p.sorteos) ? p.sorteos[0] : p.sorteos;
    const educator = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return {
      nombre: p.name,
      email: p.email,
      sorteo: sorteo?.name ?? "",
      educador: educator?.display_name ?? "",
      fecha: p.created_at,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-brand-muted">{participants.length} participantes en total.</p>
        </div>
        <ExportCsvButton filename="leads-world-binary.csv" rows={csvRows} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Sorteo</th>
              <th className="px-4 py-3">Educador</th>
            </tr>
          </thead>
          <tbody>
            {csvRows.map((row, i) => (
              <tr key={i} className="border-b border-brand-border/60">
                <td className="px-4 py-3">{row.nombre}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.sorteo}</td>
                <td className="px-4 py-3">{row.educador}</td>
              </tr>
            ))}
            {csvRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-brand-muted">
                  Todavía no hay leads.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
