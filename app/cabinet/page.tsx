import { AppShell } from "@/components/app-shell";
import { AtlasCockpitEntry } from "@/components/atlas-fiscal/atlas-cockpit-entry";
import { CompletenessScorePanel } from "@/components/v1-1/completeness-score-panel";
import { CoverageLimitsPanel } from "@/components/v1-1/coverage-limits-panel";
import { DataQualityPanel } from "@/components/v1-1/data-quality-panel";
import { PersonaLibrary } from "@/components/v1-1/persona-library";
import { PatrimonialTimeline } from "@/components/v1-1/patrimonial-timeline";
import { RuleDiffPanel } from "@/components/v1-1/rule-diff-panel";
import { RiskRadar } from "@/components/v1-1/risk-radar";
import { SecurityBoard } from "@/components/v1-2/security-board";
import { CabinetHero } from "@/components/v2/cabinet-hero";
import { GoToMarketPanel } from "@/components/v2/go-to-market-panel";
import { AuditEvidencePanel } from "@/components/v2-2/audit-evidence-panel";
import { MaturityMatrixPanel } from "@/components/v2-2/maturity-matrix-panel";
import { demoPersonas } from "@/lib/demo-data/personas";
import { patrimonialTimeline, riskRadarItems } from "@/lib/scenario-comparisons/comparisons";

export default function CabinetPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <CabinetHero />
        <AtlasCockpitEntry />

        <section aria-labelledby="guided-flow-title" className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              Flux principal
            </p>
            <h2 id="guided-flow-title" className="mt-2 text-2xl font-bold text-foreground">
              Qualification → Hypothèses → Simulation → Preuves → Rapport
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              La page suit maintenant la discussion d&apos;un rendez-vous cabinet : d&apos;abord
              l&apos;état du dossier, ensuite l&apos;alerte fiscale, puis les limites et les preuves
              qui justifient la revue humaine.
            </p>
          </div>
        </section>

        <section aria-labelledby="qualification-title" className="space-y-4">
          <div>
            <h2 id="qualification-title" className="text-xl font-bold text-foreground">
              1. Qualifier le dossier et les hypothèses
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Le conseiller voit tout de suite ce qui est utilisable et ce qui reste à contrôler
              avant une simulation partageable.
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <CompletenessScorePanel />
            <DataQualityPanel />
          </div>
        </section>

        <section aria-labelledby="pfu-proof-title" className="space-y-4">
          <div>
            <h2 id="pfu-proof-title" className="text-xl font-bold text-foreground">
              2. Comprendre l&apos;alerte PFU 2026
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Le passage de 30 % à 31,4 % reste le scénario phare : une source change, une règle
              est versionnée, un dossier est impacté et un recalcul devient obligatoire.
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <RuleDiffPanel />
            <AuditEvidencePanel />
          </div>
        </section>

        <section aria-labelledby="limits-title" className="space-y-4">
          <div>
            <h2 id="limits-title" className="text-xl font-bold text-foreground">
              3. Montrer les limites avant le rapport
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Les exceptions, les points de vigilance et les zones hors couverture restent visibles
              avant toute note de simulation.
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <CoverageLimitsPanel module="ifi" />
            <RiskRadar items={riskRadarItems} />
          </div>
        </section>

        <section aria-labelledby="foundations-title" className="space-y-6 border-t border-border pt-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              Fondations prêtes
            </p>
            <h2 id="foundations-title" className="mt-2 text-2xl font-bold text-foreground">
              Preuves institutionnelles et préparation pilote
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Les panneaux plus techniques restent disponibles, mais ils passent après le fil de
              rendez-vous pour ne pas brouiller la première lecture.
            </p>
          </div>
          <SecurityBoard />
          <MaturityMatrixPanel />
          <PatrimonialTimeline events={patrimonialTimeline} />
          <GoToMarketPanel />
          <PersonaLibrary personas={demoPersonas} />
        </section>
      </div>
    </AppShell>
  );
}
