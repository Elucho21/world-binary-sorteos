"use client";

import { useActionState } from "react";
import {
  assignFromPool,
  unassignCode,
  uploadManualCodesToSegment,
  type FormState,
} from "@/app/(educator)/dashboard/codes/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { WheelSegment } from "@/types/database.types";

interface SegmentCode {
  id: string;
  code: string;
  status: string;
}

export function SegmentCodesPanel({
  sorteoId,
  segment,
  codes,
  poolAvailable,
}: {
  sorteoId: string;
  segment: WheelSegment;
  codes: SegmentCode[];
  poolAvailable: number;
}) {
  const assignAction = assignFromPool.bind(null, sorteoId, segment.id);
  const [assignState, assignFormAction, assignPending] = useActionState<FormState, FormData>(
    assignAction,
    undefined
  );

  const uploadAction = uploadManualCodesToSegment.bind(null, sorteoId, segment.id);
  const [uploadState, uploadFormAction, uploadPending] = useActionState<FormState, FormData>(
    uploadAction,
    undefined
  );

  const availableCount = codes.filter((c) => c.status === "available").length;

  return (
    <div className="rounded-lg border border-brand-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
          <p className="font-medium">{segment.label}</p>
        </div>
        <Badge tone={availableCount > 0 || segment.is_consolation ? "success" : "danger"}>
          {segment.is_consolation ? "Sin premio" : `${availableCount} disponibles`}
        </Badge>
      </div>

      {!segment.is_consolation && (
        <div className="grid gap-4 sm:grid-cols-2">
          <form action={assignFormAction} className="space-y-2">
            <Label htmlFor={`qty-${segment.id}`}>
              Asignar desde tu pool ({poolAvailable} sin asignar)
            </Label>
            <div className="flex gap-2">
              <Input
                id={`qty-${segment.id}`}
                name="quantity"
                type="number"
                min={1}
                max={poolAvailable}
                defaultValue={Math.min(1, poolAvailable)}
              />
              <Button type="submit" size="sm" disabled={assignPending || poolAvailable === 0}>
                Asignar
              </Button>
            </div>
            {assignState?.error && <p className="text-sm text-brand-danger">{assignState.error}</p>}
            {assignState?.success && <p className="text-sm text-brand-success">{assignState.success}</p>}
          </form>

          <form action={uploadFormAction} className="space-y-2">
            <Label htmlFor={`codes-${segment.id}`}>O cargar directo para este segmento</Label>
            <Textarea id={`codes-${segment.id}`} name="codes" rows={2} placeholder="WB-BONUS-0001" />
            <Button type="submit" size="sm" variant="secondary" disabled={uploadPending}>
              Cargar
            </Button>
            {uploadState?.error && <p className="text-sm text-brand-danger">{uploadState.error}</p>}
            {uploadState?.success && <p className="text-sm text-brand-success">{uploadState.success}</p>}
          </form>
        </div>
      )}

      {codes.length > 0 && (
        <div className="mt-3 max-h-32 space-y-1 overflow-y-auto font-mono text-xs">
          {codes.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-brand-border/50 py-1">
              <span>{c.code}</span>
              <div className="flex items-center gap-2">
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
