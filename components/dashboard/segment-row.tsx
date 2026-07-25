"use client";

import { useActionState } from "react";
import {
  updateSegment,
  toggleSegmentActive,
  deleteSegment,
  type FormState,
} from "@/app/(educator)/dashboard/sorteos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { WheelSegment } from "@/types/database.types";

export function SegmentRow({ sorteoId, segment }: { sorteoId: string; segment: WheelSegment }) {
  const action = updateSegment.bind(null, sorteoId, segment.id);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);

  return (
    <div className="rounded-lg border border-brand-border p-4">
      <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end">
        <div className="col-span-2 sm:col-span-2">
          <Label htmlFor={`label-${segment.id}`}>Etiqueta</Label>
          <Input id={`label-${segment.id}`} name="label" defaultValue={segment.label} required />
        </div>
        <div>
          <Label htmlFor={`color-${segment.id}`}>Color</Label>
          <Input
            id={`color-${segment.id}`}
            name="color"
            type="color"
            defaultValue={segment.color}
            className="h-9 p-1"
          />
        </div>
        <div>
          <Label htmlFor={`weight-${segment.id}`}>Peso</Label>
          <Input
            id={`weight-${segment.id}`}
            name="weight"
            type="number"
            step="0.1"
            min={0}
            defaultValue={segment.weight}
            required
          />
        </div>
        <div>
          <Label htmlFor={`prizeTier-${segment.id}`}>Nivel de premio</Label>
          <Input id={`prizeTier-${segment.id}`} name="prizeTier" defaultValue={segment.prize_tier ?? ""} />
        </div>
        <div className="col-span-2 flex items-center gap-2 sm:col-span-5">
          <label className="flex items-center gap-2 text-sm text-brand-muted">
            <input
              type="checkbox"
              name="isConsolation"
              defaultChecked={segment.is_consolation}
              className="accent-brand-primary"
            />
            Sin premio / consuelo (nunca se agota)
          </label>
          {segment.is_consolation ? null : (
            <Badge tone="accent">Necesita códigos cargados</Badge>
          )}
        </div>
        {state?.error && <p className="col-span-full text-sm text-brand-danger">{state.error}</p>}
        <div className="col-span-full flex flex-wrap gap-2 pt-1">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => toggleSegmentActive(sorteoId, segment.id, !segment.is_active)}
          >
            {segment.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm("¿Borrar este segmento?")) deleteSegment(sorteoId, segment.id);
            }}
          >
            Borrar
          </Button>
        </div>
      </form>
    </div>
  );
}
