import type { KycProfile } from "../types";

/**
 * Questionnaire de connaissance client (KYC) — MIF 2 / DDA, préférences de
 * durabilité incluses (règlement délégué 2021/1253). Le profil alimente le
 * moteur d'adéquation produit (simulateProductAdequacyV24) : la chaîne
 * KYC → adéquation est testée de bout en bout.
 */

export type KycInput = Omit<KycProfile, "id" | "caseId" | "capturedAt">;

export const defaultKycInput: KycInput = {
  knowledgeLevel: "informe",
  experienceYears: 6,
  lossCapacityPercent: 15,
  riskTolerance: 3,
  horizonYears: 6,
  sustainabilityPreference: true,
  sustainabilityDocumented: false,
};

export function buildKycProfile(input: KycInput, caseId = "case-claire-marc-2026"): KycProfile {
  const clamped = {
    ...input,
    riskTolerance: Math.min(7, Math.max(1, Math.round(input.riskTolerance))),
    lossCapacityPercent: Math.min(100, Math.max(0, input.lossCapacityPercent)),
    horizonYears: Math.max(0, input.horizonYears),
    experienceYears: Math.max(0, input.experienceYears),
  };

  return {
    id: `kyc-${caseId}`,
    caseId,
    ...clamped,
    capturedAt: "2026-06-11T15:10:00.000Z",
  };
}

/** Pont KYC → moteur d'adéquation produit v2.4. */
export function toAdequacyInputs(profile: KycProfile, productRisk = 4, targetMarketAligned = false) {
  return {
    horizonYears: profile.horizonYears,
    riskTolerance: profile.riskTolerance,
    productRisk,
    sustainabilityPreference: profile.sustainabilityPreference,
    sustainabilityDocumented: profile.sustainabilityDocumented,
    targetMarketAligned,
  };
}
