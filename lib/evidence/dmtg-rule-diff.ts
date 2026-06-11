import { demoTenant } from "../demo-data/v1";
import { getEvidenceSource, getSourceSnapshot } from "./sources";
import { simulateTransmissionV2 } from "../tax/v2-engines";
import type { AuditLogEntry, RuleDiffImpact } from "../types";

/**
 * Diff de règle transmission : barème ligne directe « arrondi final » →
 * barème DMTG multi-liens « arrondi par tranche » (rule-dmtg-bareme-2026-v1).
 *
 * Sur l'exemple officiel (part taxable 50 000 € en ligne directe), l'arrondi
 * par tranche donne 404 + 404 + 573 + 6 814 = 8 195 € au lieu de 8 194 €.
 * Le moteur transmission par défaut (300 000 €, 2 enfants) passe de 16 388 €
 * à 16 390 € : les dossiers concernés sont signalés à recalculer.
 */

const sourceId = "src-impots-dmtg-bareme-2026";
const ruleVersionId = "rule-dmtg-bareme-2026-v1";
const caseId = "case-claire-marc-2026";
const generatedAt = "2026-06-11T10:20:00.000Z";
const previousHash = "legifrance-civil-2026-05-d44e";

export function getDmtgRegulatoryDiff(): RuleDiffImpact {
  const source = getEvidenceSource(sourceId);
  const snapshot = getSourceSnapshot(sourceId);
  const currentRun = simulateTransmissionV2();
  const amountAfter = Number(currentRun.computedResult?.indicativeRights ?? 0);
  // Ancien comportement : arrondi final (8 194 € par part de 50 000 € taxables).
  const amountBefore = 8_194 * 2;
  const delta = amountAfter - amountBefore;

  return {
    id: "rule-diff-dmtg-2026-arrondi-par-tranche",
    ruleVersionId,
    sourceId,
    fromRule: "TRANSMISSION-2026.1 : barème ligne directe, arrondi final",
    toRule: "DMTG-2026.06-V1 : barèmes multi-liens art. 777, arrondi par tranche",
    effectiveFrom: "2026-06-11",
    legalBasisUrl: source?.url ?? "https://www.service-public.gouv.fr/particuliers/vosdroits/F14203",
    fromHash: previousHash,
    toHash: snapshot?.contentHash ?? source?.contentHash ?? "sp-dmtg-2026-777-779-784-multi-liens",
    impactedCaseIds: [caseId],
    impactedRuns: [
      {
        runId: currentRun.id,
        caseId,
        caseLabel: "Claire et Marc",
        module: "transmission",
        metric: "Droits indicatifs (300 000 €, 2 enfants, ligne directe)",
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
      "audit-dmtg-source-changed",
      "audit-dmtg-rule-updated",
      "audit-dmtg-recalculation-required",
    ],
    recommendedAction:
      "Revue humaine du passage à l'arrondi par tranche et aux barèmes multi-liens, puis recalcul des dossiers transmission.",
    status: "review_required",
  };
}

export function getDmtgDiffAuditEvents(): AuditLogEntry[] {
  const diff = getDmtgRegulatoryDiff();

  return [
    {
      id: "audit-dmtg-source-changed",
      tenantId: demoTenant.id,
      actorUserId: "system-source-watcher",
      action: "source.changed",
      entityType: "source",
      entityId: diff.sourceId,
      createdAt: generatedAt,
      summary: "Source DMTG service-public rattachée : barèmes multi-liens et rappel fiscal 15 ans.",
      metadata: { fromHash: diff.fromHash, toHash: diff.toHash },
    },
    {
      id: "audit-dmtg-rule-updated",
      tenantId: demoTenant.id,
      actorUserId: "user-expert-avocat",
      action: "rule.updated",
      entityType: "rule",
      entityId: diff.ruleVersionId,
      createdAt: "2026-06-11T10:25:00.000Z",
      summary: "Règle transmission mise à jour : barème DMTG art. 777 avec arrondi par tranche.",
      metadata: { effectiveFrom: diff.effectiveFrom, delta: diff.delta },
    },
    {
      id: "audit-dmtg-recalculation-required",
      tenantId: demoTenant.id,
      actorUserId: "system-simulation-engine",
      action: "simulation.recalculation_required",
      entityType: "simulation",
      entityId: diff.impactedRuns[0].runId,
      createdAt: "2026-06-11T10:30:00.000Z",
      summary: "Recalcul requis sur les dossiers transmission : delta d'arrondi par tranche détecté.",
      metadata: { caseId, amountBefore: diff.amountBefore, amountAfter: diff.amountAfter },
    },
  ];
}
