import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceWorkspace } from "@/components/v1-1/evidence-workspace";
import { RuleDiffPanel } from "@/components/v1-1/rule-diff-panel";
import { SourceWatchPanel } from "@/components/v1-1/source-watch-panel";
import { OfflineEvidenceControlPanel } from "@/components/v2-1/offline-evidence-control-panel";
import { evidenceSources } from "@/lib/evidence/sources";
import { ruleVersions } from "@/lib/rules/rule-versions";

export default function EvidencePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Preuves & conformité</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Sources officielles versionnées, snapshots, règles liées, statut de contrôle,
            diff de règles, AIPD et gouvernance IA désactivée par défaut.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/evidence"
              className="inline-flex h-10 items-center rounded-lg bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white"
            >
              Administrer les sources
            </Link>
            <Link
              href="/compliance"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground"
            >
              Voir conformité RGPD / IA
            </Link>
          </div>
        </div>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[1fr_380px]">
          <EvidenceWorkspace sources={evidenceSources} />
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Règles versionnées</CardTitle>
                  <p className="mt-1 text-sm text-muted">Chaque règle pointe vers au moins une source.</p>
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
            <OfflineEvidenceControlPanel />
            <SourceWatchPanel />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
