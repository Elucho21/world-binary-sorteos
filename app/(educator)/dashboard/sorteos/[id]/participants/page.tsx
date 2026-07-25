import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";
import { markCodeRedeemed } from "./actions";

interface EntryRow {
  id: string;
  spun_at: string;
  participants: { name: string; email: string } | null;
  wheel_segments: { label: string } | null;
  prize_codes: { id: string; code: string; status: string; redeemed_at: string | null } | null;
}

export default async function ParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name").eq("id", id).single();
  if (!sorteo) notFound();

  const { data } = await supabase
    .from("entries")
    .select(
      "id, spun_at, participants(name, email), wheel_segments(label), prize_codes(id, code, status, redeemed_at)"
    )
    .eq("sorteo_id", id)
    .order("spun_at", { ascending: false });

  const entries = (data ?? []) as unknown as EntryRow[];

  const csvRows = entries.map((e) => ({
    nombre: e.participants?.name ?? "",
    email: e.participants?.email ?? "",
    premio: e.wheel_segments?.label ?? "",
    codigo: e.prize_codes?.code ?? "",
    estado_codigo: e.prize_codes?.status ?? "",
    fecha: e.spun_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Participantes — {sorteo.name}</h1>
          <p className="text-sm text-brand-muted">{entries.length} giros registrados.</p>
        </div>
        <ExportCsvButton filename={`participantes-${sorteo.name}.csv`} rows={csvRows} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Premio</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-brand-border/60">
                <td className="px-4 py-3">{entry.participants?.name}</td>
                <td className="px-4 py-3">{entry.participants?.email}</td>
                <td className="px-4 py-3">{entry.wheel_segments?.label}</td>
                <td className="px-4 py-3 font-mono">{entry.prize_codes?.code ?? "—"}</td>
                <td className="px-4 py-3">
                  {entry.prize_codes ? (
                    <Badge tone={entry.prize_codes.status === "redeemed" ? "success" : "warning"}>
                      {entry.prize_codes.status === "redeemed" ? "Canjeado" : "Emitido"}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Sin premio</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {entry.prize_codes && entry.prize_codes.status !== "redeemed" && (
                    <form action={markCodeRedeemed.bind(null, id, entry.prize_codes.id)}>
                      <Button type="submit" size="sm" variant="secondary">
                        Marcar canjeado
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-brand-muted">
                  Todavía no hay participantes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
