"use client";

import { useActionState } from "react";
import { updateSorteo, type FormState } from "@/app/(educator)/dashboard/sorteos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import type { Sorteo } from "@/types/database.types";

export function SorteoEditForm({ sorteo }: { sorteo: Sorteo }) {
  const action = updateSorteo.bind(null, sorteo.id);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre del sorteo</Label>
        <Input id="name" name="name" defaultValue={sorteo.name} required />
      </div>
      <div>
        <Label htmlFor="slug">URL pública (slug)</Label>
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <span>/s/</span>
          <Input id="slug" name="slug" defaultValue={sorteo.slug} required pattern="[a-z0-9-]+" />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={sorteo.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DateTimeLocalInput id="startsAt" name="startsAt" label="Inicio" defaultValueIso={sorteo.starts_at} />
        <DateTimeLocalInput id="endsAt" name="endsAt" label="Fin" defaultValueIso={sorteo.ends_at} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="maxEntries">Máximo de participantes</Label>
          <Input
            id="maxEntries"
            name="maxEntries"
            type="number"
            min={1}
            defaultValue={sorteo.max_entries ?? undefined}
          />
        </div>
        <div>
          <Label htmlFor="winnersCount">Cantidad de ganadores</Label>
          <Input id="winnersCount" name="winnersCount" type="number" min={1} defaultValue={sorteo.winners_count} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
