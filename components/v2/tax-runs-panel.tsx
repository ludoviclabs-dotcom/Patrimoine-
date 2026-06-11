"use client";

import { useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import { CalculationSteps } from "@/components/calculation-steps";
import { LegalNotice } from "@/components/legal-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { TaxRun } from "@/lib/types";

const moduleLabels: Record<TaxRun["module"], string> = {
  ifi: "IFI",
  "ir-pfu-cdhr": "IR / PFU / CDHR",
  "ir-bareme": "IR barème 2026",
  "pfu-arbitrage": "PFU vs barème",
  "plus-value-immo": "Plus-value immobilière",
  transmission: "Transmission",
  demembrement: "Démembrement art. 669",
  "assurance-vie": "Assurance-vie décès",
  dutreil: "Pacte Dutreil",
  "apport-cession": "Apport-cession",
  "holding-tax": "Taxe holding",
  pea: "PEA",
  per: "PER",
  "bank-import": "Import simulé",
  succession: "Succession simple",
  "per-exit": "PER sortie anticipée",
  "liquidity-stress": "Stress liquidité",
  "product-adequacy": "Adéquation produit",
};

export function TaxRunsPanel({ runs }: { runs: TaxRun[] }) {
  const [activeId, setActiveId] = useState(runs[0]?.id);
  const [status, setStatus] = useState("Simulation prête à lancer");
  const active = runs.find((run) => run.id === activeId) ?? runs[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Moteurs fiscaux V2</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Chaque résultat est indicatif, sourcé et rattaché à une validation professionnelle.
            </p>
          </div>
          <Scale className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="space-y-2">
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => setActiveId(run.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
                activeId === run.id
                  ? "border-[var(--surface-strong)] bg-[var(--surface-soft)]"
                  : "border-border hover:bg-[var(--surface-soft)]"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {moduleLabels[run.module]}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {formatRunResult(run)}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </button>
          ))}
        </div>
      </Card>

      {active ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{moduleLabels[active.module]}</CardTitle>
              <p className="mt-1 text-sm text-muted">{active.resultLabel}</p>
            </div>
            <Badge tone="warning">Validation {active.reviewerRequired}</Badge>
          </CardHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Statut" value={status} />
            <Metric label="Sources" value={`${active.evidenceSourceIds.length}`} />
            <Metric label="Limites" value={`${active.coverageLimitIds?.length ?? 0}`} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={() => setStatus(`Scénario ${moduleLabels[active.module]} lancé`)}>
              Lancer le scénario
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStatus("Preuves attachées au dossier")}>
              Voir les preuves
            </Button>
          </div>
          <div className="mt-5">
            <CalculationSteps steps={active.steps} />
          </div>
          <div className="mt-5">
            <LegalNotice compact />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function formatRunResult(run: TaxRun) {
  if (["bank-import", "succession", "product-adequacy"].includes(run.module)) return run.resultLabel;
  return typeof run.resultAmount === "number" ? formatEuro(run.resultAmount) : run.resultLabel;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
