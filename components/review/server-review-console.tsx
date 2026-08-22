"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { describeError } from "@/lib/errors/error-catalog";
import type { ReportConsoleState } from "@/lib/report/report-console";

/**
 * PF-07B — signing a professional review.
 *
 * The action is offered only to a role the server would accept, and the server
 * decides anyway: `simulation.review` is enforced by the central matrix, so a
 * conseiller or a client calling the route directly is refused and audited.
 *
 * Nothing here computes or re-computes a fiscal result. It records a human
 * decision about work the deterministic engine already produced.
 */

type ActionState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "error"; code: string; status: number }
  | { kind: "done"; decision: string };

const decisionLabel: Readonly<Record<string, string>> = {
  approved: "Approuvée",
  changes_requested: "Corrections demandées",
  rejected: "Rejetée",
  pending: "En attente",
};

const decisionTone: Readonly<Record<string, "teal" | "warning" | "danger" | "neutral">> = {
  approved: "teal",
  changes_requested: "warning",
  rejected: "danger",
  pending: "neutral",
};

export function ServerReviewConsole({ state }: { state: ReportConsoleState }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "changes_requested">("approved");
  const [comment, setComment] = useState("");
  const [action, setAction] = useState<ActionState>({ kind: "idle" });

  const dossier = state.selectedDossier;
  const latest = state.reviews[0] ?? null;
  const signed = latest?.decision === "approved";
  const blocking = state.blockers.filter((blocker) => blocker.severity === "blocking");

  async function sign() {
    if (!dossier) return;
    setAction({ kind: "working" });

    try {
      const response = await fetch(`/api/v1/cases/${dossier.id}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, comment }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setAction({
          kind: "error",
          code: body.error ?? `HTTP_${response.status}`,
          status: response.status,
        });
        return;
      }

      setAction({ kind: "done", decision });
      setComment("");
      router.refresh();
    } catch {
      setAction({ kind: "error", code: "NETWORK_UNAVAILABLE", status: 0 });
    }
  }

  return (
    <div
      className="space-y-5"
      data-review-console=""
      data-review-role={state.role}
      data-review-dossier={dossier?.reference ?? ""}
      data-review-decision={latest?.decision ?? "none"}
      data-review-can-sign={state.capabilities.signReview ? "yes" : "no"}
    >
      <Card accent elevated>
        <CardHeader>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Revue professionnelle — pipeline serveur
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold">
              {dossier ? `${dossier.reference} — ${dossier.title}` : "Aucun dossier accessible"}
            </h2>
          </div>
          <Badge tone={decisionTone[latest?.decision ?? "pending"]} dot>
            {decisionLabel[latest?.decision ?? "pending"] ?? "En attente"}
          </Badge>
        </CardHeader>

        {latest ? (
          <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
            <p className="text-sm">
              <span className="text-muted">Dernière décision : </span>
              {decisionLabel[latest.decision] ?? latest.decision}
            </p>
            <p className="text-sm">
              <span className="text-muted">Signée le : </span>
              {latest.reviewedAt ?? "—"}
            </p>
            <p className="text-sm md:col-span-2">
              <span className="text-muted">Motif : </span>{latest.summary}
            </p>
            {latest.requiredActions.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted">Actions demandées :</p>
                <ul className="ml-5 list-disc text-sm">
                  {latest.requiredActions.map((entry) => <li key={entry}>{entry}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Aucune revue n&apos;a encore été signée pour ce dossier. Le rapport reste bloqué tant
            qu&apos;un professionnel habilité ne s&apos;est pas prononcé.
          </p>
        )}

        {signed ? (
          <p className="mt-4 flex items-start gap-2 rounded-[var(--r-md)] border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong>Revue signée.</strong> Le rapport peut être validé si aucun autre point
              bloquant ne subsiste.
            </span>
          </p>
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-[var(--r-md)] border border-[var(--warning)] bg-[var(--warning-soft)] p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong>Revue non signée.</strong> La validation du rapport reste refusée par le
              serveur tant que la revue n&apos;est pas approuvée.
            </span>
          </p>
        )}
      </Card>

      {blocking.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Points à examiner avant de signer</h3>
            <Badge tone="danger">{blocking.length} bloquant(s)</Badge>
          </CardHeader>
          <ul className="space-y-2">
            {blocking.map((blocker) => (
              <li key={`${blocker.code}-${blocker.detail}`} className="rounded-[var(--r-md)] border border-border p-3">
                <p className="text-sm font-medium">{blocker.title}</p>
                <p className="text-sm text-muted">{blocker.detail}</p>
                <p className="mt-1 text-sm font-medium">Prochaine action : {blocker.nextAction}</p>
                <code className="text-xs text-muted">{blocker.code}</code>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* A client never sees this: simulation.review is absent from that role. */}
      {state.capabilities.signReview && dossier && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Signer la revue</h3>
          </CardHeader>

          <fieldset className="space-y-2">
            <legend className="text-xs uppercase tracking-wide text-muted">Décision</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="review-decision"
                value="approved"
                checked={decision === "approved"}
                onChange={() => setDecision("approved")}
              />
              Approuver la revue
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="review-decision"
                value="changes_requested"
                checked={decision === "changes_requested"}
                onChange={() => setDecision("changes_requested")}
              />
              Demander des corrections
            </label>
          </fieldset>

          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-wide text-muted">
              Motif de la décision (obligatoire)
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-[var(--r-md)] border border-border bg-white p-2 text-sm"
            />
          </label>

          <div className="mt-4">
            <Button
              type="button"
              onClick={sign}
              // The server refuses an empty motive anyway; disabling here keeps
              // the interface honest about what it would accept.
              disabled={action.kind === "working" || comment.trim().length === 0}
            >
              <PenLine className="h-4 w-4" aria-hidden />
              {action.kind === "working" ? "Signature en cours…" : "Signer la revue"}
            </Button>
          </div>
        </Card>
      )}

      {action.kind === "error" && (() => {
        const descriptor = describeError(action.code);
        return (
          <Card className="border-[var(--danger)]" role="alert">
            <p className="text-sm font-medium text-[var(--danger)]">
              {descriptor.title}
              {action.status > 0 ? ` (HTTP ${action.status})` : ""}
            </p>
            <p className="mt-1 text-sm">{descriptor.explanation}</p>
            <p className="mt-1 text-sm font-medium">Prochaine action : {descriptor.nextAction}</p>
            <code className="text-xs text-muted">{action.code}</code>
          </Card>
        );
      })()}

      {action.kind === "done" && (
        <Card className="border-[var(--success)]" role="status">
          <p className="text-sm">
            Revue enregistrée : {decisionLabel[action.decision] ?? action.decision}.
          </p>
        </Card>
      )}
    </div>
  );
}
