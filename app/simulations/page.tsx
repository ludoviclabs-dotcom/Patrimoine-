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
import { TaxScenarioLab, type LabScenario } from "@/components/v2/tax-scenario-lab";
import { TaxRunsPanel } from "@/components/v2/tax-runs-panel";
import {
  CalculationBreakdown,
  SimulationAuditSummary,
  SimulationCatalog,
} from "@/components/v2-6/cabinet-refonte";
import { getSimulationByParam } from "@/lib/cabinet-refonte/v2-6";
import { demoAuditTrail } from "@/lib/demo-data/audit";
import { demoHousehold } from "@/lib/demo-data/household";
import { calculateIfi } from "@/lib/simulations/ifi";
import { getAllTaxRuns } from "@/lib/tax/engines";
import type { TaxRun } from "@/lib/types";

type SimulationsPageProps = {
  searchParams?: Promise<{
    scenario?: string;
    from?: string;
  }>;
};

const labScenarios = new Set<LabScenario>([
  "ir",
  "pfu",
  "plus-value",
  "transmission",
  "demembrement",
  "assurance-vie",
  "dutreil",
  "holding-tax",
  "pea",
  "per",
  "bank-import",
  "succession-checklist",
  "per-early-exit",
  "succession-liquidity-stress",
  "product-adequacy",
]);

const taxRunScenarioByLab: Record<LabScenario, TaxRun["scenario"]> = {
  ir: "ir",
  pfu: "pfu",
  "plus-value": "plus-value",
  transmission: "transmission",
  demembrement: "demembrement",
  "assurance-vie": "assurance-vie",
  dutreil: "dutreil",
  "holding-tax": "holding-tax",
  pea: "pea-withdrawal",
  per: "per-deduction",
  "bank-import": "bank-import",
  "succession-checklist": "succession-checklist",
  "per-early-exit": "per-early-exit",
  "succession-liquidity-stress": "succession-liquidity-stress",
  "product-adequacy": "product-adequacy",
};

export default async function SimulationsPage({ searchParams }: SimulationsPageProps) {
  const params = (await searchParams) ?? {};
  const catalogItem = getSimulationByParam(params.scenario) ?? getSimulationByParam("plus-value");
  const requestedScenario = catalogItem?.scenarioParam ?? "plus-value";
  const activeScenario: LabScenario = labScenarios.has(requestedScenario as LabScenario)
    ? (requestedScenario as LabScenario)
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
          eyebrow="Moteur déterministe"
          title="Simuler"
          lead="Catalogue de scénarios déterministes, moteur paramétrable et preuves affichées avant toute conclusion. Chaque simulation reste indicative et revue par un professionnel."
        />

        <SimulationCatalog activeScenario={activeScenario} />

        {catalogItem ? <SimulationContext {...catalogItem} /> : null}
        <SimulationAuditSummary item={catalogItem} />
        <Reveal>
          <TaxScenarioLab initialScenario={activeScenario} />
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
