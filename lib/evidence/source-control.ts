import { createHash } from "node:crypto";
import { demoCases, demoTenant } from "../demo-data/v1";
import { evidenceSources, sourceSnapshots } from "./sources";
import type { EvidenceControlResult, EvidenceSource, RuleDiffImpact, SourceSnapshot } from "../types";

export function hashSourceContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export function createControlledSnapshot(
  source: EvidenceSource,
  content: string,
  checkedAt = "2026-05-26T13:15:00.000Z",
): SourceSnapshot {
  return {
    id: `controlled-${source.id}-${checkedAt.slice(0, 10)}`,
    sourceId: source.id,
    sourceVersion: source.sourceVersion,
    capturedAt: checkedAt,
    contentHash: hashSourceContent(content),
    summary: source.summary,
    linkedRuleIds: source.linkedRuleIds,
    status: "current",
  };
}

export function compareSnapshotHash({
  source,
  snapshot,
  currentHash,
  checkedAt = "2026-05-26T13:15:00.000Z",
}: {
  source: EvidenceSource;
  snapshot: SourceSnapshot;
  currentHash: string;
  checkedAt?: string;
}): EvidenceControlResult {
  const changed = snapshot.contentHash !== currentHash;

  return {
    sourceId: source.id,
    url: source.url,
    previousHash: snapshot.contentHash,
    currentHash,
    status: changed ? "changed" : "unchanged",
    checkedAt,
    alert: changed,
    recommendedAction: changed
      ? "Alerter l'admin preuve, verifier le texte officiel et creer un diff de regle."
      : "Aucune action requise.",
  };
}

export async function controlEvidenceSource({
  source,
  fetcher,
  liveEnabled = process.env.EVIDENCE_LIVE_CHECKS === "enabled",
}: {
  source: EvidenceSource;
  fetcher?: (url: string) => Promise<string>;
  liveEnabled?: boolean;
}): Promise<EvidenceControlResult> {
  const snapshot = sourceSnapshots.find((candidate) => candidate.sourceId === source.id);

  if (!snapshot) {
    return {
      sourceId: source.id,
      url: source.url,
      previousHash: "missing",
      currentHash: "missing",
      status: "failed",
      checkedAt: new Date().toISOString(),
      alert: true,
      recommendedAction: "Creer un snapshot controle avant de valider cette source.",
      error: "SNAPSHOT_NOT_FOUND",
    };
  }

  if (!liveEnabled) {
    return compareSnapshotHash({
      source,
      snapshot,
      currentHash: snapshot.contentHash,
      checkedAt: new Date().toISOString(),
    });
  }

  try {
    const content = fetcher ? await fetcher(source.url) : await fetchSourceText(source.url);
    return compareSnapshotHash({
      source,
      snapshot,
      currentHash: hashSourceContent(content),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return {
      sourceId: source.id,
      url: source.url,
      previousHash: snapshot.contentHash,
      currentHash: "fetch-failed",
      status: "failed",
      checkedAt: new Date().toISOString(),
      alert: true,
      recommendedAction: "Relancer le controle ou verifier manuellement la source officielle.",
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}

export async function controlAllEvidenceSources({
  liveEnabled = process.env.EVIDENCE_LIVE_CHECKS === "enabled",
}: {
  liveEnabled?: boolean;
} = {}) {
  return Promise.all(
    evidenceSources.map((source) =>
      controlEvidenceSource({
        source,
        liveEnabled,
      }),
    ),
  );
}

export function buildRuleDiffImpact(result: EvidenceControlResult): RuleDiffImpact {
  const source = evidenceSources.find((candidate) => candidate.id === result.sourceId);
  const impactedCaseIds = result.status === "changed" ? demoCases.map((clientCase) => clientCase.id) : [];

  return {
    id: `rule-diff-impact-${result.sourceId}`,
    ruleVersionId: source?.linkedRuleIds[0] ?? "unknown-rule",
    sourceId: result.sourceId,
    fromRule: "Version source précédente",
    toRule: "Version source contrôlée",
    effectiveFrom: source?.checkedAt ?? new Date().toISOString().slice(0, 10),
    legalBasisUrl: source?.url ?? "unknown-source-url",
    fromHash: result.previousHash,
    toHash: result.currentHash,
    impactedCaseIds,
    impactedRuns: impactedCaseIds.map((caseId) => ({
      runId: `recalc-${result.sourceId}-${caseId}`,
      caseId,
      caseLabel: "Dossier démo",
      module: source?.legalScope === "ir-pfu-cdhr" ? "ir-pfu-cdhr" : "ifi",
      metric: "Source réglementaire liée",
      amountBefore: 0,
      amountAfter: 0,
      delta: 0,
      recalculationRequired: result.status === "changed",
    })),
    amountBefore: 0,
    amountAfter: 0,
    delta: 0,
    auditEventIds: result.status === "changed" ? [`audit-${result.sourceId}-changed`] : [],
    recommendedAction:
      result.status === "changed"
        ? "Revue humaine et recalcul des dossiers impactes avant publication."
        : "Aucun recalcul requis.",
    status: result.status === "changed" ? "review_required" : "no_action",
  };
}

export function getEvidenceAdminSummary(results: EvidenceControlResult[]) {
  return {
    tenantId: demoTenant.id,
    checked: results.length,
    changed: results.filter((result) => result.status === "changed").length,
    failed: results.filter((result) => result.status === "failed").length,
    alerts: results.filter((result) => result.alert).length,
  };
}

async function fetchSourceText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "PatrimoineFiscalDemo/1.2 source-control",
      accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`SOURCE_FETCH_FAILED:${response.status}`);
  }

  return response.text();
}
