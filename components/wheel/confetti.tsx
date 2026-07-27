"use client";

import { useState } from "react";

const COLORS = ["var(--brand-accent)", "var(--brand-primary)", "#ffffff", "#F5B400", "#22C55E"];

interface Particle {
  left: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
  rotate: number;
}

export function Confetti({ count = 60 }: { count?: number }) {
  // Lazy initializer: computed once on mount, never re-derived during
  // render, so the "one random burst" here is fine (same pattern React
  // recommends for one-time random/id generation in useState).
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 6,
      duration: 2.2 + Math.random() * 1.6,
      delay: Math.random() * 0.4,
      rotate: Math.random() * 360,
    }))
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="confetti-particle absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
