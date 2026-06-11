/**
 * Barres groupées ou empilées en SVG pur (pas de dépendance graphique).
 * Couleurs via CSS vars → dark mode et impression sûrs.
 * Usages v3 : IR par tranche, PFU vs barème, SCI IR vs IS.
 */

export type BarDatum = { label: string; value: number; color: string };
export type BarGroup = { label: string; bars: BarDatum[] };

export function Bars({
  groups,
  stacked = false,
  height = 220,
  formatValue = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} €`,
  className,
}: {
  groups: BarGroup[];
  stacked?: boolean;
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const width = 640;
  const margin = { top: 26, right: 12, bottom: 34, left: 12 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const groupTotals = groups.map((group) =>
    stacked
      ? group.bars.reduce((sum, bar) => sum + Math.max(0, bar.value), 0)
      : Math.max(0, ...group.bars.map((bar) => bar.value)),
  );
  const maxValue = Math.max(1, ...groupTotals);
  const groupWidth = chartWidth / Math.max(1, groups.length);
  const scale = (value: number) => (Math.max(0, value) / maxValue) * chartHeight;

  const legendEntries = Array.from(
    new Map(groups.flatMap((group) => group.bars).map((bar) => [bar.label, bar.color])),
  );

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Comparaison en barres"
        style={{ width: "100%", height: "auto" }}
      >
        {groups.map((group, groupIndex) => {
          const groupX = margin.left + groupIndex * groupWidth;
          const innerWidth = groupWidth * 0.72;
          const innerX = groupX + (groupWidth - innerWidth) / 2;

          let stackOffset = 0;
          const barWidth = stacked ? innerWidth : innerWidth / Math.max(1, group.bars.length);

          return (
            <g key={group.label}>
              {group.bars.map((bar, barIndex) => {
                const barHeight = scale(bar.value);
                const x = stacked ? innerX : innerX + barIndex * barWidth;
                const y = stacked
                  ? margin.top + chartHeight - stackOffset - barHeight
                  : margin.top + chartHeight - barHeight;
                if (stacked) stackOffset += barHeight;

                return (
                  <rect
                    key={`${group.label}-${bar.label}`}
                    x={x + 1}
                    y={y}
                    width={Math.max(2, barWidth - 2)}
                    height={Math.max(0, barHeight)}
                    rx={3}
                    fill={bar.color}
                  >
                    <title>{`${group.label} — ${bar.label} : ${formatValue(bar.value)}`}</title>
                  </rect>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={margin.top + chartHeight - scale(groupTotals[groupIndex]) - 8}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill="var(--foreground)"
              >
                {formatValue(groupTotals[groupIndex])}
              </text>
              <text
                x={groupX + groupWidth / 2}
                y={height - 12}
                textAnchor="middle"
                fontSize={12}
                fill="var(--muted)"
              >
                {group.label}
              </text>
            </g>
          );
        })}
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={width - margin.right}
          y2={margin.top + chartHeight}
          stroke="var(--border)"
          strokeWidth={1}
        />
      </svg>
      {legendEntries.length > 1 ? (
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {legendEntries.map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                style={{ background: color, width: 10, height: 10, borderRadius: 3, display: "inline-block" }}
              />
              {label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
