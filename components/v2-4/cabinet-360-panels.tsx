import Link from "next/link";
import { AlertTriangle, GitBranch, Scale, ShieldCheck, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  legalVehicleGraph,
  lifeEventPlaybooks,
  regulatoryRiskControls,
  roadmapMilestones,
  sourceCoverageMatrix,
  stressTestPlaybooks,
} from "@/lib/patrimonial-model/model";

export function Cabinet360Panels() {
  const adviceBoundary = sourceCoverageMatrix.find((item) => item.id === "coverage-report-regulatory-native");

  return (
    <section id="v24-controls" aria-labelledby="cabinet-360-title" className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Cabinet 360</p>
        <h2 id="cabinet-360-title" className="mt-2 text-2xl font-bold text-foreground">
          Parcours lisible pour tester tout le dossier
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          La V2.4 ajoute les angles que le rapport juge indispensables : événements de vie, montage
          patrimonial, conformité native, stress tests et frontière entre simulation et conseil.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card id="life-events">
          <CardHeader>
            <div>
              <CardTitle>Événements de vie</CardTitle>
              <p className="mt-1 text-sm text-muted">Entrée par objectif client, pas par formulaire fiscal.</p>
            </div>
            <GitBranch className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {lifeEventPlaybooks.map((event) => (
              <Link
                key={event.id}
                href={event.href}
                className="rounded-lg border border-border p-3 transition hover:bg-[var(--surface-soft)]"
              >
                <p className="text-sm font-semibold text-foreground">{event.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{event.nextAction}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card id="montage-patrimonial">
          <CardHeader>
            <div>
              <CardTitle>Montage patrimonial</CardTitle>
              <p className="mt-1 text-sm text-muted">Personnes, actifs, dettes, droits et véhicules reliés.</p>
            </div>
            <Scale className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {legalVehicleGraph.slice(0, 8).map((node) => (
              <div key={node.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{node.label}</p>
                  <Badge tone={node.reviewRequired ? "warning" : "success"}>{node.nodeType}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{node.userFacingExplanation}</p>
                <p className="mt-2 font-mono text-xs text-muted">{node.dataCaptured.join(" · ")}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Conformité native</CardTitle>
              <p className="mt-1 text-sm text-muted">RGPD, KYC, LCB-FT, CIF/ORIAS, DORA et DSP2 restent visibles.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="space-y-3">
            {regulatoryRiskControls.slice(0, 6).map((control) => (
              <div key={control.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{control.label}</p>
                  <Badge tone="warning">Revue</Badge>
                  <Badge>{control.owner}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{control.mitigation}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Stress tests</CardTitle>
              <p className="mt-1 text-sm text-muted">Liquidité, décès, taux, marché et cash-flow avant décision.</p>
            </div>
            <Waves className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {stressTestPlaybooks.map((stress) => (
              <div key={stress.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold text-foreground">{stress.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{stress.shock}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">{stress.triggerThreshold}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Qualification réglementaire</CardTitle>
              <p className="mt-1 text-sm text-muted">Information et simulation restent séparées du conseil.</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              {adviceBoundary?.label ?? "Frontière conseil personnalisé"}
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {adviceBoundary?.userFacingExplanation ??
                "La plateforme expose des simulations et points de revue, mais ne valide pas une recommandation personnalisée."}
            </p>
          </div>
        </Card>

        <Card id="v24-roadmap">
          <CardHeader>
            <div>
              <CardTitle>Roadmap produit</CardTitle>
              <p className="mt-1 text-sm text-muted">Ce qui est dans la démo, le pilote et le hors MVP.</p>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {roadmapMilestones.map((milestone) => (
              <div key={milestone.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={milestone.status === "hors MVP" ? "danger" : "teal"}>{milestone.version}</Badge>
                  <p className="text-sm font-semibold text-foreground">{milestone.label}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{milestone.productRisk}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
