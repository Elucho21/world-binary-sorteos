"use client";

import { useActionState } from "react";
import { createBanner, type FormState } from "@/app/(admin)/admin/banners/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function BannerForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createBanner, undefined);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required placeholder="World Binary TV — nuevo episodio" />
      </div>
      <div>
        <Label htmlFor="placement">Dónde se muestra</Label>
        <select
          id="placement"
          name="placement"
          required
          className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text"
        >
          <option value="public_sorteo_page">Página pública de sorteo</option>
          <option value="participant_dashboard">Mis Premios (participantes)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="imageUrl">URL de la imagen</Label>
        <Input id="imageUrl" name="imageUrl" required placeholder="https://..." />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="linkUrl">URL de destino (opcional)</Label>
        <Input id="linkUrl" name="linkUrl" placeholder="https://worldbinary.pro/tv" />
      </div>
      <div>
        <Label htmlFor="startsAt">Desde (opcional)</Label>
        <Input id="startsAt" name="startsAt" type="datetime-local" />
      </div>
      <div>
        <Label htmlFor="endsAt">Hasta (opcional)</Label>
        <Input id="endsAt" name="endsAt" type="datetime-local" />
      </div>
      {state?.error && <p className="text-sm text-brand-danger sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando..." : "Crear banner"}
        </Button>
      </div>
    </form>
  );
}
