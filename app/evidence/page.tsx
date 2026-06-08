import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { EvidenceWorkspace } from "@/components/v1-1/evidence-workspace";
import { RuleDiffPanel } from "@/components/v1-1/rule-diff-panel";
import { SourceWatchPanel } from "@/components/v1-1/source-watch-panel";
import { OfflineEvidenceControlPanel } from "@/components/v2-1/offline-evidence-control-panel";
import { AuditEvidencePanel } from "@/components/v2-2/audit-evidence-panel";
import { MaturityMatrixPanel } from "@/components/v2-2/maturity-matrix-panel";
import { EvidenceAuditTable } from "@/components/v2-6/cabinet-refonte";
import { evidenceSources } from "@/lib/evidence/sources";
import { ruleVersions } from "@/lib/rules/rule-versions";

export default function EvidencePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHero
          as="h1"
          eyebrow="Audit & règles"
          title="Preuves & règles"
          lead="Sources officielles versionnées, dates de contrôle, périmètres, règles liées, limites de couverture et preuves nécessaires à la revue cabinet."
          actions={
            <>
              <Link
                href="/admin/evidence"
                className="inline-flex h-10 items-center rounded-[var(--r-md)] bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:brightness-110"
              >
                Administrer les sources
              </Link>
              <Link
                href="/compliance"
                className="inline-flex h-10 items-center rounded-[var(--r-md)] border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)]"
              >
                Voir administration RGPD / IA
              </Link>
            </>
          }
        />

        <EvidenceAuditTable />

        <section className="grid min-w-0 gap-6 xl:grid-cols-[1fr_380px]">
          <EvidenceWorkspace sources={evidenceSources} />
          <div className="space-y-6">
            <Card elevated>
              <CardHeader>
                <div>
                  <CardEyebrow>Référentiel</CardEyebrow>
                  <CardTitle className="mt-1">Règles versionnées</CardTitle>
                  <p className="mt-1 text-sm text-muted">Chaque règle pointe vers au moins une source.</p>
                </div>
              </CardHeader>
              <div className="space-y-3">
                {ruleVersions.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-[var(--r-md)] border border-border p-4 transition hover:border-[var(--line-strong)]"
                  >
                    <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                    <p className="mt-2 font-mono text-xs text-muted">
                      {rule.version} - {rule.effectiveFrom}
                    </p>
                    <p className="mt-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[var(--gold-strong)]">
                      {rule.ruleSet}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
            <RuleDiffPanel />
            <AuditEvidencePanel />
            <OfflineEvidenceControlPanel />
            <SourceWatchPanel />
          </div>
        </section>
        <MaturityMatrixPanel />
      </div>
    </AppShell>
  );
}
