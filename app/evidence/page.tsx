import { AppShell } from "@/components/app-shell";
import { RuleDiffPanel } from "@/components/v1-1/rule-diff-panel";
import { EvidenceWorkspace } from "@/components/v1-1/evidence-workspace";
import { SourceWatchPanel } from "@/components/v1-1/source-watch-panel";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { evidenceSources } from "@/lib/evidence/sources";
import { ruleVersions } from "@/lib/rules/rule-versions";

export default function EvidencePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Evidence Center V1.1</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Sources officielles versionnees, snapshots, regles liees, statut de controle et diff de
            regles.
          </p>
        </div>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[1fr_380px]">
          <EvidenceWorkspace sources={evidenceSources} />
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Regles versionnees</CardTitle>
                  <p className="mt-1 text-sm text-muted">Chaque regle pointe vers au moins une source.</p>
                </div>
              </CardHeader>
              <div className="space-y-4">
                {ruleVersions.map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                    <p className="mt-2 font-mono text-xs text-muted">
                      {rule.version} - {rule.effectiveFrom}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                      {rule.ruleSet}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
            <RuleDiffPanel />
            <SourceWatchPanel />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
