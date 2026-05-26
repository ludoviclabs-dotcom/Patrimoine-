import { Activity, Database, FileCheck2 } from "lucide-react";
import { CalculationSteps } from "@/components/calculation-steps";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { getLivingDossier } from "@/lib/dossiers/v2-dossiers";

type LivingDossier = ReturnType<typeof getLivingDossier>;

export function LivingDossierPanel({ dossier }: { dossier: LivingDossier }) {
  const firstRun = dossier.taxRuns[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Dossier vivant</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Données, documents, simulations, replays, rapports, revue expert et audit au même endroit.
            </p>
          </div>
          <Activity className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-5">
          {dossier.timeline.map((item, index) => (
            <div key={item} className="rounded-lg border border-border bg-[var(--surface-soft)] p-3">
              <p className="font-mono text-xs text-muted">0{index + 1}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Enveloppes patrimoniales</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Les actifs ne sont plus de simples blocs : chaque ligne porte une enveloppe fiscale.
              </p>
            </div>
            <Database className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {dossier.envelopes
              .filter((item) => item.value > 0)
              .map((item) => (
                <div key={item.envelope} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-foreground">
                    {formatEuro(item.value)}
                  </p>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Snapshot dossier</CardTitle>
              <p className="mt-1 text-sm text-muted">Contrat prêt pour persistance Postgres.</p>
            </div>
            <FileCheck2 className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="space-y-3 text-sm text-muted">
            <p>
              <span className="font-semibold text-foreground">Snapshot :</span> {dossier.snapshot.id}
            </p>
            <p>
              <span className="font-semibold text-foreground">Qualité :</span>{" "}
              {dossier.snapshot.dataQualityScore} %
            </p>
            <p>
              <span className="font-semibold text-foreground">Sources :</span>{" "}
              {dossier.snapshot.sourceVersionIds.length} versions attachées
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="warning">Revue requise</Badge>
              <Badge tone="teal">Replayable</Badge>
            </div>
          </div>
        </Card>
      </section>

      {firstRun ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Dernière simulation calculée</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Exemple de scénario produit depuis le snapshot et les règles V2.
              </p>
            </div>
          </CardHeader>
          <p className="font-mono text-2xl font-semibold text-foreground">
            {firstRun.resultAmount ? formatEuro(firstRun.resultAmount) : firstRun.resultLabel}
          </p>
          <CalculationSteps steps={firstRun.steps} />
        </Card>
      ) : null}
    </div>
  );
}
