"use client";

import type { ReactNode } from "react";
import { Spotlight } from "@/components/motion";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  as = "h2",
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  as?: "h1" | "h2";
  children?: ReactNode;
  className?: string;
}) {
  const Title = as;
  return (
    <Spotlight
      className={cn(
        "rounded-[var(--r-xl)] border border-border bg-[var(--bg-tint)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-9 sm:py-11",
        className,
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-strong)]">
              {eyebrow}
            </p>
          ) : null}
          <Title className="mt-3 font-serif text-3xl font-semibold tracking-[-0.015em] text-foreground sm:text-[2.6rem] sm:leading-[1.05]">
            {title}
          </Title>
          {lead ? <p className="mt-4 text-base leading-7 text-muted">{lead}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children}
    </Spotlight>
  );
}
