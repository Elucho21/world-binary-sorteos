"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";
import { markCodeRedeemed } from "@/app/(educator)/dashboard/sorteos/[id]/participants/actions";

export interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  position: number | null;
  prize_code: { id: string; code: string; status: string; redeemed_at: string | null } | null;
}

export function ParticipantsTable({ sorteoId, participants }: { sorteoId: string; participants: ParticipantRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }, [participants, query]);

  const csvRows = filtered.map((p) => ({
    nombre: p.name,
    email: p.email,
    ganador: p.position ? `#${p.position}` : "",
    codigo: p.prize_code?.code ?? "",
    estado_codigo: p.prize_code?.status ?? "",
    fecha_registro: p.created_at,
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
              <th className="px-4 py-3">Ganador</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-brand-border/60">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.email}</td>
                <td className="px-4 py-3">
                  {p.position ? <Badge tone="success">#{p.position}</Badge> : <span className="text-brand-muted">—</span>}
                </td>
                <td className="px-4 py-3 font-mono">{p.prize_code?.code ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.prize_code ? (
                    <Badge tone={p.prize_code.status === "redeemed" ? "success" : "warning"}>
                      {p.prize_code.status === "redeemed" ? "Canjeado" : "Emitido"}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">—</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.prize_code && p.prize_code.status !== "redeemed" && (
                    <form action={markCodeRedeemed.bind(null, sorteoId, p.prize_code.id)}>
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
                  {participants.length === 0 ? "Todavía no hay participantes." : "Sin resultados para esa búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
