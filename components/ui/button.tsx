import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--surface-strong)] text-white shadow-sm hover:bg-[#223029] focus-visible:outline-[var(--accent)]",
  secondary:
    "border border-border bg-white text-foreground hover:border-[#cbd6cf] hover:bg-[#f9fbf9] focus-visible:outline-[var(--accent)]",
  ghost:
    "text-muted hover:bg-[var(--surface-soft)] hover:text-foreground focus-visible:outline-[var(--accent)]",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
