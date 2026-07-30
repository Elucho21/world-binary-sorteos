"use client";

export function CountdownOverlay({ value }: { value: 3 | 2 | 1 | 0 }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <div
        key={value}
        className="countdown-digit flex h-24 w-24 items-center justify-center rounded-full border-4 border-brand-accent bg-brand-bg/95 text-4xl font-bold text-brand-accent shadow-xl"
      >
        {value === 0 ? "¡Ya!" : value}
      </div>
    </div>
  );
}
