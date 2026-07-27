import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const statusTone: Record<SorteoStatus, "neutral" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  ended: "danger",
};

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

  const [{ data: sorteosData }, { data: participantRows }, { data: segmentRows }, { data: codeRows }] =
    await Promise.all([
      supabase
        .from("sorteos")
        .select("id, name, slug, status, starts_at, ends_at, created_at, profiles(display_name)")
        .order("created_at", { ascending: false }),
      supabase.from("participants").select("sorteo_id"),
      supabase.from("wheel_segments").select("id, sorteo_id, is_consolation"),
      supabase.from("prize_codes").select("segment_id, status"),
    ]);

  const sorteos = (sorteosData ?? []) as unknown as SorteoRow[];

  const participantCounts = new Map<string, number>();
  for (const row of participantRows ?? []) {
    participantCounts.set(row.sorteo_id, (participantCounts.get(row.sorteo_id) ?? 0) + 1);
  }

  const segmentToSorteo = new Map<string, string>();
  const prizeSegmentCount = new Map<string, number>();
  for (const seg of segmentRows ?? []) {
    segmentToSorteo.set(seg.id, seg.sorteo_id);
    if (!seg.is_consolation) {
      prizeSegmentCount.set(seg.sorteo_id, (prizeSegmentCount.get(seg.sorteo_id) ?? 0) + 1);
    }
  }

  const codeCounts = new Map<string, { available: number; issued: number }>();
  for (const code of codeRows ?? []) {
    if (!code.segment_id) continue;
    const sorteoId = segmentToSorteo.get(code.segment_id);
    if (!sorteoId) continue;
    const current = codeCounts.get(sorteoId) ?? { available: 0, issued: 0 };
    if (code.status === "available") current.available += 1;
    if (code.status === "issued" || code.status === "redeemed") current.issued += 1;
    codeCounts.set(sorteoId, current);
  }

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

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Sorteo</th>
              <th className="px-4 py-3">Educador</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Registrados</th>
              <th className="px-4 py-3">Premios</th>
              <th className="px-4 py-3">Horario</th>
            </tr>
          </thead>
          <tbody>
            {sorteos.map((sorteo) => {
              const profile = Array.isArray(sorteo.profiles) ? sorteo.profiles[0] : sorteo.profiles;
              const codes = codeCounts.get(sorteo.id) ?? { available: 0, issued: 0 };
              const prizeSegments = prizeSegmentCount.get(sorteo.id) ?? 0;
              return (
                <tr key={sorteo.id} className="border-b border-brand-border/60 hover:bg-brand-surface-raised">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/sorteos/${sorteo.id}`} className="text-brand-primary hover:underline">
                      {sorteo.name}
                    </Link>
                    <p className="font-mono text-xs text-brand-muted">/s/{sorteo.slug}</p>
                  </td>
                  <td className="px-4 py-3">{profile?.display_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[sorteo.status]}>{sorteo.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{participantCounts.get(sorteo.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    {prizeSegments === 0
                      ? "—"
                      : `${prizeSegments} tipo${prizeSegments === 1 ? "" : "s"} · ${codes.available} disp. / ${codes.issued} emit.`}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatDate(sorteo.starts_at)} — {formatDate(sorteo.ends_at)}
                  </td>
                </tr>
              );
            })}
            {sorteos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-brand-muted">
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
