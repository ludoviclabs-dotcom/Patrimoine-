import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Relief + ombre portée au survol. */
  interactive?: boolean;
  /** Liseré laiton vertical à gauche. */
  accent?: boolean;
  /** Ombre plus marquée au repos. */
  elevated?: boolean;
};

export function Card({
  className,
  interactive = false,
  accent = false,
  elevated = false,
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        "relative min-w-0 rounded-[var(--r-lg)] border border-border bg-white p-5 shadow-[var(--shadow-sm)]",
        elevated && "shadow-[var(--shadow)]",
        interactive &&
          "transition duration-300 ease-out hover:-translate-y-1 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-lg)]",
        accent &&
          "pl-6 before:absolute before:inset-y-5 before:left-0 before:w-[3px] before:rounded-full before:bg-[var(--gold)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "font-serif text-lg font-semibold tracking-[-0.01em] text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CardEyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--gold-strong)]",
        className,
      )}
      {...props}
    />
  );
}
