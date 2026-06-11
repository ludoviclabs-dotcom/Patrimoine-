import { demoTenant } from "../demo-data/v1";
import { getEvidenceSource, getSourceSnapshot } from "./sources";
import { computeSciIrVsIs } from "../tax/engines/sci-arbitrage";
import { simulatePerDeductionV2 } from "../tax/v2-engines";
import type { AuditLogEntry, RuleDiffImpact } from "../types";

/**
 * Diffs de règles de la couche v3.2 (dirigeant & holding).
 *
 * - PER v1 → v2 : plafonds 2026 calculés (37 680 / 88 911 €), report des
 *   reliquats porté de 3 à 5 ans, blocage de la déduction à partir de 70 ans,
 *   économie d'impôt chiffrée par TMI.
 * - SCI v1 → v2 : le stub flux/exposition devient un comparatif fiscal complet
 *   IR vs IS (amortissements, barème IS, plus-value de sortie sur VNC).
 */

const caseId = "case-claire-marc-2026";

export function getPerRegulatoryDiff(): RuleDiffImpact {
  const sourceId = "src-legifrance-pass-2026";
  const source = getEvidenceSource(sourceId);
  const snapshot = getSourceSnapshot(sourceId);
  // Salarié à hauts revenus : l'ancien moteur exigeait un plafond saisi
  // (12 000 € par défaut) ; le nouveau calcule 37 680 €.
  const run = simulatePerDeductionV2({
    voluntaryPayments: 40_000,
    status: "salarie",
    professionalIncome: 400_000,
  });
  const amountBefore = 12_000;
  const amountAfter = Number(run.computedResult?.annualCeiling ?? 0);

  return {
    id: "rule-diff-per-2026-v1-to-v2",
    ruleVersionId: "rule-per-deduction-2026-v2",
    sourceId,
    fromRule: "PER-2026.06-V1 : plafond saisi, report 3 ans",
    toRule: "PER-2026.06-V2 : plafonds calculés 37 680/88 911 €, report 5 ans, blocage 70 ans",
    effectiveFrom: "2026-06-11",
    legalBasisUrl: source?.url ?? "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052701051",
    fromHash: "per-2026-v1-plafond-saisi",
    toHash: snapshot?.contentHash ?? source?.contentHash ?? "pass-2026-48060-per-37680-88911-report-5-ans",
    impactedCaseIds: [caseId],
    impactedRuns: [
      {
        runId: run.id,
        caseId,
        caseLabel: "Claire et Marc",
        module: "per",
        metric: "Plafond annuel retenu (salarié, revenus 400 000 €)",
        amountBefore,
        amountAfter,
        delta: amountAfter - amountBefore,
        recalculationRequired: true,
      },
    ],
    amountBefore,
    amountAfter,
    delta: amountAfter - amountBefore,
    auditEventIds: ["audit-per-rule-updated"],
    recommendedAction:
      "Revue des plafonds PER sur l'avis d'imposition réel, puis recalcul des dossiers avec versements volontaires.",
    status: "review_required",
  };
}

export function getSciRegulatoryDiff(): RuleDiffImpact {
  const sourceId = "src-bofip-sci-is-2026";
  const source = getEvidenceSource(sourceId);
  const snapshot = getSourceSnapshot(sourceId);
  const result = computeSciIrVsIs();
  // L'ancien stub ne chiffrait aucune fiscalité (0 €) ; le moteur v2 chiffre
  // l'écart annuel IR vs IS sur le cas de référence.
  const amountBefore = 0;
  const amountAfter = result.annualAdvantageIs;

  return {
    id: "rule-diff-sci-2026-v1-to-v2",
    ruleVersionId: "rule-sci-arbitrage-2026-v2",
    sourceId,
    fromRule: "SCI-2026.1-pilot : flux et exposition, fiscalité non chiffrée",
    toRule: "SCI-IR-IS-2026.06-V2 : comparatif fiscal complet IR vs IS et sortie sur VNC",
    effectiveFrom: "2026-06-11",
    legalBasisUrl:
      source?.url ?? "https://bofip.impots.gouv.fr/bofip/4561-PGP.html/identifiant=BOI-IS-CHAMP-40",
    fromHash: "sci-2026-v1-flux-seulement",
    toHash: snapshot?.contentHash ?? source?.contentHash ?? "bofip-sci-option-is-amortissements-vnc",
    impactedCaseIds: [caseId],
    impactedRuns: [
      {
        runId: "taxrun-sci-arbitrage-claire-marc-v3",
        caseId,
        caseLabel: "Claire et Marc",
        module: "sci-arbitrage",
        metric: "Avantage annuel indicatif de l'IS (cas de référence)",
        amountBefore,
        amountAfter,
        delta: amountAfter - amountBefore,
        recalculationRequired: true,
      },
    ],
    amountBefore,
    amountAfter,
    delta: amountAfter - amountBefore,
    auditEventIds: ["audit-sci-rule-updated"],
    recommendedAction:
      "Revue du comparatif IR/IS par l'expert-comptable (distribution et liquidation non modélisées).",
    status: "review_required",
  };
}

export function getV32DiffAuditEvents(): AuditLogEntry[] {
  const perDiff = getPerRegulatoryDiff();
  const sciDiff = getSciRegulatoryDiff();

  return [
    {
      id: "audit-per-rule-updated",
      tenantId: demoTenant.id,
      actorUserId: "user-expert-avocat",
      action: "rule.updated",
      entityType: "rule",
      entityId: perDiff.ruleVersionId,
      createdAt: "2026-06-11T12:30:00.000Z",
      summary: "Règle PER mise à jour : plafonds 2026 calculés, report 5 ans, blocage 70 ans.",
      metadata: { effectiveFrom: perDiff.effectiveFrom, delta: perDiff.delta },
    },
    {
      id: "audit-sci-rule-updated",
      tenantId: demoTenant.id,
      actorUserId: "user-expert-avocat",
      action: "rule.updated",
      entityType: "rule",
      entityId: sciDiff.ruleVersionId,
      createdAt: "2026-06-11T12:35:00.000Z",
      summary: "Règle SCI mise à jour : comparatif fiscal IR vs IS complet avec sortie sur VNC.",
      metadata: { effectiveFrom: sciDiff.effectiveFrom, delta: sciDiff.delta },
    },
  ];
}
