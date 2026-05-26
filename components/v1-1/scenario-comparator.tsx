"use client";

import { useState } from "react";
import { CheckCircle2, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { ScenarioComparison } from "@/lib/types";

export function ScenarioComparator({ scenarios }: { scenarios: ScenarioComparison[] }) {
  const [activeId, setActiveId] = useState(scenarios[0]?.id ?? "");
  const active = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Comparateur de scenarios</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Comparaison d&apos;arbitrages, sans choisir automatiquement une meilleure option.
          </p>
        </div>
        <GitCompareArrows className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>

      <div className="grid gap-4 xl:grid-cols-5">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => setActiveId(scenario.id)}
            className={`rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
              activeId === scenario.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-border bg-white hover:bg-[var(--surface-soft)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{scenario.label}</p>
              {activeId === scenario.id ? (
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
              ) : null}
            </div>
            <p className="mt-3 font-mono text-lg font-semibold text-foreground">
              {formatEuro(scenario.netWealthEstimate)}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">
              Patrimoine net estime
            </p>
          </button>
        ))}
      </div>

      {active ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Metric label="Liquidite disponible" value={formatEuro(active.availableLiquidity)} />
          <Metric label="Complexite juridique" value={active.legalComplexity} />
          <Metric label="Risque fiscal" value={active.taxRisk} />
          <div className="rounded-lg border border-border p-4 lg:col-span-2">
            <p className="text-sm font-semibold text-foreground">Documents requis</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {active.requiredDocuments.map((document) => (
                <Badge key={document}>{document}</Badge>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-foreground">Validation necessaire</p>
            <p className="mt-2 text-sm leading-6 text-muted">{active.requiredValidation}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 lg:col-span-3">
            <p className="text-sm font-semibold text-amber-950">Impact transmission</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">{active.transmissionImpact}</p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
