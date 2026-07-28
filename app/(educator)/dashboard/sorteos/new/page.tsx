"use client";

import { useActionState } from "react";
import { createSorteo, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NewSorteoPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createSorteo, undefined);

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo sorteo</CardTitle>
          <CardDescription>
            Después de crearlo vas a poder cargar las cuentas bono como premio y compartir el
            link para que la gente se registre.
          </CardDescription>
        </CardHeader>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del sorteo</Label>
            <Input id="name" name="name" required placeholder="Ruleta de fin de mes" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1">
              <Label htmlFor="slug" className="mb-0">
                URL pública (slug)
              </Label>
              <InfoTooltip label="Ayuda sobre la URL pública">
                Es la parte final del link que vas a compartir
                (worldbinary-sorteos.com/s/tu-slug). Usá solo minúsculas, números y guiones, sin
                espacios ni tildes.
              </InfoTooltip>
            </div>
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
            <DateTimeLocalInput
              id="startsAt"
              name="startsAt"
              label="Inicio (opcional)"
              info={
                <InfoTooltip label="Ayuda sobre Inicio y Fin">
                  Si dejás estos campos vacíos, el sorteo no se abre ni se cierra solo por fecha —
                  vos lo activás y lo sorteás manualmente cuando quieras. Si completás una fecha,
                  se usa el huso horario de tu navegador.
                </InfoTooltip>
              }
            />
            <DateTimeLocalInput id="endsAt" name="endsAt" label="Fin (opcional)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 flex items-center gap-1">
                <Label htmlFor="maxEntries" className="mb-0">
                  Máximo de participantes (opcional)
                </Label>
                <InfoTooltip label="Ayuda sobre Máximo de participantes">
                  Si lo dejás vacío, no hay límite de inscriptos. Al llegar a este número, el
                  formulario público deja de aceptar nuevos registros.
                </InfoTooltip>
              </div>
              <Input id="maxEntries" name="maxEntries" type="number" min={1} />
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
              <Input id="winnersCount" name="winnersCount" type="number" min={1} defaultValue={1} required />
            </div>
          </div>
          {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creando..." : "Crear sorteo"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
