"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { ReportConsoleState } from "@/lib/report/report-console";

/**
 * Cabinet report console.
 *
 * Every action goes through the audited server routes; nothing here decides
 * authorization. Buttons are hidden or disabled to match what the server would
 * accept, and each failure is shown with its own machine-readable code rather
 * than a generic toast.
 */

type ActionState =
  | { kind: "idle" }
  | { kind: "working"; action: string }
  | { kind: "error"; action: string; code: string; status: number }
  | { kind: "done"; action: string; message: string };

const statusTone = {
  draft: "warning",
  changes_requested: "danger",
  validated: "success",
} as const;

const statusLabel = {
  draft: "BROUILLON",
  changes_requested: "À REVOIR",
  validated: "VALIDÉ",
} as const;

const errorCopy: Readonly<Record<string, string>> = {
  REPORT_LEGAL_FREEZE_DATE_REQUIRED: "Date de gel juridique manquante ou mal formée (AAAA-MM-JJ).",
  REPORT_SIMULATION_RUN_REQUIRED: "Sélectionnez au moins une simulation.",
  REPORT_READINESS_BLOCKED: "Validation refusée : au moins un point bloquant reste ouvert.",
  REPORT_VALIDATION_COMMENT_REQUIRED: "Un commentaire de validation est obligatoire.",
  REPORT_ALREADY_VALIDATED: "Cette version est déjà validée : générez une nouvelle version.",
  REPORT_VERSION_SUPERSEDED: "Cette version n'est plus la version courante du rapport.",
  REPORT_VERSION_NOT_FOUND: "Version introuvable dans le périmètre de votre cabinet.",
  DOSSIER_NOT_FOUND: "Dossier introuvable dans le périmètre de votre cabinet.",
  SIMULATION_RUN_NOT_FOUND: "Une simulation sélectionnée n'appartient pas à ce dossier.",
  TENANT_AUTHORIZATION_DENIED: "Votre rôle ne permet pas cette action ; le refus est journalisé.",
  TENANT_MEMBERSHIP_REQUIRED: "Votre adhésion au tenant n'est plus active.",
  BLOB_READ_WRITE_TOKEN_REQUIRED: "Stockage privé non configuré : aucun PDF n'a été écrit.",
  DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED: "Secret de signature absent : aucune autorisation émise.",
  REPORT_DOWNLOAD_GRANT_EXPIRED: "Le lien temporaire a expiré ; relancez le téléchargement.",
  REPORT_OBJECT_NOT_FOUND: "Le binaire PDF est introuvable dans le conteneur privé.",
  REPORT_REQUEST_INVALID: "Requête incomplète.",
};

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
}

