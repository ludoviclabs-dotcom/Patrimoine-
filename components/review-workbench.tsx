"use client";

import { useState } from "react";
import { ClipboardCheck, History, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { demoCases, demoProfessionalReviews, demoUsers, demoV1AuditLogs } from "@/lib/demo-data/v1";
import type { ReviewDecision } from "@/lib/types";

const decisionTone = {
  pending: "warning",
  approved: "success",
  changes_requested: "teal",
  rejected: "danger",
} as const;

export function ReviewWorkbench() {
  const [decision, setDecision] = useState<ReviewDecision>(demoProfessionalReviews[0]?.decision ?? "pending");
  const [events, setEvents] = useState<string[]>([]);

  async function decide(nextDecision: ReviewDecision) {
    const response = await fetch("/api/v1/review-decisions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-role": "expert",
      },
      body: JSON.stringify({
        decision: nextDecision,
        summary: `Decision expert demo : ${nextDecision}`,
      }),
    });

    if (response.ok) {
      setDecision(nextDecision);
      setEvents((current) => [`Decision ${nextDecision} enregistree`, ...current]);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Espace de revue humaine</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Frontiere explicite entre simulation indicative et livrable professionnel.
            </p>
          </div>
          <UserCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="space-y-4">
          {demoProfessionalReviews.map((review) => {
            const reviewer = demoUsers.find((user) => user.id === review.reviewerUserId);
            const clientCase = demoCases.find((candidate) => candidate.id === review.caseId);

            return (
              <article key={review.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{clientCase?.title}</h3>
                    <p className="mt-1 text-sm text-muted">Reviewer : {reviewer?.name}</p>
                  </div>
                  <Badge tone={decisionTone[decision]}>{decision}</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">{review.summary}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" onClick={() => decide("approved")}>
                    Approuver
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => decide("changes_requested")}>
                    Demander correction
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => decide("rejected")}>
                    Refuser
                  </Button>
                </div>
                <ul className="mt-4 grid gap-2 text-sm text-muted">
                  {review.requiredActions.map((action) => (
                    <li key={action} className="rounded-lg bg-[var(--surface-soft)] p-3">
                      {action}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Audit append-only</CardTitle>
            <p className="mt-1 text-sm text-muted">Preuve chronologique non modifiable.</p>
          </div>
          <History className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event} className="rounded-lg border border-teal-200 bg-teal-50 p-3">
              <p className="text-sm font-semibold text-teal-950">{event}</p>
            </div>
          ))}
          {demoV1AuditLogs.map((event) => (
            <div key={event.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">{event.action}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{event.summary}</p>
              <p className="mt-2 font-mono text-xs text-muted">{event.createdAt}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
