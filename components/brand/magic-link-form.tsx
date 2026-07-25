"use client";

import { useActionState } from "react";
import { requestMagicLink, type FormState } from "@/app/(public)/mis-premios/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(requestMagicLink, undefined);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div>
        <Label htmlFor="email">Email con el que participaste</Label>
        <Input id="email" name="email" type="email" required placeholder="tu@email.com" />
      </div>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success">{state.success}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviarme el link"}
      </Button>
    </form>
  );
}
