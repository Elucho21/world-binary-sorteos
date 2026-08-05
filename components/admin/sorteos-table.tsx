"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/dashboard/delete-button";
import { adminDeleteSorteo, adminBulkDeleteSorteos } from "@/app/(admin)/admin/sorteos/actions";
import type { SorteoStatus } from "@/types/database.types";

export interface SorteoTableRow {
  id: string;
  name: string;
  slug: string;
  status: SorteoStatus;
  educador: string;
  registrados: number;
  premiosLabel: string;
  horarioLabel: string;
}

const statusTone: Record<SorteoStatus, "neutral" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  ended: "danger",
};

const statusLabel: Record<SorteoStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  ended: "Finalizado",
};

type FilterTab = "all" | SorteoStatus;

export function SorteosTable({ sorteos }: { sorteos: SorteoTableRow[] }) {
  const [tab, setTab] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const base: Record<FilterTab, number> = { all: sorteos.length, draft: 0, active: 0, paused: 0, ended: 0 };
    for (const s of sorteos) base[s.status] += 1;
    return base;
  }, [sorteos]);

  const filtered = useMemo(
    () => (tab === "all" ? sorteos : sorteos.filter((s) => s.status === tab)),
    [sorteos, tab]
  );

  const filteredIds = useMemo(() => filtered.map((s) => s.id), [filtered]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      }
      return new Set([...prev, ...filteredIds]);
    });
  }

  async function handleBulkDelete() {
    await adminBulkDeleteSorteos(Array.from(selected));
    setSelected(new Set());
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: `Todos (${counts.all})` },
    { id: "active", label: `Activos (${counts.active})` },
    { id: "paused", label: `Pausados (${counts.paused})` },
    { id: "draft", label: `Borradores (${counts.draft})` },
    { id: "ended", label: `Finalizados (${counts.ended})` },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tab === t.id ? "primary" : "secondary"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        {selected.size > 0 && (
          <ConfirmButton
            action={handleBulkDelete}
            confirmText={`¿Borrar ${selected.size} sorteo${selected.size === 1 ? "" : "s"}? Esta acción no se puede deshacer.`}
          >
            Borrar seleccionados ({selected.size})
          </ConfirmButton>
        )}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="Seleccionar todos" />
              </th>
              <th className="px-4 py-3">Sorteo</th>
              <th className="px-4 py-3">Educador</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Registrados</th>
              <th className="px-4 py-3">Premios</th>
              <th className="px-4 py-3">Horario</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((sorteo) => (
              <tr key={sorteo.id} className="border-b border-brand-border/60 hover:bg-brand-surface-raised">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(sorteo.id)}
                    onChange={() => toggleOne(sorteo.id)}
                    aria-label={`Seleccionar ${sorteo.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/sorteos/${sorteo.id}`} className="text-brand-primary hover:underline">
                    {sorteo.name}
                  </Link>
                  <p className="font-mono text-xs text-brand-muted">/s/{sorteo.slug}</p>
                </td>
                <td className="px-4 py-3">{sorteo.educador}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[sorteo.status]}>{statusLabel[sorteo.status]}</Badge>
                </td>
                <td className="px-4 py-3">{sorteo.registrados}</td>
                <td className="px-4 py-3">{sorteo.premiosLabel}</td>
                <td className="px-4 py-3 text-xs">{sorteo.horarioLabel}</td>
                <td className="px-4 py-3">
                  <ConfirmButton
                    action={adminDeleteSorteo.bind(null, sorteo.id)}
                    confirmText={`¿Borrar el sorteo "${sorteo.name}"? Esta acción no se puede deshacer.`}
                  >
                    Borrar
                  </ConfirmButton>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-brand-muted">
                  {sorteos.length === 0 ? "Todavía no hay sorteos." : "No hay sorteos con ese estado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
