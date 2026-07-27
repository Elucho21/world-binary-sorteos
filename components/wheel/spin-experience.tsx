"use client";

import { useState } from "react";
import { Wheel, type WheelSegmentInput } from "@/components/wheel/wheel";
import { Confetti } from "@/components/wheel/confetti";
import { TurnstileWidget } from "@/components/wheel/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { playWinChime } from "@/lib/win-chime";
import type { SpinWheelResult } from "@/types/database.types";

type Phase = "form" | "spinning" | "result";

const FULL_SPINS = 5;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function SpinExperience({
  slug,
  segments,
  educatorLabel,
}: {
  slug: string;
  segments: WheelSegmentInput[];
  educatorLabel: string;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [rotation, setRotation] = useState(0);
  const [transitionMs, setTransitionMs] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<SpinWheelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const segmentAngle = segments.length > 0 ? 360 / segments.length : 0;

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
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo procesar tu giro.");
        setSubmitting(false);
        return;
      }

      const spinResult = data as SpinWheelResult;
      const targetIndex = segments.findIndex((s) => s.id === spinResult.segment_id);
      const midAngle = targetIndex >= 0 ? targetIndex * segmentAngle + segmentAngle / 2 : 0;

      if (spinResult.already_played) {
        setTransitionMs(undefined);
        setRotation(360 - midAngle);
        setResult(spinResult);
        setPhase("result");
        setSubmitting(false);
        return;
      }

      setTransitionMs(4200);
      setRotation(FULL_SPINS * 360 + (360 - midAngle));
      setPhase("spinning");

      setTimeout(() => {
        setResult(spinResult);
        setPhase("result");
        setSubmitting(false);
        if (spinResult.code) playWinChime();
      }, 4200);
    } catch {
      setError("No pudimos conectar con el servidor. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  const showConfetti = phase === "result" && !!result?.code && !result.already_played;

  return (
    <div className="relative flex w-full flex-col items-center gap-8">
      {showConfetti && <Confetti />}
      <Wheel segments={segments} rotationDeg={rotation} transitionMs={transitionMs} size={280} />

      {phase === "form" && (
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
          {TURNSTILE_SITE_KEY && (
            <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />
          )}
          {error && <p className="text-sm text-brand-danger">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
          >
            {submitting ? "Girando..." : "Girar la ruleta"}
          </Button>
          <p className="text-center text-xs text-brand-muted">
            Al participar aceptás compartir tu nombre y email con {educatorLabel} y World Binary.
          </p>
        </form>
      )}

      {phase === "spinning" && <p className="text-brand-muted">Girando...</p>}

      {phase === "result" && result && (
        <div className="w-full max-w-sm space-y-3 text-center">
          {result.already_played && (
            <p className="text-sm text-brand-muted">Ya habías participado en este sorteo.</p>
          )}
          <p className="text-lg font-semibold">{result.segment_label}</p>
          {result.code ? (
            <div
              className={`rounded-lg border border-brand-accent bg-brand-accent/10 p-4 ${
                showConfetti ? "win-pop" : ""
              }`}
            >
              <p className="text-xs text-brand-muted">Tu código premio</p>
              <p className="font-mono text-xl font-bold text-brand-accent">{result.code}</p>
              <p className="mt-2 text-xs text-brand-muted">
                Canjealo directamente con {educatorLabel} o con World Binary.
              </p>
            </div>
          ) : (
            <p className="text-sm text-brand-muted">Esta vez no salió premio. ¡Gracias por participar!</p>
          )}
          <a href="/mis-premios" className="inline-block text-sm text-brand-primary hover:underline">
            Ver todos mis premios
          </a>
        </div>
      )}
    </div>
  );
}
