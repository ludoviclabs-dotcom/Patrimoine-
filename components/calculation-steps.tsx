import { Badge } from "@/components/ui/badge";
import { ReliabilityBadge } from "@/components/v1-1/reliability-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getEvidenceSource } from "@/lib/evidence/sources";
import { formatEuro } from "@/lib/format";
import { getRuleVersion } from "@/lib/rules/rule-versions";
import type { CalculationStep } from "@/lib/types";

function formatStepValue(value: number | string) {
  if (typeof value === "number") {
    return formatEuro(value);
  }
  return value;
}

const toneByConfidence = {
  validated: "success",
  indicative: "teal",
  needs_review: "warning",
} as const;

const labelByConfidence = {
  validated: "Validé",
  indicative: "Indicatif",
  needs_review: "À vérifier",
};

export function CalculationSteps({ steps }: { steps: CalculationStep[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Détail du calcul</CardTitle>
          <p className="mt-1 text-sm text-muted">Chaque étape conserve règle, source et statut.</p>
        </div>
      </CardHeader>
      <div className="space-y-3">
        <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.9fr] gap-4 border-b border-border pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted lg:grid">
          <span>Étape</span>
          <span>Entrée</span>
          <span>Formule</span>
          <span>Sortie</span>
          <span>Preuve</span>
        </div>
        {steps.map((step) => {
          const source = getEvidenceSource(step.evidenceSourceId);
          const rule = getRuleVersion(step.ruleVersionId);

          return (
            <div
              key={step.id}
              className="grid gap-4 rounded-lg border border-border p-4 lg:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.9fr] lg:border-x-0 lg:border-t-0 lg:px-0"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] font-mono text-xs font-semibold text-foreground">
                  {step.order}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={toneByConfidence[step.confidenceStatus]}>
                      {labelByConfidence[step.confidenceStatus]}
                    </Badge>
                    <ReliabilityBadge status={step.displayStatus} />
                  </div>
                </div>
              </div>
              <StepField label="Entrée" value={formatStepValue(step.inputValue)} mono />
              <StepField label="Formule" value={step.formula} />
              <StepField label="Sortie" value={formatStepValue(step.outputValue)} mono strong />
              <div className="text-sm text-muted">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted lg:hidden">
                  Preuve
                </span>
                <p className="font-medium text-foreground">{rule?.version ?? step.ruleVersionId}</p>
                {source ? (
                  <a
                    className="mt-1 inline-block text-[var(--accent-strong)] underline underline-offset-4"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.authority === "service-public" ? "Service-Public" : source.authority}
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StepField({
  label,
  value,
  mono = false,
  strong = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={mono ? "font-mono text-sm text-foreground" : "text-sm text-muted"}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted lg:hidden">
        {label}
      </span>
      <span className={strong ? "font-semibold text-foreground" : undefined}>{value}</span>
    </div>
  );
}
