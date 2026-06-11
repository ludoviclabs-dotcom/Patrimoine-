import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingBrief } from "@/components/v1-1/meeting-brief";
import { PatrimonialTimeline } from "@/components/v1-1/patrimonial-timeline";
import { RiskRadar } from "@/components/v1-1/risk-radar";
import { ScenarioComparator } from "@/components/v1-1/scenario-comparator";
import { ProjectionPanel } from "@/components/v3-3/projection-panel";
import { deadlinesAsTimelineEvents } from "@/lib/calendar/fiscal-deadlines";
import { getScenarioNetWealthEstimates } from "@/lib/projections/wealth-projection";
import {
  meetingBriefs,
  patrimonialTimeline,
  riskRadarItems,
  scenarioComparisons,
} from "@/lib/scenario-comparisons/comparisons";

type ScenariosPageProps = {
  searchParams?: Promise<{
    stress?: string;
    from?: string;
  }>;
};

const atlasStressContexts: Record<string, { title: string; description: string }> = {
  dette: {
    title: "Contexte Atlas : charge de la dette",
    description:
      "Le comparateur sert ici à regarder les arbitrages de long terme : fiscalité future, effort public, patrimoine et liquidité.",
  },
  administration: {
    title: "Contexte Atlas : fonctionnement administratif",
    description:
      "Le stress porte sur la lisibilité et le coût de conformité : documents, preuves et validation humaine deviennent centraux.",
  },
  transition: {
    title: "Contexte Atlas : transition et environnement",
    description:
      "Le scénario rappelle que certaines dépenses financent des arbitrages futurs plutôt qu'un bénéfice immédiat.",
  },
};

export default async function ScenariosPage({ searchParams }: ScenariosPageProps) {
  const params = (await searchParams) ?? {};
  const atlasContext = params.from === "atlas" && params.stress ? atlasStressContexts[params.stress] : null;
  // Estimations calculées par le moteur de projection (fixtures en fallback).
  const estimates = getScenarioNetWealthEstimates(10);
  const computedScenarios = scenarioComparisons.map((scenario) => {
    if (scenario.id === "scenario-do-nothing")
      return { ...scenario, netWealthEstimate: estimates["statu-quo"] };
    if (scenario.id === "scenario-simple-donation")
      return { ...scenario, netWealthEstimate: estimates.donation };
    if (scenario.id === "scenario-partial-sale-reallocation")
      return { ...scenario, netWealthEstimate: estimates.cession };
    return scenario;
  });
  const timelineWithDeadlines = [...patrimonialTimeline, ...deadlinesAsTimelineEvents()].sort(
    (a, b) => a.year.localeCompare(b.year),
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Comparateur de scenarios</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Vue rendez-vous : arbitrages visibles, documents requis et validation humaine, sans
            recommandation automatique. Les estimations de patrimoine net sont désormais calculées
            par le moteur de projection (horizon 10 ans).
          </p>
        </section>
        {atlasContext ? <AtlasScenarioContext {...atlasContext} /> : null}
        <ProjectionPanel years={10} />
        <ScenarioComparator scenarios={computedScenarios} />
        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <RiskRadar items={riskRadarItems} />
          <PatrimonialTimeline events={timelineWithDeadlines} />
        </section>
        <MeetingBrief briefs={meetingBriefs} />
      </div>
    </AppShell>
  );
}

function AtlasScenarioContext({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="mb-0">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="teal">Depuis l&apos;Atlas</Badge>
            <Badge tone="neutral">Scénario de lecture</Badge>
          </div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
