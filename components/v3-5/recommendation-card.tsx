import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TierBadge } from "@/components/v3-5/tier-badge";
import { getSimulationByParam } from "@/lib/cabinet-refonte/v2-6";
import type { ScenarioRecommendation } from "@/lib/simulations/intentions";

const priorityLabels: Record<ScenarioRecommendation["priority"], string> = {
  prioritaire: "Prioritaire",
  "a-verifier": "À vérifier",
  complementaire: "Complémentaire",
};

const priorityTones: Record<ScenarioRecommendation["priority"], "success" | "warning" | "neutral"> = {
  prioritaire: "success",
  "a-verifier": "warning",
  complementaire: "neutral",
};

/**
 * Carte de scénario recommandé : pourquoi proposé, ce qu'il calcule, ce qu'il
 * ne conclut pas seul, qui valide. Les métadonnées viennent du
 * simulationCatalog (source unique) — seule la phrase « pourquoi » est propre
 * à l'intention.
 */
export function RecommendationCard({ recommendation }: { recommendation: ScenarioRecommendation }) {
  const item = getSimulationByParam(recommendation.scenarioParam);
  if (!item) return null;

  return (
    <Card interactive className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={priorityTones[recommendation.priority]} dot>
          {priorityLabels[recommendation.priority]}
        </Badge>
        <TierBadge status={item.status} />
      </div>
      <h3 className="mt-3 font-serif text-lg font-semibold text-foreground">{item.label}</h3>
      <p className="mt-2 text-sm leading-6 text-foreground">{recommendation.pourquoi}</p>

      <dl className="mt-4 flex-1 space-y-3 border-t border-border pt-4">
        <Facet label="Ce qu'il calcule">{item.userFacingExplanation}</Facet>
        <Facet label="Ce qu'il ne conclut pas seul">{item.limit}</Facet>
        <Facet label="Qui valide">{item.reviewGate}</Facet>
      </dl>

      <Link
        href={`/simulations/lab?scenario=${item.scenarioParam}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:gap-3"
      >
        Lancer cette simulation
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Card>
  );
}

function Facet({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-muted">{children}</dd>
    </div>
  );
}
