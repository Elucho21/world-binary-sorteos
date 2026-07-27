"use client";

import { useState, useTransition } from "react";
import { setEducatorStatus, bulkSetEducatorStatus } from "@/app/(admin)/admin/educators/actions";
import { Button } from "@/components/ui/button";

interface PendingEducator {
  id: string;
  display_name: string | null;
  brand_name: string | null;
}

export function PendingEducatorsList({ educators }: { educators: PendingEducator[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === educators.length ? new Set() : new Set(educators.map((e) => e.id))));
  }

  function bulkAction(status: "approved" | "rejected") {
    startTransition(async () => {
      await bulkSetEducatorStatus(Array.from(selected), status);
      setSelected(new Set());
    });
  }

  if (educators.length === 0) {
    return <p className="text-sm text-brand-muted">No hay cuentas pendientes.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-brand-muted">
          <input
            type="checkbox"
            className="accent-brand-primary"
            checked={selected.size === educators.length}
            onChange={toggleAll}
          />
          Seleccionar todos
        </label>
        {selected.size > 0 && (
          <>
            <Button type="button" size="sm" disabled={isPending} onClick={() => bulkAction("approved")}>
              Aprobar seleccionados ({selected.size})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={isPending}
              onClick={() => bulkAction("rejected")}
            >
              Rechazar seleccionados
            </Button>
          </>
        )}
      </div>
      {educators.map((educator) => (
        <div
          key={educator.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border p-3"
        >
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="accent-brand-primary"
              checked={selected.has(educator.id)}
              onChange={() => toggle(educator.id)}
            />
            <div>
              <p className="font-medium">{educator.display_name}</p>
              {educator.brand_name && <p className="text-xs text-brand-muted">{educator.brand_name}</p>}
            </div>
          </label>
          <div className="flex gap-2">
            <form action={setEducatorStatus.bind(null, educator.id, "approved")}>
              <Button type="submit" size="sm">
                Aprobar
              </Button>
            </form>
            <form action={setEducatorStatus.bind(null, educator.id, "rejected")}>
              <Button type="submit" size="sm" variant="danger">
                Rechazar
              </Button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
