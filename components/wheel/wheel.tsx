"use client";

export interface WheelSegmentInput {
  id: string;
  label: string;
  color: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

export function Wheel({
  segments,
  rotationDeg = 0,
  size = 280,
  transitionMs,
  spinning = false,
}: {
  segments: WheelSegmentInput[];
  rotationDeg?: number;
  size?: number;
  transitionMs?: number;
  spinning?: boolean;
}) {
  const n = Math.max(segments.length, 1);
  const sliceAngle = 360 / n;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  return (
    <div
      className={`relative inline-block rounded-full ${spinning ? "wheel-spinning-glow" : ""}`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
        style={{
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "16px solid var(--brand-accent)",
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: `rotate(${rotationDeg}deg)`,
          transition: transitionMs ? `transform ${transitionMs}ms cubic-bezier(0.08, 0.9, 0.05, 1)` : undefined,
        }}
      >
        <circle cx={cx} cy={cy} r={r + 3} fill="var(--brand-border)" />
        {segments.length === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="var(--brand-surface-raised)" />
        ) : segments.length === 1 ? (
          <g>
            <circle cx={cx} cy={cy} r={r} fill={segments[0].color} stroke="var(--brand-bg)" strokeWidth={1} />
            <text
              x={cx}
              y={cy}
              fill="#fff"
              fontSize={size * 0.036}
              fontWeight={600}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {segments[0].label.length > 16 ? `${segments[0].label.slice(0, 15)}…` : segments[0].label}
            </text>
          </g>
        ) : (
          segments.map((segment, i) => {
            const start = i * sliceAngle;
            const end = start + sliceAngle;
            const mid = start + sliceAngle / 2;

            // Orient the label along the wedge's own radius (center -> rim) instead of
            // tangentially, so labels don't overlap in concentric rings on wide wheels.
            const outwardAngle = mid - 90;
            const normalized = ((outwardAngle % 360) + 360) % 360;
            const flip = normalized > 90 && normalized < 270;
            const rotation = flip ? outwardAngle + 180 : outwardAngle;
            const labelPos = flip
              ? polarToCartesian(cx, cy, r * 0.88, mid)
              : polarToCartesian(cx, cy, r * 0.22, mid);

            return (
              <g key={segment.id}>
                <path d={describeSlice(cx, cy, r, start, end)} fill={segment.color} stroke="var(--brand-bg)" strokeWidth={1} />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill="#fff"
                  fontSize={size * 0.032}
                  fontWeight={600}
                  textAnchor={flip ? "end" : "start"}
                  dominantBaseline="middle"
                  transform={`rotate(${rotation}, ${labelPos.x}, ${labelPos.y})`}
                >
                  {segment.label.length > 16 ? `${segment.label.slice(0, 15)}…` : segment.label}
                </text>
              </g>
            );
          })
        )}
        <circle cx={cx} cy={cy} r={size * 0.06} fill="var(--brand-bg)" stroke="var(--brand-accent)" strokeWidth={2} />
      </svg>
    </div>
  );
}
