"use client";

import { useState } from "react";
import { TurnstileWidget } from "@/components/wheel/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { RegisterParticipantResult } from "@/types/database.types";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function RegistrationForm({
  slug,
  educatorLabel,
  winnersCount,
}: {
  slug: string;
  educatorLabel: string;
  winnersCount: number;
}) {
  const [phase, setPhase] = useState<"form" | "done">("form");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      slug,
      name: formData.get("name"),
      email: formData.get("email"),
      honeypot: formData.get("honeypot"),
      turnstileToken: turnstileToken ?? undefined,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo procesar tu registro.");
        setSubmitting(false);
        return;
      }

      const result = data as RegisterParticipantResult;
      setAlreadyRegistered(result.already_registered);
      setPhase("done");
      setSubmitting(false);
    } catch {
      setError("No pudimos conectar con el servidor. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  if (phase === "done") {
    return (
      <div className="w-full max-w-sm space-y-3 rounded-lg border border-brand-primary bg-brand-primary/10 p-6 text-center">
        <p className="text-lg font-semibold">
          {alreadyRegistered ? "Ya estabas participando" : "¡Listo, ya estás participando!"}
        </p>
        <p className="text-sm text-brand-muted">
          {winnersCount > 1
            ? `${educatorLabel} va a sortear ${winnersCount} ganadores entre todos los inscriptos.`
            : `${educatorLabel} va a sortear 1 ganador entre todos los inscriptos.`}{" "}
          Vas a poder ver si ganaste en{" "}
          <a href="/mis-premios" className="text-brand-primary hover:underline">
            Mis Premios
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required placeholder="Tu nombre" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="tu@email.com" />
      </div>
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="honeypot">No completar</label>
        <input id="honeypot" name="honeypot" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {TURNSTILE_SITE_KEY && <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />}
      {error && <p className="text-sm text-brand-danger">{error}</p>}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={submitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
      >
        {submitting ? "Enviando..." : "Quiero participar"}
      </Button>
      <p className="text-center text-xs text-brand-muted">
        Al participar aceptás compartir tu nombre y email con {educatorLabel} y World Binary.
      </p>
    </form>
  );
}
