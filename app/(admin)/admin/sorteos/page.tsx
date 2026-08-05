import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SorteosTable, type SorteoTableRow } from "@/components/admin/sorteos-table";
import type { SorteoStatus } from "@/types/database.types";

interface SorteoRow {
  id: string;
  name: string;
  slug: string;
  status: SorteoStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminSorteosPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const [{ data: sorteosData }, { data: participantRows }, { data: codeRows }] = await Promise.all([
    supabase
      .from("sorteos")
      .select("id, name, slug, status, starts_at, ends_at, created_at, profiles(display_name)")
      .order("created_at", { ascending: false }),
    supabase.from("participants").select("sorteo_id"),
    supabase.from("prize_codes").select("sorteo_id, status"),
  ]);

  const sorteos = (sorteosData ?? []) as unknown as SorteoRow[];

  const participantCounts = new Map<string, number>();
  for (const row of participantRows ?? []) {
    participantCounts.set(row.sorteo_id, (participantCounts.get(row.sorteo_id) ?? 0) + 1);
  }

  const codeCounts = new Map<string, { available: number; issued: number }>();
  for (const code of codeRows ?? []) {
    if (!code.sorteo_id) continue;
    const current = codeCounts.get(code.sorteo_id) ?? { available: 0, issued: 0 };
    if (code.status === "available") current.available += 1;
    if (code.status === "issued" || code.status === "redeemed") current.issued += 1;
    codeCounts.set(code.sorteo_id, current);
  }

  const rows: SorteoTableRow[] = sorteos.map((sorteo) => {
    const profile = Array.isArray(sorteo.profiles) ? sorteo.profiles[0] : sorteo.profiles;
    const codes = codeCounts.get(sorteo.id) ?? { available: 0, issued: 0 };
    return {
      id: sorteo.id,
      name: sorteo.name,
      slug: sorteo.slug,
      status: sorteo.status,
      educador: profile?.display_name ?? "—",
      registrados: participantCounts.get(sorteo.id) ?? 0,
      premiosLabel:
        codes.available === 0 && codes.issued === 0 ? "—" : `${codes.available} disp. / ${codes.issued} emit.`,
      horarioLabel: `${formatDate(sorteo.starts_at)} — ${formatDate(sorteo.ends_at)}`,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Todos los sorteos</h1>
          <p className="text-sm text-brand-muted">Vista global de todos los educadores.</p>
        </div>
        <Link href="/admin/sorteos/new">
          <Button>Nuevo sorteo</Button>
        </Link>
      </div>

      <SorteosTable sorteos={rows} />
    </div>
  );
}
