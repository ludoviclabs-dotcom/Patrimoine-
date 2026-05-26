import { AdvancedSimulationsPanel } from "@/components/advanced-simulations-panel";
import { AppShell } from "@/components/app-shell";
import { V1StatusBoard } from "@/components/v1-status-board";
import { CompletenessScorePanel } from "@/components/v1-1/completeness-score-panel";
import { CoverageLimitsPanel } from "@/components/v1-1/coverage-limits-panel";
import { DataQualityPanel } from "@/components/v1-1/data-quality-panel";
import { PersonaLibrary } from "@/components/v1-1/persona-library";
import { PatrimonialTimeline } from "@/components/v1-1/patrimonial-timeline";
import { RiskRadar } from "@/components/v1-1/risk-radar";
import { SourceWatchPanel } from "@/components/v1-1/source-watch-panel";
import { SecurityBoard } from "@/components/v1-2/security-board";
import { CabinetHero } from "@/components/v2/cabinet-hero";
import { GoToMarketPanel } from "@/components/v2/go-to-market-panel";
import { ProfessionalDocumentsPanel } from "@/components/v2/professional-documents-panel";
import { TaxRunsPanel } from "@/components/v2/tax-runs-panel";
import { demoPersonas } from "@/lib/demo-data/personas";
import { patrimonialTimeline, riskRadarItems } from "@/lib/scenario-comparisons/comparisons";
import { generateProfessionalDocuments, getV2TaxRuns } from "@/lib/tax/v2-engines";

export default function CabinetPage() {
  const professionalDocuments = generateProfessionalDocuments();
  const taxRuns = getV2TaxRuns();

  return (
    <AppShell>
      <div className="space-y-8">
        <CabinetHero />

        <section>
          <h2 className="text-2xl font-bold text-foreground">Cockpit cabinet V2</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Copilote de conformité patrimoniale pour CGP, experts-comptables et fiscalistes :
            préparation de dossier, simulations indicatives, sources officielles et validation
            professionnelle.
          </p>
        </section>

        <CompletenessScorePanel />
        <SecurityBoard />
        <V1StatusBoard />

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <DataQualityPanel />
          <RiskRadar items={riskRadarItems} />
        </section>

        <PatrimonialTimeline events={patrimonialTimeline} />

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <CoverageLimitsPanel module="ifi" />
          <SourceWatchPanel />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Moteurs métier V2</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Les scénarios restent indicatifs et produisent des étapes de calcul sourcées.
            </p>
          </div>
          <TaxRunsPanel runs={taxRuns} />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Modules patrimoniaux complémentaires</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Donation, plus-value et SCI restent visibles comme annexes de travail.
            </p>
          </div>
          <AdvancedSimulationsPanel />
        </section>

        <ProfessionalDocumentsPanel documents={professionalDocuments} />
        <GoToMarketPanel />
        <PersonaLibrary personas={demoPersonas} />
      </div>
    </AppShell>
  );
}
