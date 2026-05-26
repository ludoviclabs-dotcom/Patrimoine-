import { CheckCircle2, CircleAlert, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompletenessScore } from "@/lib/quality/completeness";

export function CompletenessScorePanel() {
  const completeness = getCompletenessScore();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Completude du dossier</CardTitle>
          <p className="mt-1 text-sm text-muted">Score demo V1.1, avant revue professionnelle.</p>
        </div>
        <ClipboardList className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg bg-[var(--surface-soft)] p-5">
          <p className="text-sm font-medium text-muted">Claire et Marc</p>
          <p className="mt-3 font-mono text-5xl font-semibold text-foreground">
            {completeness.score}%
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${completeness.score}%` }}
            />
          </div>
          <Badge className="mt-4" tone="warning">
            Revue requise
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CircleAlert className="h-4 w-4 text-[var(--warning)]" aria-hidden="true" />
              Manquants prioritaires
            </div>
            <ul className="space-y-2 text-sm leading-6 text-muted">
              {completeness.missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
              Elements controles
            </div>
            <ul className="space-y-2 text-sm leading-6 text-muted">
              {completeness.checkedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
