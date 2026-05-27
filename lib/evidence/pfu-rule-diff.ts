import { demoTenant } from "../demo-data/v1";
import { getEvidenceSource, getSourceSnapshot } from "./sources";
import { simulateIrPfuCdhr } from "../tax/v2-engines";
import type { AuditLogEntry, RuleDiffImpact } from "../types";

const sourceId = "src-service-public-pfu-2026";
const ruleVersionId = "rule-ir-pfu-cdhr-2026-v2";
const caseId = "case-claire-marc-2026";
const generatedAt = "2026-05-27T09:45:00.000Z";
const previousHash = "sp-entreprendre-pfu-a18796-2025-30-0";

export function getPfuRegulatoryDiff(): RuleDiffImpact {
  const source = getEvidenceSource(sourceId);
  const snapshot = getSourceSnapshot(sourceId);
  const currentRun = simulateIrPfuCdhr({ pfuRate: 0.314 });
  const capitalIncome = Number(currentRun.computedResult?.capitalIncome ?? 120_000);
  const amountBefore = Math.round(capitalIncome * 0.3);
  const amountAfter = Math.round(capitalIncome * 0.314);
  const delta = amountAfter - amountBefore;

  return {
    id: "rule-diff-pfu-2026-30-to-31-4",
    ruleVersionId,
    sourceId,
    fromRule: "PFU-2025.12 : taux global 30 %",
    toRule: "PFU-2026.01 : taux global 31,4 %",
    effectiveFrom: "2026-01-01",
    legalBasisUrl: source?.url ?? "https://entreprendre.service-public.gouv.fr/actualites/A18796",
    fromHash: previousHash,
    toHash: snapshot?.contentHash ?? source?.contentHash ?? "sp-entreprendre-pfu-a18796-2026-31-4",
    impactedCaseIds: [caseId],
    impactedRuns: [
      {
        runId: currentRun.id,
        caseId,
        caseLabel: "Claire et Marc",
        module: "ir-pfu-cdhr",
        metric: "PFU sur revenus de capitaux",
        amountBefore,
        amountAfter,
        delta,
        recalculationRequired: true,
      },
    ],
    amountBefore,
    amountAfter,
    delta,
    auditEventIds: [
      "audit-pfu-source-changed",
      "audit-pfu-rule-updated",
      "audit-pfu-recalculation-required",
    ],
    recommendedAction:
      "Revue humaine du passage PFU 30 % à 31,4 %, puis recalcul des dossiers avec revenus de capitaux.",
    status: "review_required",
  };
}

export function getPfuDiffAuditEvents(): AuditLogEntry[] {
  const diff = getPfuRegulatoryDiff();

  return [
    {
      id: "audit-pfu-source-changed",
      tenantId: demoTenant.id,
      actorUserId: "system-source-watcher",
      action: "source.changed",
      entityType: "source",
      entityId: diff.sourceId,
      createdAt: generatedAt,
      summary: "Source Service-Public PFU modifiée : taux 31,4 % détecté pour 2026.",
      metadata: { fromHash: diff.fromHash, toHash: diff.toHash },
    },
    {
      id: "audit-pfu-rule-updated",
      tenantId: demoTenant.id,
      actorUserId: "user-expert-avocat",
      action: "rule.updated",
      entityType: "rule",
      entityId: diff.ruleVersionId,
      createdAt: "2026-05-27T09:50:00.000Z",
      summary: "Règle IR/PFU/CDHR mise à jour : PFU-2025.12 vers PFU-2026.01.",
      metadata: { effectiveFrom: diff.effectiveFrom, delta: diff.delta },
    },
    {
      id: "audit-pfu-recalculation-required",
      tenantId: demoTenant.id,
      actorUserId: "system-simulation-engine",
      action: "simulation.recalculation_required",
      entityType: "simulation",
      entityId: diff.impactedRuns[0].runId,
      createdAt: "2026-05-27T09:55:00.000Z",
      summary: "Recalcul requis sur Claire et Marc : impact PFU positif détecté.",
      metadata: { caseId, amountBefore: diff.amountBefore, amountAfter: diff.amountAfter },
    },
  ];
}
