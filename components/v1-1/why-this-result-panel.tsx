import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { ReliabilityBadge } from "@/components/v1-1/reliability-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCoverageLimit } from "@/lib/coverage/limits";
import { getEvidenceSource } from "@/lib/evidence/sources";
import { getRuleVersion } from "@/lib/rules/rule-versions";
import type { CalculationStep } from "@/lib/types";

export function WhyThisResultPanel({ step }: { step: CalculationStep }) {
  const source = getEvidenceSource(step.evidenceSourceId);
  const rule = getRuleVersion(step.ruleVersionId);
  const limits = step.coverageLimitIds
    .map((id) => getCoverageLimit(id))
    .filter((limit): limit is NonNullable<typeof limit> => Boolean(limit));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Pourquoi ce résultat ?</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Calcul, explication, source, limite et action sont volontairement séparés.
          </p>
        </div>
        <HelpCircle className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>

      <div className="grid gap-4">
        <Section title="1. Données utilisées">
          <ul className="space-y-1">
            {step.usedData.map((data) => (
              <li key={data}>{data}</li>
            ))}
          </ul>
        </Section>
        <Section title="2. Formule appliquée">{step.formula}</Section>
        <Section title="3. Calcul intermédiaire">{step.intermediateResult}</Section>
        <Section title="4. Source officielle">
          {source ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--accent-strong)] underline underline-offset-4"
            >
              {source.title}
            </a>
          ) : (
            step.evidenceSourceId
          )}
          <p className="mt-2 font-mono text-xs text-muted">
            {rule?.version ?? step.ruleVersionId} - {source?.sourceVersion ?? "source inconnue"}
          </p>
        </Section>
        <Section title="5. Limites du calcul">
          <div className="flex flex-wrap gap-2">
            {limits.map((limit) => (
              <Badge
                key={limit.id}
                tone={limit.status === "not_covered_v1" ? "danger" : limit.status === "covered" ? "success" : "warning"}
              >
                {limit.label}
              </Badge>
            ))}
          </div>
        </Section>
        <Section title="6. À valider">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{step.nextAction}</span>
            <ReliabilityBadge status={step.displayStatus} />
          </div>
        </Section>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4 text-sm leading-6 text-muted">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
