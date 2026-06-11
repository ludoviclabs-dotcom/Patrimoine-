import { appendAuditEventToRepository } from "../audit/repository";
import { demoTenant } from "../demo-data/v1";
import { simulateProductAdequacyV24 } from "../tax/v2-engines";
import { stableHash } from "./hash";
import { toAdequacyInputs } from "./kyc";
import type { KycProfile, ProfessionalDocument, TaxRun } from "../types";

/**
 * Déclaration d'adéquation MIF 2 — générée depuis le profil KYC et le run
 * d'adéquation produit, archivée via l'audit append-only (kyc.captured).
 * Aucune recommandation automatique : la déclaration liste les écarts et
 * impose la revue humaine.
 */

export type AdequationDeclaration = {
  document: ProfessionalDocument;
  run: TaxRun;
  mismatches: string[];
  conclusion: string;
};

export function buildAdequationDeclaration(
  profile: KycProfile,
  { productRisk = 4, targetMarketAligned = false } = {},
): AdequationDeclaration {
  const run = simulateProductAdequacyV24(toAdequacyInputs(profile, productRisk, targetMarketAligned));
  const mismatches = [
    run.computedResult?.riskMismatch ? "Risque produit supérieur à la tolérance déclarée" : null,
    run.computedResult?.horizonMismatch ? "Horizon client inférieur au besoin du produit" : null,
    run.computedResult?.durabilityGap ? "Préférence de durabilité non documentée" : null,
    !targetMarketAligned ? "Marché cible non démontré" : null,
  ].filter((item): item is string => Boolean(item));

  const hash = stableHash(JSON.stringify({ profile, mismatches }));
  const document: ProfessionalDocument = {
    id: `doc-adequation-${hash}`,
    tenantId: demoTenant.id,
    caseId: profile.caseId,
    kind: "rapport-adequation",
    title: "Déclaration d'adéquation MIF 2",
    status: "issued_for_review",
    generatedAt: "2026-06-11T15:20:00.000Z",
    version: "V3.0",
    hash: `adq-${hash}`,
    requiredInputs: ["Profil KYC", "Préférences durabilité", "Run adéquation", "Marché cible"],
    professionalValidationRequired: true,
  };

  appendAuditEventToRepository({
    id: `audit-kyc-captured-${hash}`,
    tenantId: demoTenant.id,
    actorUserId: "user-conseiller-demo",
    action: "kyc.captured",
    entityType: "document",
    entityId: document.id,
    createdAt: "2026-06-11T15:20:00.000Z",
    summary: `Profil KYC capturé et déclaration d'adéquation générée (${mismatches.length} écart(s)).`,
  });

  return {
    document,
    run,
    mismatches,
    conclusion:
      mismatches.length > 0
        ? `${mismatches.length} écart(s) d'adéquation : revue conseiller obligatoire avant toute souscription.`
        : "Aucun écart détecté sur les éléments déclarés — validation humaine requise avant souscription.",
  };
}
