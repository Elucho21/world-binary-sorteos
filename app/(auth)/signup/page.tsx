"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthActionState } from "../actions";
import { SiteHeader } from "@/components/brand/site-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    signup,
    undefined
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Crear cuenta de educador/IB</CardTitle>
            <CardDescription>
              Sorteá cuentas bono entre los miembros de tu comunidad: nosotros armamos la página
              de registro, la ruleta en vivo y el seguimiento de premios — vos solo compartís el
              link. Tu cuenta queda pendiente de aprobación por World Binary antes de poder
              publicar sorteos.
            </CardDescription>
            <ul className="mt-3 space-y-1 text-sm text-brand-muted">
              <li>· Link de registro con tu marca</li>
              <li>· Ruleta en vivo con animación y sonido</li>
              <li>· Seguimiento de códigos canjeados, todo en un panel</li>
            </ul>
          </CardHeader>
          {state?.message ? (
            <p className="text-sm text-brand-success">{state.message}</p>
          ) : (
            <form action={formAction} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Nombre / marca</Label>
                <Input id="displayName" name="displayName" required autoComplete="name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
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
                {pending ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-brand-muted">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-brand-primary hover:underline">
              Ingresá
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
