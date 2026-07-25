"use client";

import { useActionState, useRef, useEffect } from "react";
import { createSegment, type FormState } from "@/app/(educator)/dashboard/sorteos/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const DEFAULT_COLORS = ["#2F6FED", "#F5B400", "#22C55E", "#EF4444", "#8B5CF6", "#06B6D4"];

export function AddSegmentForm({ sorteoId, nextColor }: { sorteoId: string; nextColor: string }) {
  const action = createSegment.bind(null, sorteoId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const lastPending = useRef(pending);

  useEffect(() => {
    if (lastPending.current && !pending && !state?.error) {
      formRef.current?.reset();
    }
    lastPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end">
      <div className="col-span-2 sm:col-span-2">
        <Label htmlFor="new-label">Etiqueta</Label>
        <Input id="new-label" name="label" required placeholder="Cuenta bono $100" />
      </div>
      <div>
        <Label htmlFor="new-color">Color</Label>
        <Input id="new-color" name="color" type="color" defaultValue={nextColor} className="h-9 p-1" />
      </div>
      <div>
        <Label htmlFor="new-weight">Peso</Label>
        <Input id="new-weight" name="weight" type="number" step="0.1" min={0} defaultValue={1} required />
      </div>
      <div>
        <Label htmlFor="new-prizeTier">Nivel de premio</Label>
        <Input id="new-prizeTier" name="prizeTier" placeholder="opcional" />
      </div>
      {state?.error && <p className="col-span-full text-sm text-brand-danger">{state.error}</p>}
      <div className="col-span-full">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Agregando..." : "Agregar segmento"}
        </Button>
      </div>
    </form>
  );
}

export { DEFAULT_COLORS };
