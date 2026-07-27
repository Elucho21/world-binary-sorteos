"use client";

import { useState } from "react";
import { Wheel, type WheelSegmentInput } from "@/components/wheel/wheel";
import { Confetti } from "@/components/wheel/confetti";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { playWinChime } from "@/lib/win-chime";
import { drawWinners, type DrawnWinner } from "@/app/(educator)/dashboard/sorteos/actions";

const COLORS = ["#2AA76D", "#F5B400", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899", "#22D3EE"];

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
  const [done, setDone] = useState(alreadyDrawn);

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

    setTransitionMs(3200);
    setRotation((prev) => nextRotation(prev, midAngle));
    setSpinning(true);

    setTimeout(() => {
      setRevealed((r) => [...r, next]);
      setShowConfettiFor((c) => c + 1);
      playWinChime();
      const newPool = currentPool.filter((p) => p.id !== next.participantId);
      setPool(newPool);
      setSpinning(false);
      setTimeout(() => spinNext(rest, newPool), 1600);
    }, 3200);
  }

  async function handleDraw() {
    setError(null);
    setDrawing(true);
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
        {showConfettiFor > 0 && spinning === false && revealed.length > 0 && <Confetti key={showConfettiFor} />}
        <Wheel segments={segments} rotationDeg={rotation} transitionMs={transitionMs} size={280} />

        {!done && (
          <Button size="lg" onClick={handleDraw} disabled={drawing || spinning || participants.length === 0}>
            {drawing ? "Preparando..." : spinning ? "Girando..." : "Sortear"}
          </Button>
        )}
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        {participants.length === 0 && !done && (
          <p className="text-sm text-brand-muted">Todavía no hay participantes registrados.</p>
        )}
      </div>

      {revealed.length > 0 && (
        <Card>
          <p className="mb-3 font-semibold">Ganadores ({revealed.length})</p>
          <div className="space-y-2">
            {revealed.map((w, i) => (
              <div key={i} className="flex items-center justify-between border-b border-brand-border/60 py-2">
                <span>
                  #{i + 1} — {w.name}
                </span>
                <span className="font-mono text-brand-accent">{w.code ?? "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
