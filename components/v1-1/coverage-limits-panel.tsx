import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { coverageLimits } from "@/lib/coverage/limits";
import type { CoverageStatus } from "@/lib/types";

const statusLabels: Record<CoverageStatus, string> = {
  covered: "Couvert",
  partially_covered: "Partiel",
  not_covered_v1: "Non couvert V1",
};

const statusTones: Record<CoverageStatus, Parameters<typeof Badge>[0]["tone"]> = {
  covered: "success",
  partially_covered: "warning",
  not_covered_v1: "danger",
};

export function CoverageLimitsPanel({ module = "ifi" }: { module?: (typeof coverageLimits)[number]["module"] }) {
  const limits = coverageLimits.filter((limit) => limit.module === module);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Limites de couverture</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Le bornage est affiche comme fonctionnalite produit, pas comme note de bas de page.
          </p>
        </div>
        <ShieldAlert className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3">
        {limits.map((limit) => (
          <div key={limit.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{limit.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{limit.explanation}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge tone={statusTones[limit.status]}>{statusLabels[limit.status]}</Badge>
                {limit.requiredProfessional ? <Badge>{limit.requiredProfessional}</Badge> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
