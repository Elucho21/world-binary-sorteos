"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";
import {
  markCodeRedeemed,
  bulkMarkCodeRedeemed,
  updateParticipantEmail,
} from "@/app/(educator)/dashboard/sorteos/[id]/participants/actions";

export interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  position: number | null;
  prize_code: { id: string; code: string; status: string; redeemed_at: string | null } | null;
}

function EditableEmail({ sorteoId, participant }: { sorteoId: string; participant: ParticipantRow }) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-left hover:underline"
        title="Corregir email"
      >
        {participant.email}
      </button>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateParticipantEmail(sorteoId, participant.id, formData);
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar el email.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <Input
        name="email"
        type="email"
        defaultValue={participant.email}
        className="h-8 w-48 py-1 text-sm"
        required
        autoFocus
      />
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        Guardar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
        Cancelar
      </Button>
      {error && <span className="text-xs text-brand-danger">{error}</span>}
    </form>
  );
}

// `participants` is already server-side searched + paginated (current page
// only) — see app/(educator)/dashboard/sorteos/[id]/participants/page.tsx.
// `exportRows` is every row matching the current search, for the CSV.
export function ParticipantsTable({
  sorteoId,
  participants,
  exportRows,
  sorteoDrawn,
}: {
  sorteoId: string;
  participants: ParticipantRow[];
  exportRows: ParticipantRow[];
  sorteoDrawn: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const redeemableSelected = useMemo(
    () =>
      participants
        .filter((p) => selected.has(p.id) && p.prize_code && p.prize_code.status !== "redeemed")
        .map((p) => p.prize_code!.id),
    [participants, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === participants.length ? new Set() : new Set(participants.map((p) => p.id))));
  }

  function bulkRedeem() {
    startTransition(async () => {
      await bulkMarkCodeRedeemed(sorteoId, redeemableSelected);
      setSelected(new Set());
    });
  }

  const csvRows = exportRows.map((p) => ({
    nombre: p.name,
    email: p.email,
    ganador: p.position ? `#${p.position}` : "",
    codigo: p.prize_code?.code ?? "",
    estado_codigo: p.prize_code?.status ?? "",
    fecha_registro: p.created_at,
  }));

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {redeemableSelected.length > 0 && (
          <Button type="button" size="sm" disabled={isPending} onClick={bulkRedeem}>
            Marcar canjeados ({redeemableSelected.length})
          </Button>
        )}
        <ExportCsvButton filename="participantes.csv" rows={csvRows} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  className="accent-brand-primary"
                  checked={participants.length > 0 && selected.size === participants.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Ganador</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-b border-brand-border/60">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="accent-brand-primary"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                </td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">
                  {sorteoDrawn ? p.email : <EditableEmail sorteoId={sorteoId} participant={p} />}
                </td>
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
            {participants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-brand-muted">
                  {exportRows.length === 0 ? "Todavía no hay participantes." : "Sin resultados para esa búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
