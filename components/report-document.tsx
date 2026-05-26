import { CalculationSteps } from "@/components/calculation-steps";
import { Badge } from "@/components/ui/badge";
import { CoverageLimitsPanel } from "@/components/v1-1/coverage-limits-panel";
import { MeetingBrief } from "@/components/v1-1/meeting-brief";
import { evidenceSources } from "@/lib/evidence/sources";
import { formatEuro } from "@/lib/format";
import { meetingBriefs, scenarioComparisons } from "@/lib/scenario-comparisons/comparisons";
import type { AllocationItem } from "@/lib/demo-data/metrics";
import type { Household } from "@/lib/types";

export function ReportDocument({
  household,
  summary,
  ifiRun,
}: {
  household: Household;
  summary: {
    grossWealth: number;
    totalDebt: number;
    netWealth: number;
    liquidity: number;
    allocation: AllocationItem[];
    limits: string;
    openQuestions: string[];
  };
  ifiRun: {
    result: {
      taxableBase: number | null;
      threshold: number;
      message: string;
    };
    steps: Parameters<typeof CalculationSteps>[0]["steps"];
  };
}) {
  return (
    <div className="print-page space-y-6 rounded-lg border border-border bg-white p-6 shadow-[var(--shadow)]">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Rapport Patrimoine & Fiscalite
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{household.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {household.profile} - {household.fiscalResidence} - {household.children} enfants
          </p>
          <p className="mt-2 font-mono text-xs text-muted">
            Version regles IFI-2026.03 - simulation 26/05/2026 - valide par : non valide
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="warning">Statut indicatif</Badge>
          <Badge tone="danger">Non valide</Badge>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Synthese executive</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Plateforme de simulation, preparation de dossier et validation professionnelle. Aucun
          conseil fiscal ou juridique definitif n&apos;est rendu par ce rapport.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Patrimoine brut" value={formatEuro(summary.grossWealth)} />
          <Metric label="Dettes" value={formatEuro(summary.totalDebt)} />
          <Metric label="Patrimoine net" value={formatEuro(summary.netWealth)} />
          <Metric label="Liquidite" value={formatEuro(summary.liquidity)} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Profil foyer</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Metric label="Foyer" value={household.name} />
          <Metric label="Contexte" value={household.professionalContext} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Cartographie patrimoniale</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {summary.allocation.map((item) => (
            <Metric
              key={item.label}
              label={item.label}
              value={`${((item.value / summary.grossWealth) * 100).toFixed(1)} %`}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-base font-semibold text-amber-950">4. Hypotheses et limites</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">{summary.limits}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Scenarios simules</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {scenarioComparisons.map((scenario) => (
            <div key={scenario.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{scenario.label}</p>
              <p className="mt-2 font-mono text-base font-semibold text-foreground">
                {formatEuro(scenario.netWealthEstimate)}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">
                Validation : {scenario.requiredValidation}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Resultats IFI</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric label="Base simplifiee" value={formatEuro(ifiRun.result.taxableBase ?? 0)} />
          <Metric label="Seuil d'alerte" value={formatEuro(ifiRun.result.threshold)} />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{ifiRun.result.message}</p>
      </section>

      <CalculationSteps steps={ifiRun.steps} />

      <section>
        <h2 className="text-lg font-semibold text-foreground">7. Sources officielles</h2>
        <div className="mt-3 grid gap-3">
          {evidenceSources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border p-3 text-sm transition hover:bg-[var(--surface-soft)]"
            >
              <span className="font-semibold text-foreground">{source.title}</span>
              <span className="mt-1 block font-mono text-xs text-muted">
                {source.sourceVersion} - {source.checkedAt} - {source.status}
              </span>
            </a>
          ))}
        </div>
      </section>

      <CoverageLimitsPanel module="ifi" />

      <section>
        <h2 className="text-lg font-semibold text-foreground">9. Questions professionnel</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
          {summary.openQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>

      <MeetingBrief briefs={meetingBriefs.slice(0, 2)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
