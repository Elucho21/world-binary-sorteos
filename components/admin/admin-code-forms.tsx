"use client";

import { useActionState } from "react";
import { adminUploadToWallet, adminUploadToSorteo, type FormState } from "@/app/(admin)/admin/codes/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { CodeTextareaWithPreview, CodeFileInputWithPreview } from "@/components/dashboard/code-input-preview";

interface EducatorOption {
  id: string;
  label: string;
}

interface SorteoOption {
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
      <CodeTextareaWithPreview id="wallet-codes" name="codes" />
      <CodeFileInputWithPreview id="wallet-file" name="file" />
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Cargando..." : "Cargar a la bolsa general"}
      </Button>
    </form>
  );
}

export function SorteoUploadForm({ sorteos }: { sorteos: SorteoOption[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(adminUploadToSorteo, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="sorteoId">Sorteo</Label>
        <select
          id="sorteoId"
          name="sorteoId"
          required
          className="w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text"
        >
          <option value="">Elegí un sorteo...</option>
          {sorteos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <CodeTextareaWithPreview id="sorteo-codes" name="codes" />
      <CodeFileInputWithPreview id="sorteo-file" name="file" />
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Cargando..." : "Cargar directo al sorteo"}
      </Button>
    </form>
  );
}
