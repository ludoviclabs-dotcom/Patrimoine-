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
import { demoPersonas } from "@/lib/demo-data/personas";
import { patrimonialTimeline, riskRadarItems } from "@/lib/scenario-comparisons/comparisons";

export default function CabinetPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Portail cabinet V1.1</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Cockpit de simulation indicative, preparation de dossier, qualite de donnees,
            limites visibles et revue professionnelle. Aucune IA runtime ni donnee reelle.
          </p>
        </section>

        <CompletenessScorePanel />
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
            <h2 className="text-xl font-bold text-foreground">Moteurs metier V1.1</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Les scenarios restent indicatifs et produisent des etapes de calcul sourcees.
            </p>
          </div>
          <AdvancedSimulationsPanel />
        </section>

        <PersonaLibrary personas={demoPersonas} />
      </div>
    </AppShell>
  );
}
