"use client";

import { useActionState } from "react";
import { createSorteo, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
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
            <div>
              <Label htmlFor="startsAt">Inicio (opcional)</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" />
            </div>
            <div>
              <Label htmlFor="endsAt">Fin (opcional)</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" />
            </div>
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
      </Card>
    </div>
  );
}
