import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { sourceCoverageMatrix, type ReportCoverageStatus } from "@/lib/patrimonial-model/model";

const statusTone: Record<ReportCoverageStatus, "success" | "warning" | "danger" | "teal"> = {
  implémenté: "success",
  partiel: "warning",
  "à simuler": "teal",
  "hors MVP": "danger",
};

export function ReportCoverageMatrix() {
  return (
    <section id="couverture-rapport" aria-labelledby="coverage-report-title" className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">V2.4</p>
        <h2 id="coverage-report-title" className="mt-2 text-2xl font-bold text-foreground">
          Couverture du rapport
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Chaque bloc du rapport devient une fonctionnalité testable, avec une page cible, un statut et
          une revue humaine explicite.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Rapport → Fonctionnalité → Page de test</CardTitle>
            <p className="mt-1 text-sm text-muted">
              La matrice sert de checklist de démonstration pour un cabinet CGP.
            </p>
          </div>
          <FileCheck2 className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>

        <div className="grid gap-3">
          {sourceCoverageMatrix.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-lg border border-border p-4 lg:grid-cols-[1.1fr_1.3fr_0.8fr_0.8fr]"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{item.reportTheme}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{item.userFacingExplanation}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.feature}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">{item.reviewGate}</p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Badge tone={statusTone[item.coverageStatus]}>{item.coverageStatus}</Badge>
                {item.reviewRequired ? <Badge tone="warning">Revue</Badge> : <Badge tone="success">Auto test</Badge>}
              </div>
              <Link
                href={item.testHref}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)]"
              >
                {item.pageLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
