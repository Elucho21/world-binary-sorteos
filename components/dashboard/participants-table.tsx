"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";
import { markCodeRedeemed } from "@/app/(educator)/dashboard/sorteos/[id]/participants/actions";

interface EntryRow {
  id: string;
  spun_at: string;
  participants: { name: string; email: string } | null;
  wheel_segments: { label: string } | null;
  prize_codes: { id: string; code: string; status: string; redeemed_at: string | null } | null;
}

export function ParticipantsTable({ sorteoId, entries }: { sorteoId: string; entries: EntryRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.participants?.name?.toLowerCase().includes(q) || e.participants?.email?.toLowerCase().includes(q)
    );
  }, [entries, query]);

  const csvRows = filtered.map((e) => ({
    nombre: e.participants?.name ?? "",
    email: e.participants?.email ?? "",
    premio: e.wheel_segments?.label ?? "",
    codigo: e.prize_codes?.code ?? "",
    estado_codigo: e.prize_codes?.status ?? "",
    fecha: e.spun_at,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="max-w-xs"
        />
        <ExportCsvButton filename="participantes.csv" rows={csvRows} />
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
            {filtered.map((entry) => (
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
                    <form action={markCodeRedeemed.bind(null, sorteoId, entry.prize_codes.id)}>
                      <Button type="submit" size="sm" variant="secondary">
                        Marcar canjeado
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-brand-muted">
                  {entries.length === 0 ? "Todavía no hay participantes." : "Sin resultados para esa búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
