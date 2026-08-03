import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { LeadsTable } from "@/components/admin/leads-table";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 50;
const EXPORT_CAP = 5000;

interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  sorteos: { name: string } | { name: string }[] | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

function toLeadRow(p: ParticipantRow) {
  const sorteo = Array.isArray(p.sorteos) ? p.sorteos[0] : p.sorteos;
  const educator = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
  return {
    nombre: p.name,
    email: p.email,
    sorteo: sorteo?.name ?? "",
    educador: educator?.display_name ?? "",
    fecha: p.created_at,
  };
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireSuperAdmin();
  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let listQuery = supabase
    .from("participants")
    .select("id, name, email, created_at, sorteos(name), profiles(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  let exportQuery = supabase
    .from("participants")
    .select("id, name, email, created_at, sorteos(name), profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(EXPORT_CAP);

  if (query) {
    const filter = `name.ilike.%${query}%,email.ilike.%${query}%`;
    listQuery = listQuery.or(filter);
    exportQuery = exportQuery.or(filter);
  }

  const [{ data, count }, { data: exportData }] = await Promise.all([listQuery, exportQuery]);

  const participants = (data ?? []) as unknown as ParticipantRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = participants.map(toLeadRow);
  const exportRows = ((exportData ?? []) as unknown as ParticipantRow[]).map(toLeadRow);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-brand-muted">{total} participantes en total.</p>
      </div>

      <form className="max-w-xs">
        <Input name="q" defaultValue={query} placeholder="Buscar por nombre o email..." />
      </form>

      <LeadsTable rows={rows} exportRows={exportRows} />

      <Pagination page={page} totalPages={totalPages} buildHref={(p) => `?q=${encodeURIComponent(query)}&page=${p}`} />
    </div>
  );
}
