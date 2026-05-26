import { GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuleDiff } from "@/lib/types";

export const demoRuleDiffs: RuleDiff[] = [
  {
    id: "rule-diff-ifi-2026-01-03",
    fromVersion: "IFI-2026.01",
    toVersion: "IFI-2026.03",
    changedField: "Source Service-Public verifiee et limites dettes precisees",
    impact: "Recalcul recommande sur dossiers avec dettes immobilieres ou SCI.",
    dossiersToRecalculate: 12,
    status: "review_required",
  },
];

export function RuleDiffPanel() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Diff de regles</CardTitle>
          <p className="mt-1 text-sm text-muted">Exemple fixture-driven pour montrer l&apos;impact d&apos;une mise a jour.</p>
        </div>
        <GitCompareArrows className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="space-y-3">
        {demoRuleDiffs.map((diff) => (
          <div key={diff.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal">{diff.fromVersion}</Badge>
              <span className="text-sm text-muted">vers</span>
              <Badge tone="warning">{diff.toVersion}</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{diff.changedField}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{diff.impact}</p>
            <p className="mt-2 font-mono text-xs text-muted">
              {diff.dossiersToRecalculate} dossiers a recalculer - {diff.status}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
