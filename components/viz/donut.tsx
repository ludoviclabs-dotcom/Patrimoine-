"use client";

import { motion, useReducedMotion } from "motion/react";

export type DonutSegment = { label: string; value: number; color: string };

export function Donut({
  segments,
  size = 150,
  thickness = 16,
  centerLabel,
  centerValue,
  className,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const fractions = segments.map((segment) => segment.value / total);
  const startOffsets = fractions.map((_, index) =>
    fractions.slice(0, index).reduce((sum, fraction) => sum + fraction, 0),
  );

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
        {segments.map((segment, index) => {
          const length = fractions[index] * circumference;
          const offset = -startOffsets[index] * circumference;
          return (
            <motion.circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDashoffset={offset}
              initial={reduce ? undefined : { strokeDasharray: `0 ${circumference}` }}
              whileInView={{ strokeDasharray: `${length} ${circumference - length}` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={
                reduce
                  ? { strokeDasharray: `${length} ${circumference - length}` }
                  : undefined
              }
            />
          );
        })}
      </svg>
      {centerLabel || centerValue ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.1rem",
          }}
        >
          {centerValue ? (
            <span className="font-serif text-xl font-semibold text-foreground">{centerValue}</span>
          ) : null}
          {centerLabel ? (
            <span className="text-[0.66rem] uppercase tracking-[0.14em] text-muted">
              {centerLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
