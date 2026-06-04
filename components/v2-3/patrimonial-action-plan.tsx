import Link from "next/link";
import { ArrowRight, CheckCircle2, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cabinetActionPlanSteps } from "@/lib/patrimonial-model/model";
import type { RiskLevel } from "@/lib/patrimonial-model/model";

const riskTone: Record<RiskLevel, "success" | "warning" | "danger" | "teal"> = {
  faible: "success",
  moyen: "teal",
  élevé: "warning",
  critique: "danger",
};

export function PatrimonialActionPlan() {
  return (
    <section aria-labelledby="patrimonial-action-title" className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
          Plan d&apos;action V2.3
        </p>
        <h2 id="patrimonial-action-title" className="mt-2 text-2xl font-bold text-foreground">
          Collecter → Qualifier → Simuler → Contrôler → Restituer
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Ce bloc transforme le rapport de recherche en parcours testable : chaque étape dit ce que
          le cabinet regarde, sur quelle preuve il s&apos;appuie, quel risque reste ouvert et quelle
          page ouvrir ensuite.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Plan d&apos;action patrimonial</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Checklist de rendez-vous, sans connecteur externe et sans validation automatique.
            </p>
          </div>
          <Route className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <ol className="grid gap-3 xl:grid-cols-5">
          {cabinetActionPlanSteps.map((step) => (
            <li key={step.id} className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs font-semibold text-muted">
                  {String(step.order).padStart(2, "0")}
                </span>
                <Badge tone={riskTone[step.risk]}>Risque {step.risk}</Badge>
              </div>
              <p className="mt-3 text-sm font-bold text-foreground">{step.verb}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{step.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{step.userFacingExplanation}</p>
              <div className="mt-4 grid gap-2 text-sm text-muted">
                <p>
                  <span className="font-semibold text-foreground">Données :</span>{" "}
                  {step.dataUsed.join(", ")}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Sources :</span>{" "}
                  {step.sourceIds.length}
                </p>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-white p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                  <p className="text-sm leading-6 text-muted">{step.nextAction}</p>
                </div>
              </div>
              <Link
                href={step.href}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white transition hover:bg-[#223029] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                Ouvrir l&apos;étape
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
