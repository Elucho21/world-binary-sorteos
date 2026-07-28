"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { TOURS, isTourDismissed, markTourDismissed, resetTour } from "@/lib/tour/tours";

interface ResolvedStep {
  el: HTMLElement;
  title: string;
  body: string;
}

interface TourContextValue {
  requestAutoStart: (tourId: string) => void;
  replay: (tourId: string) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useGuidedTourContext() {
  return useContext(TourContext);
}

function waitForTarget(selector: string, timeoutMs = 1000, intervalMs = 100): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(check, intervalMs);
    };
    check();
  });
}

function clampPopoverStyle(rect: DOMRect) {
  const width = Math.min(300, window.innerWidth - 24);
  const margin = 12;
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  const spaceBelow = window.innerHeight - rect.bottom;
  const placeBelow = spaceBelow > 200 || rect.top < 200;
  return {
    left,
    width,
    top: placeBelow ? rect.bottom + 12 : undefined,
    bottom: placeBelow ? undefined : window.innerHeight - rect.top + 12,
  };
}

function TourOverlay({
  rect,
  title,
  body,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: {
  rect: DOMRect;
  title: string;
  body: string;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const pad = 6;
  const top = rect.top - pad;
  const left = rect.left - pad;
  const width = rect.width + pad * 2;
  const height = rect.height + pad * 2;
  const pop = clampPopoverStyle(rect);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="pointer-events-auto fixed inset-x-0 top-0 bg-black/60"
        style={{ height: Math.max(top, 0) }}
        onClick={onSkip}
      />
      <div
        className="pointer-events-auto fixed inset-x-0 bottom-0 bg-black/60"
        style={{ top: top + height }}
        onClick={onSkip}
      />
      <div
        className="pointer-events-auto fixed bg-black/60"
        style={{ top, height, left: 0, width: Math.max(left, 0) }}
        onClick={onSkip}
      />
      <div
        className="pointer-events-auto fixed bg-black/60"
        style={{ top, height, left: left + width, right: 0 }}
        onClick={onSkip}
      />

      <div className="tour-highlight-in pointer-events-none fixed rounded-lg ring-2 ring-brand-accent" style={{ top, left, width, height }} />

      <div
        className="pointer-events-auto fixed z-[71] rounded-lg border border-brand-accent bg-brand-surface-raised p-4 shadow-xl"
        style={{ left: pop.left, top: pop.top, bottom: pop.bottom, width: pop.width }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-brand-muted">
            Paso {stepIndex + 1} de {totalSteps}
          </span>
          <button type="button" onClick={onSkip} className="text-xs text-brand-muted underline hover:text-brand-text">
            Saltar tour
          </button>
        </div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-brand-muted">{body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          {stepIndex > 0 ? (
            <Button type="button" variant="secondary" size="sm" onClick={onPrev}>
              Anterior
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" size="sm" onClick={onNext}>
            {stepIndex + 1 >= totalSteps ? "Entendido" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const [tourId, setTourId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ResolvedStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const startedRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const begin = useCallback(async (id: string) => {
    const def = TOURS[id];
    if (!def) return;
    const resolved: ResolvedStep[] = [];
    for (const step of def.steps) {
      const el = await waitForTarget(step.target);
      if (el) resolved.push({ el, title: step.title, body: step.body });
    }
    if (!mountedRef.current || resolved.length === 0) return;
    setSteps(resolved);
    setStepIndex(0);
    setTourId(id);
  }, []);

  const finish = useCallback(
    (reason: "completed" | "skipped") => {
      if (tourId) markTourDismissed(tourId, reason);
      setTourId(null);
      setSteps([]);
      setStepIndex(0);
      setRect(null);
    },
    [tourId]
  );

  const requestAutoStart = useCallback(
    (id: string) => {
      if (startedRef.current.has(id)) return;
      startedRef.current.add(id);
      if (isTourDismissed(id)) return;
      begin(id);
    },
    [begin]
  );

  const replay = useCallback(
    (id: string) => {
      resetTour(id);
      begin(id);
    },
    [begin]
  );

  useEffect(() => {
    if (!tourId || steps.length === 0) return;
    const current = steps[stepIndex];
    if (!current) return;

    let cancelled = false;
    current.el.scrollIntoView({ behavior: "smooth", block: "center" });

    function measure() {
      if (cancelled) return;
      setRect(current.el.getBoundingClientRect());
    }
    const t = setTimeout(measure, 260);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [tourId, steps, stepIndex]);

  useEffect(() => {
    if (!tourId) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") finish("skipped");
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tourId, finish]);

  const current = tourId ? steps[stepIndex] : null;

  return (
    <TourContext.Provider value={{ requestAutoStart, replay }}>
      {children}
      {typeof document !== "undefined" &&
        tourId &&
        current &&
        rect &&
        createPortal(
          <TourOverlay
            rect={rect}
            title={current.title}
            body={current.body}
            stepIndex={stepIndex}
            totalSteps={steps.length}
            onNext={() => {
              if (stepIndex + 1 >= steps.length) finish("completed");
              else setStepIndex((i) => i + 1);
            }}
            onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
            onSkip={() => finish("skipped")}
          />,
          document.body
        )}
    </TourContext.Provider>
  );
}

export function GuidedTour({ tourId, autoStart }: { tourId: string; autoStart: boolean }) {
  const ctx = useGuidedTourContext();
  useEffect(() => {
    if (autoStart && ctx) ctx.requestAutoStart(tourId);
  }, [autoStart, tourId, ctx]);
  return null;
}
