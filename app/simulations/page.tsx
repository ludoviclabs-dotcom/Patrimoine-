import { AppShell } from "@/components/app-shell";
import { SimulationsClient } from "@/components/simulations-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TaxScenarioLab, type LabScenario } from "@/components/v2/tax-scenario-lab";
import { TaxRunsPanel } from "@/components/v2/tax-runs-panel";
import { demoAuditTrail } from "@/lib/demo-data/audit";
import { demoHousehold } from "@/lib/demo-data/household";
import { calculateIfi } from "@/lib/simulations/ifi";
import { getV2TaxRuns } from "@/lib/tax/v2-engines";

type SimulationsPageProps = {
  searchParams?: Promise<{
    scenario?: string;
    from?: string;
  }>;
};

const atlasSimulationContexts: Record<
  string,
  {
    title: string;
    description: string;
    initialScenario: LabScenario;
    badge: string;
  }
> = {
  "entreprise-cash": {
    title: "Contexte Atlas : PME industrielle",
    description:
      "Le simulateur démarre sur Dutreil faute de moteur cash entreprise dédié en V1 ; le bandeau garde le fil CA → charges → impôts → trésorerie.",
    initialScenario: "dutreil",
    badge: "Depuis l'Atlas",
  },
  "holding-tax": {
    title: "Contexte Atlas : dirigeant holding",
    description:
      "Le laboratoire ouvre directement la taxe holding pour relier dividendes, actifs passifs et revue professionnelle.",
    initialScenario: "holding-tax",
    badge: "Depuis l'Atlas",
  },
  transmission: {
    title: "Contexte Atlas : transmission",
    description:
      "Le laboratoire cible la transmission pour passer du mécanisme patrimonial aux étapes de calcul documentées.",
    initialScenario: "transmission",
    badge: "Depuis l'Atlas",
  },
  "pea-withdrawal": {
    title: "Contexte V2.3 : retrait PEA",
    description:
      "Le laboratoire distingue impôt sur le revenu, prélèvements sociaux et effet de clôture dans un cas PEA après cinq ans.",
    initialScenario: "pea",
    badge: "Parcours V2.3",
  },
  "per-deduction": {
    title: "Contexte V2.3 : déduction PER",
    description:
      "Le laboratoire calcule la déduction utilisée à partir du plafond disponible, des reliquats et de la mutualisation.",
    initialScenario: "per",
    badge: "Parcours V2.3",
  },
  "bank-import": {
    title: "Contexte V2.3 : import bancaire simulé",
    description:
      "Aucun connecteur réel n'est branché : le scénario illustre consentement, SCA, détection d'enveloppes et alertes.",
    initialScenario: "bank-import",
    badge: "Parcours V2.3",
  },
};

export default async function SimulationsPage({ searchParams }: SimulationsPageProps) {
  const params = (await searchParams) ?? {};
  const atlasContext = params.scenario ? atlasSimulationContexts[params.scenario] : null;
  const ifiRun = calculateIfi(demoHousehold);
  const taxRuns = getV2TaxRuns();

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Simulations fiscales cabinet</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Moteur déterministe, étapes de calcul, sources officielles et validation
            professionnelle pour IFI, IR/PFU/CDHR, transmission, Dutreil, apport-cession
            et taxe holding.
          </p>
        </div>
        {atlasContext ? <AtlasSimulationContext {...atlasContext} /> : null}
        <TaxScenarioLab initialScenario={atlasContext?.initialScenario} />
        <TaxRunsPanel runs={taxRuns} />
        <SimulationsClient ifiRun={ifiRun} initialAudit={demoAuditTrail} />
      </div>
    </AppShell>
  );
}

function AtlasSimulationContext({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <Card>
      <CardHeader className="mb-0">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="teal">{badge}</Badge>
            <Badge tone="warning">Simulation indicative</Badge>
          </div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
