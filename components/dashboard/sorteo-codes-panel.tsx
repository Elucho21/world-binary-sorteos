"use client";

import { useActionState } from "react";
import {
  assignFromPool,
  unassignCode,
  uploadManualCodesToSorteo,
  type FormState,
} from "@/app/(educator)/dashboard/codes/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SorteoCode {
  id: string;
  code: string;
  status: string;
  tier: string | null;
}

export function SorteoCodesPanel({
  sorteoId,
  codes,
  poolAvailable,
}: {
  sorteoId: string;
  codes: SorteoCode[];
  poolAvailable: number;
}) {
  const assignAction = assignFromPool.bind(null, sorteoId);
  const [assignState, assignFormAction, assignPending] = useActionState<FormState, FormData>(
    assignAction,
    undefined
  );

  const uploadAction = uploadManualCodesToSorteo.bind(null, sorteoId);
  const [uploadState, uploadFormAction, uploadPending] = useActionState<FormState, FormData>(
    uploadAction,
    undefined
  );

  const availableCount = codes.filter((c) => c.status === "available").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <form action={assignFormAction} className="space-y-2">
          <Label htmlFor="qty">Asignar desde tu pool ({poolAvailable} sin asignar)</Label>
          <div className="flex gap-2">
            <Input id="qty" name="quantity" type="number" min={1} max={poolAvailable} defaultValue={Math.min(1, poolAvailable)} />
            <Button type="submit" size="sm" disabled={assignPending || poolAvailable === 0}>
              Asignar
            </Button>
          </div>
          {assignState?.error && <p className="text-sm text-brand-danger">{assignState.error}</p>}
          {assignState?.success && <p className="text-sm text-brand-success">{assignState.success}</p>}
        </form>

        <form action={uploadFormAction} className="space-y-2">
          <Label htmlFor="codes">O cargar directo para este sorteo</Label>
          <Textarea id="codes" name="codes" rows={2} placeholder={"WB-BONUS-0001\nWB-BONUS-0002"} />
          <div>
            <Label htmlFor="tier">Nivel del premio (opcional)</Label>
            <select
              id="tier"
              name="tier"
              className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">Sin nivel (estándar)</option>
              <option value="Premio grande">Premio grande — se sortea primero</option>
              <option value="Premio mediano">Premio mediano</option>
            </select>
          </div>
          <Button type="submit" size="sm" variant="secondary" disabled={uploadPending}>
            Cargar
          </Button>
          {uploadState?.error && <p className="text-sm text-brand-danger">{uploadState.error}</p>}
          {uploadState?.success && <p className="text-sm text-brand-success">{uploadState.success}</p>}
        </form>
      </div>

      <div>
        <Badge tone={availableCount > 0 ? "success" : "danger"}>{availableCount} disponibles</Badge>
      </div>

      {codes.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs">
          {codes.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-brand-border/50 py-1">
              <span>{c.code}</span>
              <div className="flex items-center gap-2">
                {c.tier && <Badge tone="accent">{c.tier}</Badge>}
                <Badge tone={c.status === "available" ? "success" : c.status === "issued" ? "warning" : "neutral"}>
                  {c.status}
                </Badge>
                {c.status === "available" && (
                  <button
                    type="button"
                    className="font-sans text-brand-danger hover:underline"
                    onClick={() => unassignCode(sorteoId, c.id)}
                  >
                    quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
