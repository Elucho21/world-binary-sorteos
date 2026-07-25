import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-brand-surface-raised text-brand-muted border-brand-border",
  success: "bg-brand-success/10 text-brand-success border-brand-success/30",
  warning: "bg-brand-accent/10 text-brand-accent border-brand-accent/30",
  danger: "bg-brand-danger/10 text-brand-danger border-brand-danger/30",
  accent: "bg-brand-primary/10 text-brand-primary border-brand-primary/30",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
