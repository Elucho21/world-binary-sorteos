"use client";

import { useEffect, useRef, useState } from "react";
import { Wheel, type WheelSegmentInput } from "@/components/wheel/wheel";
import { Confetti } from "@/components/wheel/confetti";
import { CountdownOverlay } from "@/components/wheel/countdown-overlay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createAudioContext, playTick, playWinChime, playCountdownBeep } from "@/lib/win-chime";
import { MUSIC_TRACKS, playMusicLoop, stopMusic, type MusicTrackId } from "@/lib/music-tracks";
import { drawWinners, type DrawnWinner } from "@/app/(educator)/dashboard/sorteos/actions";

const COLORS = ["#2AA76D", "#F5B400", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899", "#22D3EE"];
const SPIN_MS = 7200;
const REVEAL_PAUSE_MS = 2000;
const EXTRA_TURNS = 10;
const FINAL_PHASE_FRACTION = 0.8;
const COUNTDOWN_STEPS: (3 | 2 | 1 | 0)[] = [3, 2, 1, 0];
const PRACTICE_NAMES = [
  "Trader Prueba 1",
  "Trader Prueba 2",
  "Trader Prueba 3",
  "Trader Prueba 4",
  "Trader Prueba 5",
  "Trader Prueba 6",
  "Trader Prueba 7",
  "Trader Prueba 8",
];

function makePracticePool(): { id: string; name: string }[] {
  return PRACTICE_NAMES.map((name, i) => ({ id: `practice-${i}`, name }));
}

function makePracticeWinners(pool: { id: string; name: string }[], count: number): DrawnWinner[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map((p, i) => ({
    participantId: p.id,
    name: p.name,
    code: `PRUEBA-${String(i + 1).padStart(4, "0")}`,
    tier: null,
  }));
}

function toSegments(pool: { id: string; name: string }[]): WheelSegmentInput[] {
  return pool.map((p, i) => ({ id: p.id, label: p.name, color: COLORS[i % COLORS.length] }));
}

function nextRotation(current: number, midAngle: number) {
  const targetMod = (((360 - midAngle) % 360) + 360) % 360;
  const currentMod = ((current % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += 360;
  return current + EXTRA_TURNS * 360 + delta;
}

function currentSegmentIndex(svg: SVGSVGElement, segmentCount: number): number {
  const transform = getComputedStyle(svg).transform;
  if (!transform || transform === "none" || segmentCount === 0) return -1;
  const match = transform.match(/matrix\(([^)]+)\)/);
  if (!match) return -1;
  const parts = match[1].split(",").map((n) => parseFloat(n.trim()));
  const [a, b] = parts;
  const liveAngle = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const pointerAngle = (360 - liveAngle) % 360;
  const sliceAngle = 360 / segmentCount;
  return Math.floor(pointerAngle / sliceAngle) % segmentCount;
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
  const [liveSegmentName, setLiveSegmentName] = useState<string | null>(null);
  const [isFinalPhase, setIsFinalPhase] = useState(false);
  const [countdown, setCountdown] = useState<3 | 2 | 1 | 0 | null>(null);
  const [musicTrack, setMusicTrack] = useState<MusicTrackId>("alegre");
  const [practiceMode, setPracticeMode] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicNodesRef = useRef<OscillatorNode[]>([]);
  const wheelWrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastSegmentIndexRef = useRef<number>(-1);
  const spinStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (tickTimeoutRef.current) clearTimeout(tickTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopMusic(musicNodesRef.current);
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

  function startCalloutLoop(currentPool: { id: string; name: string }[]) {
    spinStartTimeRef.current = performance.now();
    lastSegmentIndexRef.current = -1;
    setLiveSegmentName(null);
    setIsFinalPhase(false);

    function frame() {
      const svg = wheelWrapperRef.current?.querySelector("svg");
      if (svg) {
        const idx = currentSegmentIndex(svg, currentPool.length);
        if (idx >= 0 && idx !== lastSegmentIndexRef.current) {
          lastSegmentIndexRef.current = idx;
          setLiveSegmentName(currentPool[idx]?.name ?? null);
        }
      }
      const fraction = (performance.now() - spinStartTimeRef.current) / SPIN_MS;
      setIsFinalPhase(fraction >= FINAL_PHASE_FRACTION);
      if (fraction < 1) {
        rafRef.current = requestAnimationFrame(frame);
      }
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  function stopCalloutLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function toggleCode(participantId: string) {
    setVisibleCodes((v) => ({ ...v, [participantId]: !v[participantId] }));
  }

  function spinNext(queue: DrawnWinner[], currentPool: { id: string; name: string }[]) {
    if (queue.length === 0) {
      setDone(true);
      setSpinning(false);
      stopMusic(musicNodesRef.current);
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
    startCalloutLoop(currentPool);

    setTimeout(() => {
      stopTicking();
      stopCalloutLoop();
      setLiveSegmentName(null);
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

  function runCountdown(): Promise<void> {
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        const step = COUNTDOWN_STEPS[i];
        setCountdown(step);
        playCountdownBeep(audioCtxRef.current, step);
        i++;
        if (i < COUNTDOWN_STEPS.length) {
          setTimeout(next, 800);
        } else {
          setTimeout(() => {
            setCountdown(null);
            resolve();
          }, 500);
        }
      };
      next();
    });
  }

  async function handleDraw(practice: boolean) {
    setError(null);
    setDrawing(true);
    setPracticeMode(practice);
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    musicNodesRef.current = playMusicLoop(audioCtxRef.current, musicTrack);

    let winners: DrawnWinner[];
    let drawPool: { id: string; name: string }[];
    if (practice) {
      drawPool = makePracticePool();
      winners = makePracticeWinners(drawPool, Math.max(1, Math.min(participants.length || 3, drawPool.length)));
      setPool(drawPool);
    } else {
      const result = await drawWinners(sorteoId);
      if (result.error) {
        setDrawing(false);
        stopMusic(musicNodesRef.current);
        setError(result.error);
        return;
      }
      winners = result.winners ?? [];
      drawPool = pool;
    }

    await runCountdown();
    setDrawing(false);
    spinNext(winners, drawPool);
  }

  function resetAfterPractice() {
    setPool(participants);
    setRevealed([]);
    setDone(false);
    setPracticeMode(false);
    setShowConfettiFor(0);
    setShowFlashFor(0);
  }

  const segments = toSegments(pool);

  return (
    <div className="space-y-6">
      <div className="relative flex flex-col items-center gap-4">
        {showConfettiFor > 0 && !spinning && revealed.length > 0 && <Confetti key={showConfettiFor} />}

        <div ref={wheelWrapperRef} className="relative" style={{ width: 280, height: 280 }}>
          {showFlashFor > 0 && (
            <div
              key={showFlashFor}
              className="winner-flash pointer-events-none absolute inset-0 z-30 rounded-full bg-white"
            />
          )}
          <Wheel segments={segments} rotationDeg={rotation} transitionMs={transitionMs} size={280} spinning={spinning} />
          {countdown !== null && <CountdownOverlay value={countdown} />}
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
          {spinning && liveSegmentName && (
            <div
              key={liveSegmentName}
              className={`pointer-callout absolute left-1/2 top-full z-20 mt-3 -translate-x-1/2 whitespace-nowrap rounded-md border px-3 py-1 text-sm ${
                isFinalPhase
                  ? "pointer-callout-zoom scale-125 border-brand-accent bg-brand-accent/10 font-semibold text-brand-accent"
                  : "border-brand-border bg-brand-surface-raised text-brand-muted"
              }`}
            >
              {liveSegmentName}
            </div>
          )}
        </div>

        {spinning && (
          <p className="suspense-text text-sm font-medium text-brand-accent">Girando la ruleta...</p>
        )}

        {!done && (
          <>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-xs text-brand-muted">Música:</span>
              {Object.values(MUSIC_TRACKS).map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => setMusicTrack(track.id)}
                  disabled={drawing || spinning}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    musicTrack === track.id
                      ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                      : "border-brand-border text-brand-muted hover:text-brand-text"
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-brand-danger">
              Esta acción es irreversible: una vez que gira la ruleta no se puede deshacer ni
              repetir el sorteo.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="lg" onClick={() => handleDraw(false)} disabled={drawing || spinning || participants.length === 0}>
                {drawing && !practiceMode
                  ? countdown !== null
                    ? `Arrancando en ${countdown === 0 ? "..." : countdown}`
                    : "Preparando..."
                  : spinning && !practiceMode
                    ? "Girando..."
                    : "Sortear"}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => handleDraw(true)} disabled={drawing || spinning}>
                🧪 Modo simulacro
              </Button>
            </div>
            <p className="text-xs text-brand-muted">
              El modo simulacro corre la animación completa con participantes ficticios, sin usar
              premios reales ni tocar los datos de este sorteo.
            </p>
          </>
        )}
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        {participants.length === 0 && !done && (
          <p className="text-sm text-brand-muted">Todavía no hay participantes registrados.</p>
        )}
      </div>

      {done && practiceMode && (
        <Card className="border-brand-accent/40 bg-brand-accent/5">
          <p className="font-semibold text-brand-accent">Esto fue un simulacro</p>
          <p className="mt-1 text-sm text-brand-muted">
            No se gastó ningún premio real ni se modificaron los datos de este sorteo. Cuando estés
            listo para el sorteo real, volvé a esta pantalla.
          </p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={resetAfterPractice}>
            Volver a la pantalla de sorteo real
          </Button>
        </Card>
      )}

      {revealed.length > 0 && (
        <Card>
          <p className="mb-1 font-semibold">
            {practiceMode ? "Ganadores (simulacro)" : `Ganadores (${revealed.length})`}
          </p>
          <p className="mb-3 text-xs text-brand-muted">
            Los códigos quedan ocultos por defecto — si estás compartiendo pantalla, evitá revelarlos en vivo
            para que nadie los use antes que el ganador.
          </p>
          <div className="space-y-2">
            {revealed.map((w, i) => (
              <div key={w.participantId} className="flex items-center justify-between border-b border-brand-border/60 py-2">
                <span className="flex items-center gap-2">
                  #{i + 1} — {w.name}
                  {w.tier && (
                    <span className="rounded-full bg-brand-accent/10 px-2 py-0.5 text-xs text-brand-accent">
                      {w.tier}
                    </span>
                  )}
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
