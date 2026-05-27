import { BadgeCheck, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getV2TaxRuns } from "@/lib/tax/v2-engines";
import { assertSimulationHasProof, getGoldenCases } from "@/lib/validation/golden-cases";

export function GoldenCasesPanel() {
  const goldenCases = getGoldenCases();
  const proofReady = getV2TaxRuns().every((run) => assertSimulationHasProof(run));

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-xl font-bold text-foreground">Golden cases fiscaux</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Jeux de contrôle figés pour chaque moteur V2 : entrée, résultat attendu, sources,
            versions de règles et revue professionnelle simulée.
          </p>
        </div>
        <Badge tone={proofReady ? "success" : "danger"}>
          {proofReady ? "Preuves complètes" : "Preuves incomplètes"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cas prêts pour revue</CardTitle>
            <p className="mt-1 text-sm text-muted">Aucun cas n&apos;est considéré validé sans relecture métier.</p>
          </div>
          <ClipboardCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="grid gap-3 lg:grid-cols-2">
          {goldenCases.map((goldenCase) => (
            <div key={goldenCase.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{goldenCase.title}</p>
                  <p className="mt-2 font-mono text-xs text-muted">{goldenCase.inputSnapshotId}</p>
                </div>
                <Badge tone="warning">{goldenCase.validationStatus}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{goldenCase.module}</Badge>
                <Badge>{goldenCase.reviewer ?? "reviewer à assigner"}</Badge>
                <Badge>{goldenCase.ruleVersionIds.length} règles</Badge>
                <Badge>{goldenCase.sourceVersionIds.length} sources</Badge>
              </div>
              <div className="mt-4 rounded-lg bg-[var(--surface-soft)] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  Résultat attendu
                </div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-5 text-foreground">
                  {JSON.stringify(goldenCase.expected, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
