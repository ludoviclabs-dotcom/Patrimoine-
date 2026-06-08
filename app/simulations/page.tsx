import { AppShell } from "@/components/app-shell";
import { SimulationsClient } from "@/components/simulations-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getV2TaxRuns } from "@/lib/tax/v2-engines";
import type { TaxRun } from "@/lib/types";

type SimulationsPageProps = {
  searchParams?: Promise<{
    scenario?: string;
    from?: string;
  }>;
};

const labScenarios = new Set<LabScenario>([
  "plus-value",
  "transmission",
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
  "plus-value": "plus-value",
  transmission: "transmission",
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
  const taxRuns = getV2TaxRuns();
  const activeTaxRun =
    taxRuns.find((run) => run.scenario === taxRunScenarioByLab[activeScenario]) ??
    taxRuns.find((run) => run.scenario === "plus-value");

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Simuler</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Catalogue de scénarios déterministes, moteur paramétrable et preuves affichées avant
            toute conclusion. Chaque simulation reste indicative et revue par un professionnel.
          </p>
        </div>

        <SimulationCatalog activeScenario={activeScenario} />

        {catalogItem ? <SimulationContext {...catalogItem} /> : null}
        <SimulationAuditSummary item={catalogItem} />
        <TaxScenarioLab initialScenario={activeScenario} />
        {activeTaxRun ? <CalculationBreakdown run={activeTaxRun} /> : null}

        <details className="rounded-lg border border-border bg-white p-5">
          <summary className="cursor-pointer text-base font-semibold text-foreground">
            Voir les autres moteurs et historiques
          </summary>
          <div className="mt-5 space-y-6">
            <TaxRunsPanel runs={taxRuns} />
            <SimulationsClient ifiRun={ifiRun} initialAudit={demoAuditTrail} />
          </div>
        </details>
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
    <Card>
      <CardHeader className="mb-0">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="teal">Scénario actif</Badge>
            <Badge tone="warning">{status}</Badge>
          </div>
          <CardTitle>{label}</CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{userFacingExplanation}</p>
          <p className="mt-3 text-sm font-medium text-foreground">{reviewGate}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
