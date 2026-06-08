import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "teal";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-[var(--surface-soft)] text-muted",
  success: "border-transparent bg-[var(--success-soft)] text-[var(--success)]",
  warning: "border-transparent bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "border-transparent bg-[var(--danger-soft)] text-[var(--danger)]",
  teal: "border-transparent bg-[var(--accent-soft)] text-[var(--accent)]",
};

const dotClasses: Record<BadgeTone, string> = {
  neutral: "bg-[var(--muted-2)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  teal: "bg-[var(--accent)]",
};

export function Badge({
  className,
  tone = "neutral",
  dot = false,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium leading-none",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])}
        />
      )}
      {children}
    </span>
  );
}
