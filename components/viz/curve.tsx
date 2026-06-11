/**
 * Courbes multi-séries en SVG pur (pas de dépendance graphique).
 * Couleurs via CSS vars → dark mode et impression sûrs.
 * Usages v3 : abattements plus-value par durée, projections patrimoniales.
 */

export type CurvePoint = { x: number; y: number };
export type CurveSeries = { label: string; color: string; points: CurvePoint[] };

export function Curve({
  series,
  height = 220,
  formatX = (value: number) => `${value}`,
  formatY = (value: number) => `${Math.round(value).toLocaleString("fr-FR")}`,
  className,
}: {
  series: CurveSeries[];
  height?: number;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  className?: string;
}) {
  const width = 640;
  const margin = { top: 14, right: 16, bottom: 30, left: 56 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const allPoints = series.flatMap((entry) => entry.points);
  const xValues = allPoints.map((point) => point.x);
  const yValues = allPoints.map((point) => point.y);
  const minX = Math.min(0, ...xValues);
  const maxX = Math.max(1, ...xValues);
  const minY = Math.min(0, ...yValues);
  const maxY = Math.max(1, ...yValues);

  const scaleX = (x: number) => margin.left + ((x - minX) / (maxX - minX || 1)) * chartWidth;
  const scaleY = (y: number) =>
    margin.top + chartHeight - ((y - minY) / (maxY - minY || 1)) * chartHeight;

  const yTicks = [minY, minY + (maxY - minY) / 2, maxY];
  const xTicks = [minX, minX + (maxX - minX) / 2, maxX];

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Courbe d'évolution"
        style={{ width: "100%", height: "auto" }}
      >
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={margin.left}
              y1={scaleY(tick)}
              x2={width - margin.right}
              y2={scaleY(tick)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={margin.left - 8}
              y={scaleY(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--muted)"
            >
              {formatY(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text
            key={`x-${tick}`}
            x={scaleX(tick)}
            y={height - 8}
            textAnchor="middle"
            fontSize={11}
            fill="var(--muted)"
          >
            {formatX(tick)}
          </text>
        ))}
        {series.map((entry) => {
          const sorted = [...entry.points].sort((a, b) => a.x - b.x);
          const path = sorted
            .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x)},${scaleY(point.y)}`)
            .join(" ");
          return (
            <g key={entry.label}>
              <path d={path} fill="none" stroke={entry.color} strokeWidth={2.5} strokeLinejoin="round" />
              {sorted.map((point) => (
                <circle
                  key={`${entry.label}-${point.x}`}
                  cx={scaleX(point.x)}
                  cy={scaleY(point.y)}
                  r={3}
                  fill={entry.color}
                >
                  <title>{`${entry.label} — ${formatX(point.x)} : ${formatY(point.y)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      {series.length > 1 ? (
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {series.map((entry) => (
            <span key={entry.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                style={{
                  background: entry.color,
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  display: "inline-block",
                }}
              />
              {entry.label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
