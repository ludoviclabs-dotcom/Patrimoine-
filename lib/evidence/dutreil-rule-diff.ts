import { demoTenant } from "../demo-data/v1";
import { getEvidenceSource, getSourceSnapshot } from "./sources";
import { simulateDutreilV2 } from "../tax/v2-engines";
import type { AuditLogEntry, RuleDiffImpact } from "../types";

/**
 * Diff de règle Dutreil v3 → v4 — correction P0 (TAX-P0-001).
 *
 * La V3 traitait la réduction de 50 % des droits comme abrogée par la LF 2026
 * pour les transmissions à compter du 21/02/2026, par confusion avec l'ancien
 * article 790 I. Le référentiel réglementaire du 18/08/2026 établit que le
 * dispositif applicable est l'article 790 CGI, toujours en vigueur et non
 * abrogé par la LF 2026 (REGLEMENTATION_AOUT_2026.md § 7.5 et § 17).
 *
 * Sur le cas de référence (2 M€, donateur 65 ans, pleine propriété,
 * 1 bénéficiaire), les droits avec pacte reviennent de 78 195 € (V3, réduction
 * refusée à tort) à 39 098 € (V4, réduction art. 790 appliquée) : les dossiers
 * liquidés sous la V3 surévaluaient les droits et doivent être recalculés.
 */

const sourceId = "src-bofip-dmtg-reduction-790-2026";
const ruleVersionId = "rule-dutreil-2026-v4";
const caseId = "case-claire-marc-2026";
const generatedAt = "2026-08-19T09:00:00.000Z";
const previousHash = "bofip-790-reduction-50-abrogee-lf-2026";

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
  // V3 (erronée) : réduction refusée pour une donation postérieure au 21/02/2026.
  // V4 (corrigée) : réduction art. 790 appliquée, sans condition de date.
  const corrected = simulateDutreilV2(referenceInput);
  // V3 : droits pleins (réduction art. 790 refusée à tort). V4 : après réduction.
  const amountBefore = Number(corrected.computedResult?.rightsBeforeArticle790 ?? 0);
  const amountAfter = Number(corrected.computedResult?.rightsWithDutreil ?? 0);
  const delta = amountAfter - amountBefore;

  return {
    id: "rule-diff-dutreil-2026-v3-to-v4",
    ruleVersionId,
    sourceId,
    fromRule: "DUTREIL-2026.06-V3 : réduction traitée comme abrogée (confusion art. 790 I)",
    toRule: "DUTREIL-2026.08-V4 : réduction art. 790 CGI maintenue, sans condition de date",
    effectiveFrom: "2026-01-01",
    legalBasisUrl:
      source?.url ??
      "https://bofip.impots.gouv.fr/bofip/3347-PGP.html/identifiant=BOI-ENR-DMTG-20-30-20-50-20170213",
    fromHash: previousHash,
    toHash: snapshot?.contentHash ?? source?.contentHash ?? "bofip-790-reduction-50-en-vigueur-2026-08",
    impactedCaseIds: [caseId],
    impactedRuns: [
      {
        runId: corrected.id,
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
      "Recalculer les dossiers Dutreil liquidés sous la V3 : la réduction de 50 % de l'art. 790 CGI leur a été refusée à tort, les droits ont été surévalués.",
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
      summary:
        "BOFiP art. 790 recontrôlé au 18/08/2026 : la réduction de 50 % n'a pas été abrogée par la LF 2026 (confusion avec l'ancien art. 790 I).",
      metadata: { fromHash: diff.fromHash, toHash: diff.toHash },
    },
    {
      id: "audit-dutreil-rule-updated",
      tenantId: demoTenant.id,
      actorUserId: "user-expert-avocat",
      action: "rule.updated",
      entityType: "rule",
      entityId: diff.ruleVersionId,
      createdAt: "2026-08-19T09:05:00.000Z",
      summary:
        "Règle Dutreil corrigée : V3 vers V4 (réduction art. 790 rétablie, pivot 21/02/2026 sur l'engagement individuel).",
      metadata: { effectiveFrom: diff.effectiveFrom, delta: diff.delta },
    },
    {
      id: "audit-dutreil-recalculation-required",
      tenantId: demoTenant.id,
      actorUserId: "system-simulation-engine",
      action: "simulation.recalculation_required",
      entityType: "simulation",
      entityId: diff.impactedRuns[0].runId,
      createdAt: "2026-08-19T09:10:00.000Z",
      summary:
        "Recalcul requis sur les dossiers Dutreil : la réduction de 50 % de l'art. 790 est applicable, les droits liquidés sous la V3 étaient surévalués.",
      metadata: { caseId, amountBefore: diff.amountBefore, amountAfter: diff.amountAfter },
    },
  ];
}
