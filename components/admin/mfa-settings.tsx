"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TotpFactor {
  id: string;
  status: "verified" | "unverified";
}

export function MfaSettings() {
  const [factors, setFactors] = useState<TotpFactor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      if (!cancelled) setFactors(data?.totp ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnroll() {
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (enrollError || !data) {
      setError("No se pudo iniciar la activación. Intentá de nuevo.");
      return;
    }
    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  function confirmEnroll(e: FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrolling.factorId,
        code,
      });
      if (verifyError) {
        setError("Código incorrecto. Revisá la hora de tu teléfono e intentá de nuevo.");
        return;
      }
      setEnrolling(null);
      setCode("");
      setSuccess("Verificación en dos pasos activada.");
      await refresh();
    });
  }

  function unenroll(factorId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) {
        setError("No se pudo desactivar. Intentá de nuevo.");
        return;
      }
      setSuccess("Verificación en dos pasos desactivada.");
      await refresh();
    });
  }

  if (factors === null) return <p className="text-sm text-brand-muted">Cargando...</p>;

  const verifiedFactor = factors.find((f) => f.status === "verified");

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-brand-danger">{error}</p>}
      {success && <p className="text-sm text-brand-success">{success}</p>}

      {verifiedFactor ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <Badge tone="success">Activada</Badge>
            <p className="mt-1 text-xs text-brand-muted">
              Se te va a pedir un código de tu app autenticadora cada vez que inicies sesión.
            </p>
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isPending}
            onClick={() => unenroll(verifiedFactor.id)}
          >
            Desactivar
          </Button>
        </div>
      ) : enrolling ? (
        <form onSubmit={confirmEnroll} className="space-y-3">
          <p className="text-sm text-brand-muted">
            Escaneá este código con Google Authenticator, Authy o similar, y escribí el código de 6
            dígitos que te muestra.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URI, not an external image */}
          <img
            src={`data:image/svg+xml;utf-8,${enrolling.qrCode}`}
            alt="Código QR para activar la verificación en dos pasos"
            width={180}
            height={180}
          />
          <p className="break-all font-mono text-xs text-brand-muted">Clave manual: {enrolling.secret}</p>
          <div className="max-w-[200px]">
            <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              Confirmar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEnrolling(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" size="sm" disabled={isPending} onClick={startEnroll}>
          Activar verificación en dos pasos
        </Button>
      )}
    </div>
  );
}
