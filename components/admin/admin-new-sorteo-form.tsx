"use client";

import { useActionState } from "react";
import { adminCreateSorteo, type FormState } from "@/app/(admin)/admin/sorteos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";

interface EducatorOption {
  id: string;
  label: string;
}

export function AdminNewSorteoForm({ educators }: { educators: EducatorOption[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(adminCreateSorteo, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="educatorId">Educador</Label>
        <select
          id="educatorId"
          name="educatorId"
          required
          className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text"
        >
          <option value="">Elegí un educador...</option>
          {educators.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="name">Nombre del sorteo</Label>
        <Input id="name" name="name" required placeholder="Ruleta de fin de mes" />
      </div>
      <div>
        <Label htmlFor="slug">URL pública (slug)</Label>
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <span>/s/</span>
          <Input id="slug" name="slug" required placeholder="ruleta-fin-de-mes" pattern="[a-z0-9-]+" />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DateTimeLocalInput id="startsAt" name="startsAt" label="Inicio (opcional)" />
        <DateTimeLocalInput id="endsAt" name="endsAt" label="Fin (opcional)" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="maxEntries">Máximo de participantes (opcional)</Label>
          <Input id="maxEntries" name="maxEntries" type="number" min={1} />
        </div>
        <div>
          <Label htmlFor="winnersCount">Cantidad de ganadores</Label>
          <Input id="winnersCount" name="winnersCount" type="number" min={1} defaultValue={1} required />
        </div>
      </div>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando..." : "Crear sorteo"}
      </Button>
    </form>
  );
}
