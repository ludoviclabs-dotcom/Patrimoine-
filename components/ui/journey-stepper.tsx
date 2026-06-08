"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type JourneyStep = {
  label: string;
  caption?: string;
  href: string;
};

export function JourneyStepper({
  steps,
  current = 0,
  className,
}: {
  steps: JourneyStep[];
  current?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="absolute left-[10%] right-[10%] top-5 hidden h-[2px] bg-border md:block"
      >
        <motion.div
          className="h-full rounded-full bg-[var(--gold)]"
          initial={{ width: reduce ? `${pct}%` : 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <ol className="relative grid gap-6 md:grid-cols-5">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={`${step.href}-${index}`}>
              <Link
                href={step.href}
                className="group flex flex-col items-center gap-3 text-center"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition",
                    done
                      ? "border-[var(--gold)] bg-[var(--gold)] text-[#241806]"
                      : active
                        ? "border-[var(--gold)] bg-[var(--surface)] text-[var(--gold-strong)] shadow-[0_0_0_4px_var(--gold-soft)]"
                        : "border-border bg-[var(--surface)] text-muted",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground transition group-hover:text-[var(--accent)]">
                    {step.label}
                  </span>
                  {step.caption ? (
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {step.caption}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
