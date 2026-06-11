import { demoTenant } from "../demo-data/v1";
import { getEvidenceSource, getSourceSnapshot } from "./sources";
import { simulateDutreilV2 } from "../tax/v2-engines";
import type { AuditLogEntry, RuleDiffImpact } from "../types";

/**
 * Diff de règle Dutreil v2 → v3.
 *
 * Changements v3 (2026-06-11) :
 * - chaînage DMTG : droits liquidés sur la base après exonération 75 %
 *   (abattement 100 000 €, barème ligne directe) et économie vs sans pacte ;
 * - réduction de 50 % des droits (art. 790 I, donateur < 70 ans en pleine
 *   propriété) : ABROGÉE par la loi n° 2026-103 du 19/02/2026 pour les
 *   transmissions à compter du 21/02/2026. Sur le cas de référence (2 M€,
 *   donateur 65 ans, 1 bénéficiaire), les droits passent de 39 098 €
 *   (avec réduction) à 78 195 € (sans) : dossiers à recalculer.
 */

const sourceId = "src-bofip-dmtg-reduction-790-2026";
const ruleVersionId = "rule-dutreil-2026-v3";
const caseId = "case-claire-marc-2026";
const generatedAt = "2026-06-11T11:20:00.000Z";
const previousHash = "legifrance-dutreil-2026-m44n";

const referenceInput = {
  companyValue: 2_000_000,
  eligibleOperatingValue: 2_000_000,
  nonEligibleAssets: 0,
  children: 1,
  donorAge: 65,
  fullOwnership: true,
};

export function getDutreilRegulatoryDiff(): RuleDiffImpact {
  const source = getEvidenceSource(sourceId);
  const snapshot = getSourceSnapshot(sourceId);
  const withReduction = simulateDutreilV2({ ...referenceInput, donationBeforeFeb2026: true });
  const withoutReduction = simulateDutreilV2({ ...referenceInput, donationBeforeFeb2026: false });
  const amountBefore = Number(withReduction.computedResult?.rightsWithDutreil ?? 0);
  const amountAfter = Number(withoutReduction.computedResult?.rightsWithDutreil ?? 0);
  const delta = amountAfter - amountBefore;

  return {
    id: "rule-diff-dutreil-2026-v2-to-v3",
    ruleVersionId,
    sourceId,
    fromRule: "DUTREIL-2026.05-V2 : abattement 75 % seul, réduction 790 I applicable",
    toRule: "DUTREIL-2026.06-V3 : chaînage DMTG, réduction 790 I abrogée (loi 2026-103)",
    effectiveFrom: "2026-02-21",
    legalBasisUrl:
      source?.url ??
      "https://bofip.impots.gouv.fr/bofip/3347-PGP.html/identifiant=BOI-ENR-DMTG-20-30-20-50-20170213",
    fromHash: previousHash,
    toHash: snapshot?.contentHash ?? source?.contentHash ?? "bofip-790-reduction-50-abrogee-lf-2026",
    impactedCaseIds: [caseId],
    impactedRuns: [
      {
        runId: withoutReduction.id,
        caseId,
        caseLabel: "Claire et Marc",
        module: "dutreil",
        metric: "Droits avec pacte (2 M€, donateur 65 ans, pleine propriété)",
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
      "audit-dutreil-source-changed",
      "audit-dutreil-rule-updated",
      "audit-dutreil-recalculation-required",
    ],
    recommendedAction:
      "Revue humaine de l'abrogation de la réduction 790 I (date charnière 21/02/2026), puis recalcul des dossiers Dutreil.",
    status: "review_required",
  };
}

export function getDutreilDiffAuditEvents(): AuditLogEntry[] {
  const diff = getDutreilRegulatoryDiff();

  return [
    {
      id: "audit-dutreil-source-changed",
      tenantId: demoTenant.id,
      actorUserId: "system-source-watcher",
      action: "source.changed",
      entityType: "source",
      entityId: diff.sourceId,
      createdAt: generatedAt,
      summary: "BOFiP 790 I rattaché : réduction 50 % abrogée pour les transmissions dès le 21/02/2026.",
      metadata: { fromHash: diff.fromHash, toHash: diff.toHash },
    },
    {
      id: "audit-dutreil-rule-updated",
      tenantId: demoTenant.id,
      actorUserId: "user-expert-avocat",
      action: "rule.updated",
      entityType: "rule",
      entityId: diff.ruleVersionId,
      createdAt: "2026-06-11T11:25:00.000Z",
      summary: "Règle Dutreil mise à jour : V2 vers V3 (chaînage DMTG, abrogation réduction 790 I).",
      metadata: { effectiveFrom: diff.effectiveFrom, delta: diff.delta },
    },
    {
      id: "audit-dutreil-recalculation-required",
      tenantId: demoTenant.id,
      actorUserId: "system-simulation-engine",
      action: "simulation.recalculation_required",
      entityType: "simulation",
      entityId: diff.impactedRuns[0].runId,
      createdAt: "2026-06-11T11:30:00.000Z",
      summary: "Recalcul requis sur les dossiers Dutreil : réduction 50 % non applicable après le 21/02/2026.",
      metadata: { caseId, amountBefore: diff.amountBefore, amountAfter: diff.amountAfter },
    },
  ];
}
