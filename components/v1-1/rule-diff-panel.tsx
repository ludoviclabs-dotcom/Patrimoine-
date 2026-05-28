import { GitCompareArrows, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getPfuRegulatoryDiff } from "@/lib/evidence/pfu-rule-diff";
import { formatEuro } from "@/lib/format";

const statusLabel: Record<string, string> = {
  review_required: "Revue requise",
  no_action: "Aucune action",
};

export function RuleDiffPanel() {
  const diff = getPfuRegulatoryDiff();
  const impactedRun = diff.impactedRuns[0];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Diff réglementaire PFU</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Démo fixture-driven : source modifiée, règle versionnée et recalcul dossier.
          </p>
        </div>
        <GitCompareArrows className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{diff.fromRule}</Badge>
            <span className="text-sm text-muted">vers</span>
            <Badge tone="warning">{diff.toRule}</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            Entrée en vigueur : {diff.effectiveFrom}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">{diff.recommendedAction}</p>
          <p className="mt-3 break-all font-mono text-xs text-muted">
            {diff.fromHash} → {diff.toHash}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-900">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-950">Impact dossier : {impactedRun.caseLabel}</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {impactedRun.metric} : {formatEuro(diff.amountBefore)} → {formatEuro(diff.amountAfter)}
                {" "}({formatEuro(diff.delta)} d&apos;écart). Recalcul requis avant rapport validé.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="warning">{statusLabel[diff.status] ?? diff.status}</Badge>
                <Badge>{diff.auditEventIds.length} événements audit</Badge>
                <Badge>{diff.impactedCaseIds.length} dossier impacté</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
