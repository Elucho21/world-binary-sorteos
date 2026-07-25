"use client";

import { useActionState } from "react";
import { adminUploadToWallet, adminUploadToSegment, type FormState } from "@/app/(admin)/admin/codes/actions";
import { Button } from "@/components/ui/button";
import { Label, Textarea, Input } from "@/components/ui/input";

interface EducatorOption {
  id: string;
  label: string;
}

interface SegmentOption {
  id: string;
  label: string;
}

export function WalletUploadForm({ educators }: { educators: EducatorOption[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(adminUploadToWallet, undefined);

  return (
    <form action={formAction} className="space-y-3">
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
        <Label htmlFor="wallet-codes">Códigos (uno por línea)</Label>
        <Textarea id="wallet-codes" name="codes" rows={4} placeholder={"WB-BONUS-0001\nWB-BONUS-0002"} />
      </div>
      <div>
        <Label htmlFor="wallet-file">...o archivo</Label>
        <Input id="wallet-file" name="file" type="file" accept=".csv,.txt" />
      </div>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Cargando..." : "Cargar a la bolsa general"}
      </Button>
    </form>
  );
}

export function SegmentUploadForm({ segments }: { segments: SegmentOption[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(adminUploadToSegment, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="segmentId">Segmento</Label>
        <select
          id="segmentId"
          name="segmentId"
          required
          className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text"
        >
          <option value="">Elegí un segmento...</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="segment-codes">Códigos (uno por línea)</Label>
        <Textarea id="segment-codes" name="codes" rows={4} placeholder={"WB-BONUS-0001\nWB-BONUS-0002"} />
      </div>
      <div>
        <Label htmlFor="segment-file">...o archivo</Label>
        <Input id="segment-file" name="file" type="file" accept=".csv,.txt" />
      </div>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Cargando..." : "Cargar directo al sorteo"}
      </Button>
    </form>
  );
}
