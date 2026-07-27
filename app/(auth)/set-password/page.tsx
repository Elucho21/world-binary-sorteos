"use client";

import { useActionState } from "react";
import { setPassword, type AuthActionState } from "../actions";
import { SiteHeader } from "@/components/brand/site-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SetPasswordPage() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    setPassword,
    undefined
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Elegí tu contraseña</CardTitle>
            <CardDescription>Para terminar de activar tu cuenta del equipo.</CardDescription>
          </CardHeader>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Guardando..." : "Guardar y entrar"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
