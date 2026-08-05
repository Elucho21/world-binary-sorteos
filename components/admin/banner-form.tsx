"use client";

import { useActionState } from "react";
import { createBanner, updateBanner, type FormState } from "@/app/(admin)/admin/banners/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import type { Banner } from "@/types/database.types";

export function BannerForm({ banner, onCancel }: { banner?: Banner; onCancel?: () => void }) {
  const action = banner ? updateBanner.bind(null, banner.id) : createBanner;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={banner?.title}
          placeholder="World Binary TV — nuevo episodio"
        />
      </div>
      <div>
        <Label htmlFor="placement">Dónde se muestra</Label>
        <select
          id="placement"
          name="placement"
          required
          defaultValue={banner?.placement ?? "public_sorteo_page"}
          className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text"
        >
          <option value="public_sorteo_page">Página pública de sorteo</option>
          <option value="participant_dashboard">Mis Premios (participantes)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="imageUrl">URL de la imagen</Label>
        <Input id="imageUrl" name="imageUrl" required defaultValue={banner?.image_url} placeholder="https://..." />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="linkUrl">URL de destino (opcional)</Label>
        <Input
          id="linkUrl"
          name="linkUrl"
          defaultValue={banner?.link_url ?? ""}
          placeholder="https://worldbinary.pro/tv"
        />
      </div>
      <DateTimeLocalInput id="startsAt" name="startsAt" label="Desde (opcional)" defaultValueIso={banner?.starts_at} />
      <DateTimeLocalInput id="endsAt" name="endsAt" label="Hasta (opcional)" defaultValueIso={banner?.ends_at} />
      {state?.error && <p className="text-sm text-brand-danger sm:col-span-2">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : banner ? "Guardar cambios" : "Crear banner"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
