import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { LeadsTable } from "@/components/admin/leads-table";

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
      <div>
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-brand-muted">{participants.length} participantes en total.</p>
      </div>

      <LeadsTable rows={csvRows} />
    </div>
  );
}
