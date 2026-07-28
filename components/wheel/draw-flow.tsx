"use client";

import { useEffect, useRef, useState } from "react";
import { Wheel, type WheelSegmentInput } from "@/components/wheel/wheel";
import { Confetti } from "@/components/wheel/confetti";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createAudioContext, playTick, playWinChime } from "@/lib/win-chime";
import { drawWinners, type DrawnWinner } from "@/app/(educator)/dashboard/sorteos/actions";

const COLORS = ["#2AA76D", "#F5B400", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899", "#22D3EE"];
const SPIN_MS = 3200;
const REVEAL_PAUSE_MS = 2000;

function toSegments(pool: { id: string; name: string }[]): WheelSegmentInput[] {
  return pool.map((p, i) => ({ id: p.id, label: p.name, color: COLORS[i % COLORS.length] }));
}

function nextRotation(current: number, midAngle: number) {
  const targetMod = (((360 - midAngle) % 360) + 360) % 360;
  const currentMod = ((current % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += 360;
  return current + 5 * 360 + delta;
}

export function DrawFlow({
  sorteoId,
  participants,
  alreadyDrawn,
  existingWinners,
}: {
  sorteoId: string;
  participants: { id: string; name: string }[];
  alreadyDrawn: boolean;
  existingWinners: DrawnWinner[];
}) {
  const [pool, setPool] = useState(participants);
  const [rotation, setRotation] = useState(0);
  const [transitionMs, setTransitionMs] = useState<number | undefined>(undefined);
  const [spinning, setSpinning] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<DrawnWinner[]>(alreadyDrawn ? existingWinners : []);
  const [showConfettiFor, setShowConfettiFor] = useState(0);
  const [showFlashFor, setShowFlashFor] = useState(0);
  const [bannerWinner, setBannerWinner] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyDrawn);
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});

  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tickTimeoutRef.current) clearTimeout(tickTimeoutRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  function startTicking() {
    let elapsed = 0;
    let delay = 90;
    const tick = () => {
      if (elapsed >= SPIN_MS - 300) return;
      playTick(audioCtxRef.current, 650 + Math.random() * 120);
      delay = Math.min(delay * 1.16, 380);
      elapsed += delay;
      tickTimeoutRef.current = setTimeout(tick, delay);
    };
    tick();
  }

  function stopTicking() {
    if (tickTimeoutRef.current) {
      clearTimeout(tickTimeoutRef.current);
      tickTimeoutRef.current = null;
    }
  }

  function toggleCode(participantId: string) {
    setVisibleCodes((v) => ({ ...v, [participantId]: !v[participantId] }));
  }

  function spinNext(queue: DrawnWinner[], currentPool: { id: string; name: string }[]) {
    if (queue.length === 0) {
      setDone(true);
      setSpinning(false);
      return;
    }
    const [next, ...rest] = queue;
    const idx = currentPool.findIndex((p) => p.id === next.participantId);
    const segmentAngle = currentPool.length > 0 ? 360 / currentPool.length : 0;
    const midAngle = idx >= 0 ? idx * segmentAngle + segmentAngle / 2 : 0;

    setTransitionMs(SPIN_MS);
    setRotation((prev) => nextRotation(prev, midAngle));
    setSpinning(true);
    startTicking();

    setTimeout(() => {
      stopTicking();
      setRevealed((r) => [...r, next]);
      setShowConfettiFor((c) => c + 1);
      setShowFlashFor((f) => f + 1);
      setBannerWinner(next.name);
      playWinChime(audioCtxRef.current);
      const newPool = currentPool.filter((p) => p.id !== next.participantId);
      setPool(newPool);
      setSpinning(false);
      setTimeout(() => setBannerWinner(null), 1600);
      setTimeout(() => spinNext(rest, newPool), REVEAL_PAUSE_MS);
    }, SPIN_MS);
  }

  async function handleDraw() {
    setError(null);
    setDrawing(true);
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    const result = await drawWinners(sorteoId);
    setDrawing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    spinNext(result.winners ?? [], pool);
  }

  const segments = toSegments(pool);

  return (
    <div className="space-y-6">
      <div className="relative flex flex-col items-center gap-4">
        {showConfettiFor > 0 && !spinning && revealed.length > 0 && <Confetti key={showConfettiFor} />}

        <div className="relative" style={{ width: 280, height: 280 }}>
          {showFlashFor > 0 && (
            <div
              key={showFlashFor}
              className="winner-flash pointer-events-none absolute inset-0 z-30 rounded-full bg-white"
            />
          )}
          <Wheel segments={segments} rotationDeg={rotation} transitionMs={transitionMs} size={280} spinning={spinning} />
          {bannerWinner && (
            <div className="winner-banner absolute inset-0 z-40 flex items-center justify-center px-4">
              <div className="rounded-lg border border-brand-accent bg-brand-bg/95 px-6 py-4 text-center shadow-xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  ¡Tenemos ganador!
                </p>
                <p className="mt-1 text-xl font-bold">{bannerWinner}</p>
              </div>
            </div>
          )}
        </div>

        {spinning && (
          <p className="suspense-text text-sm font-medium text-brand-accent">Girando la ruleta...</p>
        )}

        {!done && (
          <>
            <p className="text-xs text-brand-danger">
              Esta acción es irreversible: una vez que gira la ruleta no se puede deshacer ni
              repetir el sorteo.
            </p>
            <Button size="lg" onClick={handleDraw} disabled={drawing || spinning || participants.length === 0}>
              {drawing ? "Preparando..." : spinning ? "Girando..." : "Sortear"}
            </Button>
          </>
        )}
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        {participants.length === 0 && !done && (
          <p className="text-sm text-brand-muted">Todavía no hay participantes registrados.</p>
        )}
      </div>

      {revealed.length > 0 && (
        <Card>
          <p className="mb-1 font-semibold">Ganadores ({revealed.length})</p>
          <p className="mb-3 text-xs text-brand-muted">
            Los códigos quedan ocultos por defecto — si estás compartiendo pantalla, evitá revelarlos en vivo
            para que nadie los use antes que el ganador.
          </p>
          <div className="space-y-2">
            {revealed.map((w, i) => (
              <div key={w.participantId} className="flex items-center justify-between border-b border-brand-border/60 py-2">
                <span>
                  #{i + 1} — {w.name}
                </span>
                {w.code ? (
                  visibleCodes[w.participantId] ? (
                    <button
                      type="button"
                      onClick={() => toggleCode(w.participantId)}
                      className="font-mono text-sm text-brand-accent hover:underline"
                    >
                      {w.code}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleCode(w.participantId)}
                      className="text-xs text-brand-muted underline hover:text-brand-text"
                    >
                      Ver código
                    </button>
                  )
                ) : (
                  <span className="text-brand-muted">—</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
