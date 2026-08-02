"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

const POLL_MS = 15000;

export function LiveParticipantPulse({ sorteoId, initialCount }: { sorteoId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/dashboard/sorteos/${sorteoId}/participant-count`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { count: number };
        if (!cancelled) setCount(data.count);
      } catch {
        // Best-effort — the next tick retries.
      }
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sorteoId]);

  return (
    <Card className="flex items-center justify-between p-4">
      <div>
        <p className="text-xs text-brand-muted">Pulso en vivo</p>
        <p className="text-2xl font-semibold">{count} inscriptos ahora</p>
      </div>
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-primary" aria-hidden="true" />
    </Card>
  );
}
