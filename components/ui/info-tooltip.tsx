"use client";

import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const OpenTooltipContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
} | null>(null);

export function InfoTooltipProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return <OpenTooltipContext.Provider value={{ openId, setOpenId }}>{children}</OpenTooltipContext.Provider>;
}

function useOpenTooltip() {
  const ctx = useContext(OpenTooltipContext);
  // Falls back to local-only state if no provider is mounted, so a stray
  // InfoTooltip never crashes a page that forgot to wrap it.
  const [localOpenId, setLocalOpenId] = useState<string | null>(null);
  return ctx ?? { openId: localOpenId, setOpenId: setLocalOpenId };
}

type Align = "start" | "center" | "end";

export function InfoTooltip({
  label,
  children,
  align = "center",
  className,
}: {
  label: string;
  children: React.ReactNode;
  align?: Align;
  className?: string;
}) {
  const id = useId();
  const { openId, setOpenId } = useOpenTooltip();
  const open = openId === id;
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [resolvedAlign, setResolvedAlign] = useState<Align>(align);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenId(null);
        containerRef.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpenId]);

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      setResolvedAlign("end");
    } else if (rect.left < 8) {
      setResolvedAlign("start");
    } else {
      setResolvedAlign(align);
    }
  }, [open, align]);

  const alignClass =
    resolvedAlign === "start" ? "left-0" : resolvedAlign === "end" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <span ref={containerRef} className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpenId(open ? null : id)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-brand-muted transition-colors hover:text-brand-primary"
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={popoverRef}
          id={id}
          role="tooltip"
          className={cn(
            "absolute top-full z-50 mt-2 w-max max-w-[240px] rounded-lg border border-brand-border bg-brand-surface-raised p-3 text-xs leading-relaxed text-brand-muted shadow-lg sm:max-w-[280px]",
            alignClass
          )}
        >
          {children}
        </div>
      )}
    </span>
  );
}
