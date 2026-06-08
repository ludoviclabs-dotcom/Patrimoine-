"use client";

import { motion, useReducedMotion } from "motion/react";

export function ProgressRing({
  value,
  label,
  valueLabel,
  size = 120,
  thickness = 12,
  color = "var(--accent)",
  className,
}: {
  /** Ratio 0 → 1. */
  value: number;
  label?: string;
  valueLabel?: string;
  size?: number;
  thickness?: number;
  color?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const length = pct * circumference;

  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-soft)"
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          initial={reduce ? undefined : { strokeDasharray: `0 ${circumference}` }}
          whileInView={{ strokeDasharray: `${length} ${circumference - length}` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={reduce ? { strokeDasharray: `${length} ${circumference - length}` } : undefined}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {valueLabel ? (
          <span className="font-serif text-lg font-semibold text-foreground">{valueLabel}</span>
        ) : null}
        {label ? (
          <span className="text-[0.64rem] uppercase tracking-[0.14em] text-muted">{label}</span>
        ) : null}
      </div>
    </div>
  );
}
