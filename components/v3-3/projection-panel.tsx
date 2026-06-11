import { TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { Curve } from "@/components/viz/curve";
import { formatEuro } from "@/lib/format";
import {
  PROJECTION_SCENARIOS,
  projectNetWealth,
} from "@/lib/projections/wealth-projection";

const scenarioColors = ["var(--accent)", "var(--gold)", "var(--danger)"];

export function ProjectionPanel({ years = 10 }: { years?: number }) {
  const series = PROJECTION_SCENARIOS.map((scenario, index) => ({
    label: scenario.label,
    color: scenarioColors[index % scenarioColors.length],
    points: projectNetWealth({ scenario: scenario.id, years }).map((point) => ({
      x: point.year,
      y: point.netWealth,
    })),
  }));

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Projections chiffrées</CardEyebrow>
          <CardTitle className="mt-1">Patrimoine net à {years} ans</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Capitalisation déterministe par catégorie d&apos;actif (hypothèses = paramètres de la
            règle rule-projections-2026-v1). Aucune prévision de marché.
          </p>
        </div>
        <TrendingUp className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>
      <Curve
        series={series}
        formatX={(year) => `${year} an${year > 1 ? "s" : ""}`}
        formatY={(value) => formatEuro(value)}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {series.map((entry) => (
          <Badge key={entry.label}>
            {entry.label} → {formatEuro(entry.points.at(-1)?.y ?? 0)}
          </Badge>
        ))}
        <Badge tone="warning" dot>
          Indicatif — revue professionnelle requise
        </Badge>
      </div>
    </Card>
  );
}
