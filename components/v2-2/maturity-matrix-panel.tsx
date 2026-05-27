import { Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getMaturityMatrix } from "@/lib/maturity/matrix";
import type { MaturityItem } from "@/lib/types";

const statusLabel: Record<MaturityItem["status"], string> = {
  fixtures_demo: "Fixtures démonstrateur",
  production_ready_without_connector: "Prêt-prod sans connecteur",
  not_built: "Non construit",
  external_connector_required: "Connecteur externe requis",
};

const statusTone: Record<MaturityItem["status"], "success" | "warning" | "danger" | "teal"> = {
  fixtures_demo: "teal",
  production_ready_without_connector: "success",
  not_built: "danger",
  external_connector_required: "warning",
};

export function MaturityMatrixPanel() {
  const items = getMaturityMatrix();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Matrice de maturité</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Ce qui est démontré, prêt sans connecteur, non construit ou dépendant d&apos;un outil externe.
          </p>
        </div>
        <Boxes className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{item.area}</p>
              <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{item.evidence}</p>
            {item.externalDependency ? (
              <p className="mt-2 font-mono text-xs text-muted">{item.externalDependency}</p>
            ) : null}
            <p className="mt-3 text-sm font-medium text-foreground">{item.nextAction}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
