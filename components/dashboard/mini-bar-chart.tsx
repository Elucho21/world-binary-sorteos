interface BarDatum {
  label: string;
  value: number;
}

export function MiniBarChart({ data, height = 140 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = data.length > 0 ? 100 / data.length : 100;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-32 w-full">
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 20);
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={height - 20 - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              rx={1}
              fill="var(--brand-primary)"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex text-[10px] text-brand-muted">
        {data.map((d, i) => (
          <div key={i} style={{ width: `${barWidth}%` }} className="truncate text-center">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
