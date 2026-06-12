import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Reveal } from "@/components/motion";
import { SimulationsClient } from "@/components/simulations-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { TaxScenarioLab } from "@/components/v2/tax-scenario-lab";
import { TaxRunsPanel } from "@/components/v2/tax-runs-panel";
import {
  CalculationBreakdown,
  SimulationAuditSummary,
  SimulationCatalog,
} from "@/components/v2-6/cabinet-refonte";
import { LabSteps } from "@/components/v3-5/lab-steps";
import { getSimulationByParam } from "@/lib/cabinet-refonte/v2-6";
import { demoAuditTrail } from "@/lib/demo-data/audit";
import { demoHousehold } from "@/lib/demo-data/household";
import {
  isLabScenario,
  taxRunScenarioByLab,
  type LabScenario,
} from "@/lib/simulations/lab-scenarios";
import { calculateIfi } from "@/lib/simulations/ifi";
import { getAllTaxRuns } from "@/lib/tax/engines";

type SimulationsLabPageProps = {
  searchParams?: Promise<{
    scenario?: string;
    from?: string;
  }>;
};

export default async function SimulationsLabPage({ searchParams }: SimulationsLabPageProps) {
  const params = (await searchParams) ?? {};
  const catalogItem = getSimulationByParam(params.scenario) ?? getSimulationByParam("plus-value");
  const requestedScenario = catalogItem?.scenarioParam ?? "plus-value";
  const activeScenario: LabScenario = isLabScenario(requestedScenario)
    ? requestedScenario
    : "plus-value";
  const ifiRun = calculateIfi(demoHousehold);
  const taxRuns = getAllTaxRuns();
  const activeTaxRun =
    taxRuns.find((run) => run.scenario === taxRunScenarioByLab[activeScenario]) ??
    taxRuns.find((run) => run.scenario === "plus-value");

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Laboratoire expert"
          title="Simuler"
          lead="Catalogue de scénarios déterministes, moteur paramétrable et preuves affichées avant toute conclusion. Chaque simulation reste indicative et revue par un professionnel."
        />

        <SimulationCatalog activeScenario={activeScenario} />

        {catalogItem ? <SimulationContext {...catalogItem} /> : null}
        <LabSteps />
        <SimulationAuditSummary item={catalogItem} />
        <Reveal>
          <Suspense fallback={<Card>Chargement du laboratoire…</Card>}>
            <TaxScenarioLab
              initialScenario={activeScenario}
              catalogContext={
                catalogItem
                  ? { hypothesis: catalogItem.hypothesis, reviewGate: catalogItem.reviewGate }
                  : undefined
              }
            />
          </Suspense>
        </Reveal>
        {activeTaxRun ? <CalculationBreakdown run={activeTaxRun} /> : null}

        <Reveal>
          <Card elevated>
            <Accordion type="single" collapsible>
              <AccordionItem value="more">
                <AccordionTrigger>Voir les autres moteurs et historiques</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-2">
                    <TaxRunsPanel runs={taxRuns} />
                    <SimulationsClient ifiRun={ifiRun} initialAudit={demoAuditTrail} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </Reveal>
      </div>
    </AppShell>
  );
}

function SimulationContext({
  label,
  userFacingExplanation,
  status,
  reviewGate,
}: NonNullable<ReturnType<typeof getSimulationByParam>>) {
  return (
    <Reveal>
      <Card accent elevated>
        <CardHeader className="mb-0">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="teal" dot>
                Scénario actif
              </Badge>
              <Badge tone="warning">{status}</Badge>
            </div>
            <CardEyebrow>Contexte chargé</CardEyebrow>
            <CardTitle className="mt-1">{label}</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{userFacingExplanation}</p>
            <p className="mt-3 text-sm font-medium text-foreground">{reviewGate}</p>
          </div>
        </CardHeader>
      </Card>
    </Reveal>
  );
}
