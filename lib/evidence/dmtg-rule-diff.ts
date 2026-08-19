import { demoTenant } from "../demo-data/v1";
import { getEvidenceSource, getSourceSnapshot } from "./sources";
import { simulateTransmissionV2 } from "../tax/v2-engines";
import type { AuditLogEntry, RuleDiffImpact } from "../types";

/**
 * PF-02B2 — correction de l'arrondi DMTG : « arrondi par tranche » (V1) →
 * « arrondi final unique à l'euro » (V2, rule-dmtg-bareme-2026-v2).
 *
 * La V1 arrondissait chaque tranche du barème avant sommation. Cette
 * convention ne reproduit PAS la méthode officielle : BOFiP BOI-ENR-DG-30
 * § 100 arrondit une seule fois, sur le montant final des droits dus, jamais
 * par tranche ; confirmé par l'exemple chiffré officiel de
 * service-public.gouv.fr (fiche F14205, 200 000 € donnés à un enfant,
 * abattement 100 000 € : tranches à 403,60 € / 403,70 € / 573,45 € /
 * 16 813,60 €, total exact 18 194,35 €, droits dus arrondis à 18 194 €).
 *
 * Sur l'exemple à 50 000 € taxables en ligne directe, l'arrondi par tranche
 * donnait 404 + 404 + 573 + 6 814 = 8 195 € au lieu des 8 194 € corrects.
 * Le moteur transmission par défaut (300 000 €, 2 enfants) passe de 16 390 €
 * (V1, erroné) à 16 388 € (V2, correct) : les dossiers liquidés sous la V1
 * ont surévalué les droits d'1 € par part et sont signalés à recalculer.
 */

const sourceId = "src-bofip-enr-dg-30-arrondi-2026";
const ruleVersionId = "rule-dmtg-bareme-2026-v2";
const caseId = "case-claire-marc-2026";
const generatedAt = "2026-08-19T11:20:00.000Z";
const previousHash = "sp-dmtg-2026-777-779-784-multi-liens";

export function getDmtgRegulatoryDiff(): RuleDiffImpact {
  const source = getEvidenceSource(sourceId);
  const snapshot = getSourceSnapshot(sourceId);
  const currentRun = simulateTransmissionV2();
  const amountAfter = Number(currentRun.computedResult?.indicativeRights ?? 0);
  // Ancien comportement (V1, erroné) : arrondi par tranche (8 195 € par part
  // de 50 000 € taxables, au lieu de 8 194 € au réel arrondi final unique).
  const amountBefore = 8_195 * 2;
  const delta = amountAfter - amountBefore;

  return {
    id: "rule-diff-dmtg-2026-arrondi-par-tranche",
    ruleVersionId,
    sourceId,
    fromRule: "DMTG-2026.06-V1 : barèmes multi-liens art. 777, arrondi par tranche (erroné)",
    toRule: "DMTG-2026.08-V2 : barèmes multi-liens art. 777, arrondi final unique à l'euro (BOI-ENR-DG-30)",
    effectiveFrom: "2026-06-11",
    legalBasisUrl:
      source?.url ?? "https://bofip.impots.gouv.fr/bofip/2030-PGP.html/identifiant=BOI-ENR-DG-30-20131223",
    fromHash: previousHash,
    toHash: snapshot?.contentHash ?? source?.contentHash ?? "bofip-enr-dg-30-arrondi-2026-08-19",
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
      "Corriger l'arrondi par tranche vers l'arrondi final unique (BOI-ENR-DG-30), puis recalculer les dossiers transmission liquidés sous la V1.",
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
      summary:
        "Source BOFiP BOI-ENR-DG-30 rattachée : arrondi final unique à l'euro sur les droits d'enregistrement, confirmé par l'exemple chiffré service-public.gouv.fr F14205.",
      metadata: { fromHash: diff.fromHash, toHash: diff.toHash },
    },
    {
      id: "audit-dmtg-rule-updated",
      tenantId: demoTenant.id,
      actorUserId: "user-expert-avocat",
      action: "rule.updated",
      entityType: "rule",
      entityId: diff.ruleVersionId,
      createdAt: "2026-08-19T11:25:00.000Z",
      summary:
        "Règle transmission corrigée : barème DMTG art. 777 avec arrondi final unique à l'euro (l'arrondi par tranche de la V1 est abandonné).",
      metadata: { effectiveFrom: diff.effectiveFrom, delta: diff.delta },
    },
    {
      id: "audit-dmtg-recalculation-required",
      tenantId: demoTenant.id,
      actorUserId: "system-simulation-engine",
      action: "simulation.recalculation_required",
      entityType: "simulation",
      entityId: diff.impactedRuns[0].runId,
      createdAt: "2026-08-19T11:30:00.000Z",
      summary:
        "Recalcul requis sur les dossiers transmission : la V1 (arrondi par tranche) surévaluait les droits d'1 € par part.",
      metadata: { caseId, amountBefore: diff.amountBefore, amountAfter: diff.amountAfter },
    },
  ];
}
