"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import {
  advanceRecommendation,
  demoRecommendations,
  getNextStatus,
  RECOMMENDATION_FLOW,
} from "@/lib/crm/recommendations";
import type { Recommendation } from "@/lib/types";

const statusTone: Record<Recommendation["status"], "neutral" | "teal" | "warning" | "success"> = {
  proposee: "neutral",
  acceptee: "teal",
  "en-cours": "warning",
  realisee: "success",
};

const statusLabels: Record<Recommendation["status"], string> = {
  proposee: "Proposée",
  acceptee: "Acceptée",
  "en-cours": "En cours",
  realisee: "Réalisée",
};

export function RecommendationsTracker() {
  const [recommendations, setRecommendations] = useState(demoRecommendations);

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Suivi des préconisations</CardEyebrow>
          <CardTitle className="mt-1">CRM dossier</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Chaque transition ({RECOMMENDATION_FLOW.map((status) => statusLabels[status]).join(" → ")})
            est journalisée dans l&apos;audit append-only.
          </p>
        </div>
        <ClipboardCheck className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>
      <div className="space-y-3">
        {recommendations.map((recommendation) => {
          const next = getNextStatus(recommendation.status);
          return (
            <div
              key={recommendation.id}
              className="rounded-[var(--r-md)] border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{recommendation.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">
                    {recommendation.owner} · maj {recommendation.updatedAt.slice(0, 10)}
                  </p>
                </div>
                <Badge tone={statusTone[recommendation.status]} dot>
                  {statusLabels[recommendation.status]}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{recommendation.detail}</p>
              {recommendation.linkedRunId ? (
                <p className="mt-2 font-mono text-xs text-muted">Run : {recommendation.linkedRunId}</p>
              ) : null}
              {next ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() =>
                    setRecommendations((items) =>
                      items.map((item) =>
                        item.id === recommendation.id ? advanceRecommendation(item) : item,
                      ),
                    )
                  }
                >
                  Passer à « {statusLabels[next]} »
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
