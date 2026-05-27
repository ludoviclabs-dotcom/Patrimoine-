import { AppShell } from "@/components/app-shell";
import { CompletenessScorePanel } from "@/components/v1-1/completeness-score-panel";
import { CoverageLimitsPanel } from "@/components/v1-1/coverage-limits-panel";
import { DataQualityPanel } from "@/components/v1-1/data-quality-panel";
import { PersonaLibrary } from "@/components/v1-1/persona-library";
import { PatrimonialTimeline } from "@/components/v1-1/patrimonial-timeline";
import { RiskRadar } from "@/components/v1-1/risk-radar";
import { SecurityBoard } from "@/components/v1-2/security-board";
import { CabinetHero } from "@/components/v2/cabinet-hero";
import { GoToMarketPanel } from "@/components/v2/go-to-market-panel";
import { InstitutionalProofOverview } from "@/components/v2-2/institutional-proof-overview";
import { MaturityMatrixPanel } from "@/components/v2-2/maturity-matrix-panel";
import { demoPersonas } from "@/lib/demo-data/personas";
import { patrimonialTimeline, riskRadarItems } from "@/lib/scenario-comparisons/comparisons";

export default function CabinetPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <CabinetHero />
        <InstitutionalProofOverview />

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
        <MaturityMatrixPanel />

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <DataQualityPanel />
          <RiskRadar items={riskRadarItems} />
        </section>

        <PatrimonialTimeline events={patrimonialTimeline} />

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <CoverageLimitsPanel module="ifi" />
          <div className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow)]">
            <h2 className="text-base font-semibold text-foreground">Preuve brute déplacée</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Le contrôle technique des sources, les contrats de persistance et les jeux de tests détaillés
              sont conservés sur les pages Preuves, Conformité et Rapports. Le cockpit affiche seulement
              les éléments actionnables en rendez-vous : diff PFU, impact dossier, audit et limites.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow)]">
          <h2 className="text-xl font-bold text-foreground">Simulations cabinet actionnables</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Les moteurs fiscaux détaillés, leurs étapes de calcul et les IDs de règles sont désormais
            concentrés dans l&apos;espace Simulations. Le cockpit reste une vue de rendez-vous : état du dossier,
            preuve PFU, audit, limites et prochaine action professionnelle.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["PFU / CDHR", "Dutreil dirigeant", "Taxe holding"].map((label) => (
              <a
                key={label}
                href="/simulations"
                className="rounded-lg border border-border bg-[var(--surface-soft)] p-4 text-sm font-semibold text-foreground transition hover:bg-white"
              >
                {label}
                <span className="mt-2 block text-sm font-normal leading-5 text-muted">
                  Voir le moteur, les preuves et les limites.
                </span>
              </a>
            ))}
          </div>
        </section>

        <GoToMarketPanel />
        <PersonaLibrary personas={demoPersonas} />
      </div>
    </AppShell>
  );
}
