import { demoTenant } from "../demo-data/v1";
import { getEvidenceSource, getSourceSnapshot } from "./sources";
import { computePvImmo, simulatePvImmoV3 } from "../tax/engines/pv-immo";
import type { AuditLogEntry, RuleDiffImpact } from "../types";

/**
 * Diff de règle plus-value immobilière v1 → v2.
 *
 * Changements v2 (2026-06-11) :
 * - options forfait frais d'acquisition 7,5 % et forfait travaux 15 % (> 5 ans) ;
 * - arrondi officiel (bases exactes, impôt tronqué à l'euro) au lieu de
 *   l'arrondi au plus proche par étape — aligne le moteur sur les exemples
 *   BOFiP/2048-IMM (66 250 € / 16 ans → 4 279 € + 9 326 €).
 */

const sourceId = "src-impots-2048-imm-2026";
const ruleVersionId = "rule-plus-value-immobiliere-2026-v2";
const caseId = "case-claire-marc-2026";
const generatedAt = "2026-06-11T09:30:00.000Z";
const previousHash = "bofip-pvi-2026-05-e55f";

/** Reproduit l'ancien arrondi v1 (bases et impôts arrondis au plus proche). */
function legacyV1Tax(grossGain: number, irAllowance: number, psAllowance: number) {
  const incomeTaxBase = Math.round(grossGain * (1 - irAllowance));
  const socialTaxBase = Math.round(grossGain * (1 - psAllowance));
  return Math.round(incomeTaxBase * 0.19) + Math.round(socialTaxBase * 0.172);
}

export function getPvImmoRegulatoryDiff(): RuleDiffImpact {
  const source = getEvidenceSource(sourceId);
  const snapshot = getSourceSnapshot(sourceId);

  // Cas de référence officiel : PV brute 66 250 €, 16 années révolues.
  const reference = computePvImmo({
    salePrice: 266_250,
    purchasePrice: 200_000,
    acquisitionCosts: 0,
    works: 0,
    yearsHeld: 16,
  });
  const amountBefore = legacyV1Tax(
    reference.grossGain,
    reference.incomeTaxAllowanceRate,
    reference.socialAllowanceRate,
  );
  const amountAfter = reference.incomeTax + reference.socialTax;
  const delta = amountAfter - amountBefore;
  const currentRun = simulatePvImmoV3();

  return {
    id: "rule-diff-pv-immo-2026-v1-to-v2",
    ruleVersionId,
    sourceId,
    fromRule: "PV-IMMO-2026.1-pilot : structure de calcul, arrondi au plus proche",
    toRule: "PV-IMMO-2026.06-V2 : forfaits 7,5 %/15 % et arrondi officiel 2048-IMM",
    effectiveFrom: "2026-06-11",
    legalBasisUrl:
      source?.url ??
      "https://www.impots.gouv.fr/formulaire/2048-imm-sd/plus-values-cessions-dimmeubles-ou-de-droits-immobiliers",
    fromHash: previousHash,
    toHash: snapshot?.contentHash ?? source?.contentHash ?? "impots-2048-imm-2026-forfaits-75-15",
    impactedCaseIds: [caseId],
    impactedRuns: [
      {
        runId: currentRun.id,
        caseId,
        caseLabel: "Claire et Marc",
        module: "plus-value-immo",
        metric: "Impôt indicatif plus-value (cas de référence 66 250 € / 16 ans)",
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
      "audit-pv-immo-source-changed",
      "audit-pv-immo-rule-updated",
      "audit-pv-immo-recalculation-required",
    ],
    recommendedAction:
      "Revue humaine du passage v1 → v2 (forfaits et arrondi officiel), puis recalcul des dossiers avec plus-value immobilière.",
    status: "review_required",
  };
}

export function getPvImmoDiffAuditEvents(): AuditLogEntry[] {
  const diff = getPvImmoRegulatoryDiff();

  return [
    {
      id: "audit-pv-immo-source-changed",
      tenantId: demoTenant.id,
      actorUserId: "system-source-watcher",
      action: "source.changed",
      entityType: "source",
      entityId: diff.sourceId,
      createdAt: generatedAt,
      summary: "Notice 2048-IMM rattachée : forfaits 7,5 %/15 % et conventions d'arrondi documentés.",
      metadata: { fromHash: diff.fromHash, toHash: diff.toHash },
    },
    {
      id: "audit-pv-immo-rule-updated",
      tenantId: demoTenant.id,
      actorUserId: "user-expert-avocat",
      action: "rule.updated",
      entityType: "rule",
      entityId: diff.ruleVersionId,
      createdAt: "2026-06-11T09:35:00.000Z",
      summary: "Règle plus-value immobilière mise à jour : 2026.1-pilot vers PV-IMMO-2026.06-V2.",
      metadata: { effectiveFrom: diff.effectiveFrom, delta: diff.delta },
    },
    {
      id: "audit-pv-immo-recalculation-required",
      tenantId: demoTenant.id,
      actorUserId: "system-simulation-engine",
      action: "simulation.recalculation_required",
      entityType: "simulation",
      entityId: diff.impactedRuns[0].runId,
      createdAt: "2026-06-11T09:40:00.000Z",
      summary: "Recalcul requis sur les dossiers plus-value : conventions d'arrondi et forfaits v2.",
      metadata: { caseId, amountBefore: diff.amountBefore, amountAfter: diff.amountAfter },
    },
  ];
}
