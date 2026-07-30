"use client";

import { useEffect, useRef, useState } from "react";
import { getParticipantId } from "@/lib/participant-storage";
import type { CheckParticipantPrizeResult } from "@/types/database.types";

const POLL_MS = 27000;

export function PrizeRevealCheck({
  slug,
  alreadyDrawn,
  educatorLabel,
}: {
  slug: string;
  alreadyDrawn: boolean;
  educatorLabel: string;
}) {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [result, setResult] = useState<CheckParticipantPrizeResult | null>(null);
  const [checked, setChecked] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // localStorage only exists client-side; reading it here (post-mount)
    // rather than in the useState initializer avoids a server/client
    // hydration mismatch, since the server always renders the "no id" state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticipantId(getParticipantId(slug));
  }, [slug]);

  useEffect(() => {
    if (!participantId) return;
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/check-prize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, participantId }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as CheckParticipantPrizeResult;
        if (cancelled) return;
        setResult(data);
        setChecked(true);
        if (data.drawn && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // Best-effort — the next poll tick (or a manual reload) will retry.
      }
    }

    check();

    if (!alreadyDrawn) {
      pollRef.current = setInterval(() => {
        if (document.visibilityState === "visible") check();
      }, POLL_MS);
    }

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [participantId, slug, alreadyDrawn]);

  if (!participantId) {
    return alreadyDrawn ? (
      <p className="text-brand-muted">Este sorteo ya cerró y se sorteó a los ganadores.</p>
    ) : null;
  }

  if (!checked || !result?.drawn) {
    return alreadyDrawn ? (
      <p className="text-brand-muted">Este sorteo ya cerró y se sorteó a los ganadores.</p>
    ) : (
      <p className="text-xs text-brand-muted">
        Ya estás registrado — si te toca, te lo mostramos acá apenas se sortee.
      </p>
    );
  }

  if (result.won) {
    return (
      <div className="w-full max-w-sm space-y-2 rounded-lg border border-brand-accent bg-brand-accent/10 p-6 text-center">
        <p className="text-lg font-semibold text-brand-accent">¡Ganaste!</p>
        <p className="font-mono text-xl">{result.code}</p>
        <p className="text-sm text-brand-muted">
          Para canjear tu cuenta bono, contactá a <strong>{educatorLabel}</strong> por los mismos
          medios donde te enteraste del sorteo, o escribí a World Binary.
        </p>
      </div>
    );
  }

  return (
    <p className="text-brand-muted">
      Este sorteo ya cerró y se sorteó a los ganadores. Esta vez no te tocó — seguís pudiendo
      revisar tus premios en{" "}
      <a href="/mis-premios" className="text-brand-primary hover:underline">
        Mis Premios
      </a>
      .
    </p>
  );
}
