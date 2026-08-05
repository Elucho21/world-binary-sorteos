"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SiteHeader } from "@/components/brand/site-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginMfaPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") {
        router.replace("/admin");
        return;
      }
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verified = factorsData?.totp.find((f) => f.status === "verified");
      if (!verified) {
        router.replace("/login");
        return;
      }
      setFactorId(verified.id);
      setChecking(false);
    })();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setPending(false);
    if (verifyError) {
      setError("Código incorrecto. Probá de nuevo.");
      return;
    }
    router.replace("/admin");
  }

  if (checking) return null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Verificación en dos pasos</CardTitle>
            <CardDescription>Ingresá el código de tu app autenticadora.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Código de 6 dígitos</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-brand-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Verificando..." : "Verificar"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
