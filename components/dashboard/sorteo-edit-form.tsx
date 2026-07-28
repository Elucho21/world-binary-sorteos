"use client";

import { useActionState } from "react";
import { updateSorteo, type FormState } from "@/app/(educator)/dashboard/sorteos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import { InfoTooltip } from "@/components/ui/info-tooltip";
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
        <div className="mb-1.5 flex items-center gap-1">
          <Label htmlFor="slug" className="mb-0">
            URL pública (slug)
          </Label>
          <InfoTooltip label="Ayuda sobre la URL pública">
            Es la parte final del link que vas a compartir (worldbinary-sorteos.com/s/tu-slug).
            Usá solo minúsculas, números y guiones, sin espacios ni tildes.
          </InfoTooltip>
        </div>
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
        <DateTimeLocalInput
          id="startsAt"
          name="startsAt"
          label="Inicio"
          defaultValueIso={sorteo.starts_at}
          info={
            <InfoTooltip label="Ayuda sobre Inicio y Fin">
              Si dejás estos campos vacíos, el sorteo no se abre ni se cierra solo por fecha — vos
              lo activás y lo sorteás manualmente cuando quieras. Si completás una fecha, se usa
              el huso horario de tu navegador.
            </InfoTooltip>
          }
        />
        <DateTimeLocalInput id="endsAt" name="endsAt" label="Fin" defaultValueIso={sorteo.ends_at} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-1">
            <Label htmlFor="maxEntries" className="mb-0">
              Máximo de participantes
            </Label>
            <InfoTooltip label="Ayuda sobre Máximo de participantes">
              Si lo dejás vacío, no hay límite de inscriptos. Al llegar a este número, el
              formulario público deja de aceptar nuevos registros.
            </InfoTooltip>
          </div>
          <Input
            id="maxEntries"
            name="maxEntries"
            type="number"
            min={1}
            defaultValue={sorteo.max_entries ?? undefined}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1">
            <Label htmlFor="winnersCount" className="mb-0">
              Cantidad de ganadores
            </Label>
            <InfoTooltip label="Ayuda sobre Cantidad de ganadores">
              Cuántas cuentas bono se van a sortear entre los inscriptos. Necesitás cargar al
              menos esta cantidad de códigos disponibles en Premios antes de poder sortear.
            </InfoTooltip>
          </div>
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
