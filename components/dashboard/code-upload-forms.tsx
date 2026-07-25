"use client";

import { useActionState, useRef, useEffect } from "react";
import { uploadManualCodes, uploadFileCodes, type FormState } from "@/app/(educator)/dashboard/codes/actions";
import { Button } from "@/components/ui/button";
import { Label, Textarea, Input } from "@/components/ui/input";

export function ManualCodesForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(uploadManualCodes, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const lastPending = useRef(pending);

  useEffect(() => {
    if (lastPending.current && !pending && !state?.error) formRef.current?.reset();
    lastPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="codes">Códigos (uno por línea o separados por coma)</Label>
        <Textarea id="codes" name="codes" rows={5} placeholder={"WB-BONUS-0001\nWB-BONUS-0002"} />
      </div>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Cargando..." : "Cargar códigos"}
      </Button>
    </form>
  );
}

export function FileCodesForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(uploadFileCodes, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const lastPending = useRef(pending);

  useEffect(() => {
    if (lastPending.current && !pending && !state?.error) formRef.current?.reset();
    lastPending.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="file">Archivo (.csv o .txt, un código por línea/columna)</Label>
        <Input id="file" name="file" type="file" accept=".csv,.txt" required />
      </div>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Cargando..." : "Subir archivo"}
      </Button>
    </form>
  );
}
