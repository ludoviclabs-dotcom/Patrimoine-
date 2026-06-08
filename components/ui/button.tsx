import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--surface-strong)] text-white shadow-[var(--shadow-sm)] hover:brightness-110",
  accent:
    "bg-[var(--gold)] text-[#241806] shadow-[var(--shadow-sm)] hover:brightness-105",
  secondary:
    "border border-border bg-white text-foreground hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]",
  ghost: "text-muted hover:bg-[var(--surface-soft)] hover:text-foreground",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--r-md)] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
