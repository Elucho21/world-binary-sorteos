"use client";

import { useActionState } from "react";
import { setSorteoStatus, type FormState } from "@/app/(educator)/dashboard/sorteos/actions";
import { Button } from "@/components/ui/button";
import type { SorteoStatus } from "@/types/database.types";

const statusLabel: Record<SorteoStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  ended: "Finalizado",
};

const statuses: SorteoStatus[] = ["draft", "active", "paused", "ended"];

export function SorteoStatusButtons({ sorteoId, currentStatus }: { sorteoId: string; currentStatus: SorteoStatus }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => setSorteoStatus(sorteoId, formData.get("status") as SorteoStatus),
    undefined
  );

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <Button
            key={status}
            type="submit"
            name="status"
            value={status}
            size="sm"
            disabled={pending}
            variant={currentStatus === status ? "primary" : "secondary"}
          >
            {statusLabel[status]}
          </Button>
        ))}
      </form>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
    </div>
  );
}
