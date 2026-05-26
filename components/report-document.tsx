import { CalculationSteps } from "@/components/calculation-steps";
import { Badge } from "@/components/ui/badge";
import { evidenceSources } from "@/lib/evidence/sources";
import { formatEuro } from "@/lib/format";
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
            Rapport Patrimoine & Fiscalité
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{household.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {household.profile} · {household.fiscalResidence} · {household.children} enfants
          </p>
        </div>
        <Badge tone="warning">Analyse indicative</Badge>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Synthèse</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Patrimoine brut" value={formatEuro(summary.grossWealth)} />
          <Metric label="Dettes" value={formatEuro(summary.totalDebt)} />
          <Metric label="Patrimoine net" value={formatEuro(summary.netWealth)} />
          <Metric label="Liquidité" value={formatEuro(summary.liquidity)} />
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-base font-semibold text-amber-950">Limites</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">{summary.limits}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Simulation IFI</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric label="Base simplifiée" value={formatEuro(ifiRun.result.taxableBase ?? 0)} />
          <Metric label="Seuil d’alerte" value={formatEuro(ifiRun.result.threshold)} />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{ifiRun.result.message}</p>
      </section>

      <CalculationSteps steps={ifiRun.steps} />

      <section>
        <h2 className="text-lg font-semibold text-foreground">Questions ouvertes</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
          {summary.openQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Sources utilisées</h2>
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
              <span className="mt-1 block font-mono text-xs text-muted">{source.checkedAt}</span>
            </a>
          ))}
        </div>
      </section>
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
