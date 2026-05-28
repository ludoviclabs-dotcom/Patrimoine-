"use client";

import { useState } from "react";
import { AlertTriangle, DatabaseZap, FileDiff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { EvidenceControlResult, RuleDiffImpact } from "@/lib/types";

const ruleDiffStatusLabel: Record<RuleDiffImpact["status"], string> = {
  review_required: "Revue requise",
  no_action: "Aucune action",
};

export function EvidenceAdminWorkbench() {
  const [results, setResults] = useState<EvidenceControlResult[]>([]);
  const [diffs, setDiffs] = useState<RuleDiffImpact[]>([]);

  async function loadControls() {
    const response = await fetch("/api/v1/source-control", {
      headers: { "x-demo-role": "expert" },
    });
    const payload = (await response.json()) as { data: { results: EvidenceControlResult[] } };
    setResults(payload.data.results);
  }

  async function loadDiffs() {
    const response = await fetch("/api/v1/rule-diffs", {
      headers: { "x-demo-role": "expert" },
    });
    const payload = (await response.json()) as { data: RuleDiffImpact[] };
    setDiffs(payload.data);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Admin regles et sources</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Controle de snapshots, hash de contenu et alertes avant mise a jour des regles.
            </p>
          </div>
          <DatabaseZap className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={loadControls}>
            Controler sources
          </Button>
          <Button type="button" variant="secondary" onClick={loadDiffs}>
            <FileDiff className="h-4 w-4" aria-hidden="true" />
            Generer diff regles
          </Button>
        </div>
        <div className="mt-5 grid gap-3">
          {results.length === 0 ? (
            <p className="text-sm leading-6 text-muted">Aucun controle lance dans cette session.</p>
          ) : null}
          {results.map((result) => (
            <div key={result.sourceId} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{result.sourceId}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">
                    {result.previousHash} vers {result.currentHash}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">{result.recommendedAction}</p>
                </div>
                <Badge tone={result.status === "unchanged" ? "success" : result.status === "changed" ? "warning" : "danger"}>
                  {result.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Alertes et impacts</CardTitle>
            <p className="mt-1 text-sm text-muted">Impact dossiers avant recalcul.</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="space-y-3">
          {diffs.length === 0 ? (
            <p className="text-sm leading-6 text-muted">Les diffs apparaitront apres controle.</p>
          ) : null}
          {diffs.map((diff) => (
            <div key={diff.id} className="rounded-lg border border-border p-4">
              <Badge tone={diff.status === "review_required" ? "warning" : "success"}>
                {ruleDiffStatusLabel[diff.status]}
              </Badge>
              <p className="mt-3 text-sm font-semibold text-foreground">{diff.ruleVersionId}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{diff.recommendedAction}</p>
              <p className="mt-2 font-mono text-xs text-muted">
                Dossiers impactes : {diff.impactedCaseIds.length}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
