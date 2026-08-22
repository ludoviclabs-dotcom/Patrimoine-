import { AlertTriangle, ArrowRight, Check, CircleDot, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import type { CabinetJourney, CabinetJourneyStepState } from "@/lib/cabinet/journey";
import { cn } from "@/lib/utils";

/**
 * PF-07 — where the file actually stands, rendered from server facts.
 *
 * A server component on purpose: the journey is computed from the same tenant
 * transaction that loads the report console, so the screen cannot show a stage
 * the server would not agree with.
 */

const stateBadge: Readonly<Record<CabinetJourneyStepState, {
  label: string;
  tone: "teal" | "warning" | "danger" | "neutral";
}>> = {
  done: { label: "terminé", tone: "teal" },
  active: { label: "en cours", tone: "neutral" },
  blocked: { label: "bloquant", tone: "danger" },
  review: { label: "à vérifier", tone: "warning" },
  todo: { label: "à venir", tone: "neutral" },
};

function StepIcon({ state }: { state: CabinetJourneyStepState }) {
  if (state === "done") return <Check className="h-4 w-4" aria-hidden />;
  if (state === "blocked") return <AlertTriangle className="h-4 w-4" aria-hidden />;
  if (state === "review") return <Info className="h-4 w-4" aria-hidden />;
  return <CircleDot className="h-4 w-4" aria-hidden />;
}

export function CabinetJourneyBar({ journey }: { journey: CabinetJourney }) {
  return (
    <Card elevated data-cabinet-journey="" data-journey-active={journey.activeStep ?? ""}>
      <CardHeader>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Parcours cabinet</p>
          <h2 className="mt-1 truncate text-lg font-semibold">
            {journey.dossierReference
              ? `${journey.dossierReference}${journey.dossierTitle ? ` — ${journey.dossierTitle}` : ""}`
              : "Aucun dossier ouvert"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {journey.blockingCount > 0 && (
            <Badge tone="danger" dot>{journey.blockingCount} bloquant(s)</Badge>
          )}
          {journey.reviewCount > 0 && (
            <Badge tone="warning" dot>{journey.reviewCount} à vérifier</Badge>
          )}
          {journey.blockingCount === 0 && journey.reviewCount === 0 && (
            <Badge tone="teal" dot>aucun point bloquant</Badge>
          )}
        </div>
      </CardHeader>

      {/* A list, not a decorative rail: each stage states its own status, so a
          screen reader and a 375px screen both convey the same information. */}
      <ol className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {journey.steps.map((step, index) => {
          const badge = stateBadge[step.state];
          return (
            <li
              key={step.key}
              data-journey-step={step.key}
              data-journey-state={step.state}
              aria-current={step.key === journey.activeStep ? "step" : undefined}
              className={cn(
                "rounded-[var(--r-md)] border p-3",
                step.state === "blocked"
                  ? "border-[var(--danger)] bg-[var(--danger-soft)]"
                  : step.state === "review"
                    ? "border-[var(--warning)] bg-[var(--warning-soft)]"
                    : step.key === journey.activeStep
                      ? "border-[var(--line-strong)] bg-[var(--surface-soft)]"
                      : "border-border",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.state === "done"
                      ? "bg-[var(--success,var(--gold))] text-white"
                      : step.state === "blocked"
                        ? "bg-[var(--danger)] text-white"
                        : "border border-border text-muted",
                  )}
                >
                  <StepIcon state={step.state} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {index + 1}. {step.label}
                  </span>
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">{step.detail}</p>
              <span className="mt-2 inline-flex">
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </span>
              {step.code && (
                <code className="mt-2 block break-all text-[0.65rem] text-muted">{step.code}</code>
              )}
            </li>
          );
        })}
      </ol>

      {journey.nextAction && (
        <p
          data-journey-next-action=""
          // A status region: the next action changes as the file advances, and
          // a keyboard user should hear it without hunting for it.
          role="status"
          className="mt-4 flex items-start gap-2 rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface-soft)] p-3 text-sm"
        >
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold-strong)]" aria-hidden />
          <span>
            <strong>Prochaine action : </strong>
            {journey.nextAction}
          </span>
        </p>
      )}
    </Card>
  );
}