export function ServerReportConsole({ state }: { state: ReportConsoleState }) {
  const router = useRouter();
  const [legalFreezeDate, setLegalFreezeDate] = useState(state.legalFreezeDate ?? "");
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([...state.selectedRunIds]);
  const [comment, setComment] = useState("");
  const [action, setAction] = useState<ActionState>({ kind: "idle" });

  const current = state.currentVersion;
  const outdated = state.freshness?.status === "outdated";
  const blocking = state.blockers.filter((blocker) => blocker.severity === "blocking");
  const reviewItems = state.blockers.filter((blocker) => blocker.severity !== "blocking");

  async function call(name: string, input: RequestInfo, init: RequestInit, done: string) {
    setAction({ kind: "working", action: name });

    try {
      const response = await fetch(input, init);

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setAction({
          kind: "error",
          action: name,
          code: body.error ?? `HTTP_${response.status}`,
          status: response.status,
        });
        return null;
      }

      setAction({ kind: "done", action: name, message: done });
      router.refresh();
      return (await response.json()) as { data: Record<string, unknown> };
    } catch {
      setAction({ kind: "error", action: name, code: "NETWORK_UNAVAILABLE", status: 0 });
      return null;
    }
  }

  async function generate() {
    await call(
      "generate",
      `/api/v1/reports/cases/${state.selectedDossier?.id}/versions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ simulationRunIds: selectedRunIds, legalFreezeDate }),
      },
      "Nouveau brouillon généré depuis un snapshot immuable.",
    );
  }

  async function validate(decision: "approved" | "changes_requested") {
    if (!current) return;

    await call(
      "validate",
      `/api/v1/reports/versions/${current.reportVersionId}/validation`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, comment }),
      },
      decision === "approved"
        ? "Validation enregistrée : une nouvelle version immuable a été créée."
        : "Demande de correction enregistrée en nouvelle version.",
    );
    setComment("");
  }

  async function download() {
    if (!current) return;

    const result = await call(
      "download",
      `/api/v1/reports/versions/${current.reportVersionId}/download`,
      { method: "GET" },
      "Autorisation temporaire émise.",
    );
    const url = result?.data?.downloadUrl;

    if (typeof url === "string") {
      window.location.assign(url);
    }
  }

  const busy = action.kind === "working";

  return (
    <div
      className="space-y-5"
      // Stable hooks for the authenticated E2E journeys: the visible status
      // words appear in several places (badge, history, watermark), so the
      // machine-readable state is exposed once here instead.
      data-report-console=""
      data-report-status={current?.status ?? "none"}
      data-report-version-id={current?.reportVersionId ?? ""}
      data-report-version-number={current ? String(current.versionNumber) : ""}
      data-report-dossier={state.selectedDossier?.reference ?? ""}
      data-report-role={state.role}
    >
      <Card accent elevated>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Rapport cabinet — pipeline serveur</p>
            <h2 className="mt-1 text-lg font-semibold">
              {state.selectedDossier
                ? `${state.selectedDossier.reference} — ${state.selectedDossier.title}`
                : "Aucun dossier accessible"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {current ? (
              <>
                <Badge tone={statusTone[current.status]} dot>
                  {statusLabel[current.status]}
                </Badge>
                <Badge tone="neutral">version {current.versionNumber}</Badge>
                {outdated && <Badge tone="danger" dot>OBSOLÈTE</Badge>}
              </>
            ) : (
              <Badge tone="neutral">aucune version</Badge>
            )}
          </div>
        </CardHeader>

        {current ? (
          <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
            <Definition label="Statut" value={statusLabel[current.status]} />
            <Definition label="Version" value={`n° ${current.versionNumber}`} />
            <Definition label="Généré le" value={current.generatedAt} />
            <Definition label="Gel juridique" value={state.legalFreezeDate ?? "—"} />
            <Definition label="Simulations" value={state.selectedRunIds.join(", ") || "—"} />
            <Definition
              label="Versions de règles"
              value={state.readiness
                ? state.readiness.business.ruleVersions.map((rule) => rule.id).join(", ") || "—"
                : "—"}
            />
            <Definition
              label="Revue professionnelle"
              value={state.readiness?.professionalReviewSigned ? "signée" : "non signée"}
            />
            <Definition label="Preuves rattachées" value={String(state.readiness?.evidenceCount ?? 0)} />
            <Definition label="Empreinte snapshot" value={current.snapshotSha256} />
            <Definition label="Empreinte PDF" value={current.pdfSha256} />
            {current.status === "validated" && (
              <>
                <Definition label="Validé par" value={state.freshness ? "expert habilité" : "—"} />
                <Definition label="Décision" value={current.decision} />
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Aucun rapport serveur n&apos;a encore été généré pour ce dossier. Le document final du cabinet
            est produit ici, jamais depuis l&apos;aperçu navigateur.
          </p>
        )}

        {current?.status === "draft" && (
          <p className="mt-4 rounded-[var(--r-md)] border border-[var(--warning)] bg-[var(--warning-soft)] p-3 text-sm">
            <strong>Brouillon filigrané « BROUILLON — NON VALIDÉ ».</strong> Ce document ne peut pas être
            remis à un client : il attend la validation d&apos;un professionnel habilité.
          </p>
        )}
        {current?.status === "validated" && (
          <p className="mt-4 rounded-[var(--r-md)] border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm">
            <strong>Version validée, sans filigrane.</strong> Elle porte l&apos;identité du validateur, la date,
            le numéro de version et l&apos;empreinte du snapshot.
          </p>
        )}
      </Card>

      {(blocking.length > 0 || reviewItems.length > 0) && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">États bloquants et points de vigilance</h3>
            <Badge tone={blocking.length > 0 ? "danger" : "warning"}>
              {blocking.length} bloquant(s) · {reviewItems.length} vigilance
            </Badge>
          </CardHeader>
          <ul className="space-y-2">
            {[...blocking, ...reviewItems].map((blocker) => (
              <li
                key={`${blocker.code}-${blocker.detail}`}
                className="flex gap-3 rounded-[var(--r-md)] border border-border p-3"
              >
                <AlertTriangle
                  className={
                    blocker.severity === "blocking"
                      ? "mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]"
                      : "mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]"
                  }
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{blocker.title}</p>
                  <p className="text-sm text-muted">{blocker.detail}</p>
                  {/* Naming the cause is not enough: a professional needs to
                      know what to do next, and the code stays visible for
                      diagnosis. */}
                  <p className="mt-1 text-sm font-medium text-foreground">
                    Prochaine action : {blocker.nextAction}
                  </p>
                  <code className="text-xs text-muted">{blocker.code}</code>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Génération du snapshot serveur</h3>
        </CardHeader>

        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-muted">Date de gel juridique</span>
          <input
            type="date"
            value={legalFreezeDate}
            onChange={(event) => setLegalFreezeDate(event.target.value)}
            className="mt-1 block h-10 w-full rounded-[var(--r-md)] border border-border px-3 text-sm"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-xs uppercase tracking-wide text-muted">Simulations retenues</legend>
          {state.runs.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aucune simulation enregistrée sur ce dossier.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {state.runs.map((run) => (
                <li key={run.id} className="flex items-center gap-2 text-sm">
                  <input
                    id={`run-${run.id}`}
                    type="checkbox"
                    checked={selectedRunIds.includes(run.id)}
                    onChange={(event) =>
                      setSelectedRunIds((previous) =>
                        event.target.checked
                          ? [...previous, run.id]
                          : previous.filter((id) => id !== run.id))}
                  />
                  <label htmlFor={`run-${run.id}`} className="min-w-0">
                    {run.scenario} — {run.engineKey} v{run.engineVersion}
                    <span className="text-muted"> ({run.status})</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="mt-4 flex flex-wrap gap-2">
          {state.capabilities.generate && (
            <Button
              type="button"
              onClick={generate}
              disabled={busy || !legalFreezeDate || selectedRunIds.length === 0 || !state.selectedDossier}
            >
              {current ? <RefreshCw className="h-4 w-4" aria-hidden /> : <FileCheck2 className="h-4 w-4" aria-hidden />}
              {current ? "Régénérer un brouillon" : "Générer le brouillon serveur"}
            </Button>
          )}
          {state.capabilities.download && current && (
            <Button type="button" variant="secondary" onClick={download} disabled={busy}>
              <Download className="h-4 w-4" aria-hidden />
              Télécharger le PDF privé
            </Button>
          )}
        </div>
        {outdated && (
          <p className="mt-3 text-sm text-[var(--danger)]">
            Le PDF déjà généré n&apos;est jamais réécrit : une régénération crée une nouvelle version.
          </p>
        )}
      </Card>

      {state.capabilities.validate && current && current.status !== "validated" && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Validation professionnelle</h3>
            <Badge tone={state.readiness?.canValidateFinal ? "success" : "danger"}>
              {state.readiness?.canValidateFinal ? "gate ouverte" : "gate fermée"}
            </Badge>
          </CardHeader>
          <p className="text-sm text-muted">
            La validation ne modifie jamais la version relue : elle crée une nouvelle version immuable
            portant votre identité, la date, la décision et le commentaire.
          </p>
          <label className="mt-3 block text-sm">
            <span className="text-xs uppercase tracking-wide text-muted">Commentaire (obligatoire)</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-[var(--r-md)] border border-border p-2 text-sm"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="accent"
              onClick={() => validate("approved")}
              disabled={busy || !comment.trim() || outdated || !state.readiness?.canValidateFinal}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Valider le rapport final
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => validate("changes_requested")}
              disabled={busy || !comment.trim()}
            >
              Demander des corrections
            </Button>
          </div>
        </Card>
      )}

      {action.kind === "error" && (
        <Card className="border-[var(--danger)]">
          <p className="text-sm font-medium text-[var(--danger)]">
            Échec de l&apos;action « {action.action} » (HTTP {action.status})
          </p>
          <p className="mt-1 text-sm">{errorCopy[action.code] ?? "Échec non catalogué."}</p>
          <code className="text-xs text-muted">{action.code}</code>
        </Card>
      )}
      {action.kind === "done" && (
        <Card className="border-[var(--success)]">
          <p className="text-sm">{action.message}</p>
        </Card>
      )}

      {state.versions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Historique des versions</h3>
          </CardHeader>
          <ul className="space-y-1 text-sm">
            {state.versions.map((version) => (
              <li key={version.reportVersionId} className="flex flex-wrap items-baseline gap-2">
                <Badge tone={statusTone[version.status]}>v{version.versionNumber}</Badge>
                <span>{statusLabel[version.status]}</span>
                <span className="text-muted">{version.generatedAt}</span>
                <code className="text-xs text-muted break-all">{version.snapshotSha256.slice(0, 16)}…</code>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
