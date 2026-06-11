import type { AmlRiskScoring } from "../types";

/**
 * Scoring LCB-FT — directive (UE) 2015/849, lignes directrices Tracfin/ACPR.
 * Score additif transparent :
 * - PPE : +3 ; pays à risque élevé : +3 (moyen : +1) ;
 * - origine des fonds non documentée : +2 ;
 * - bénéficiaire effectif non identifié : +3.
 * Vigilance : 0-2 standard · 3-5 renforcée · ≥6 ou bénéficiaire effectif
 * manquant → examen renforcé et déclaration de soupçon Tracfin à envisager.
 * Le produit signale, il ne décide jamais seul d'une déclaration.
 */

export type AmlInput = Pick<
  AmlRiskScoring,
  "isPep" | "countryRisk" | "sourceOfFundsDocumented" | "beneficialOwnerIdentified"
>;

export const defaultAmlInput: AmlInput = {
  isPep: false,
  countryRisk: "faible",
  sourceOfFundsDocumented: true,
  beneficialOwnerIdentified: true,
};

export function scoreAmlRisk(input: AmlInput, caseId = "case-claire-marc-2026"): AmlRiskScoring {
  const rationale: string[] = [];
  let score = 0;

  if (input.isPep) {
    score += 3;
    rationale.push("Personne politiquement exposée : vigilance complémentaire obligatoire.");
  }
  if (input.countryRisk === "eleve") {
    score += 3;
    rationale.push("Pays à risque élevé (liste GAFI/UE).");
  } else if (input.countryRisk === "moyen") {
    score += 1;
    rationale.push("Pays à vigilance accrue.");
  }
  if (!input.sourceOfFundsDocumented) {
    score += 2;
    rationale.push("Origine des fonds non documentée.");
  }
  if (!input.beneficialOwnerIdentified) {
    score += 3;
    rationale.push("Bénéficiaire effectif non identifié : blocage de la relation d'affaires.");
  }
  if (rationale.length === 0) rationale.push("Aucun critère de risque détecté sur les éléments déclarés.");

  const vigilanceLevel: AmlRiskScoring["vigilanceLevel"] =
    score >= 6 || !input.beneficialOwnerIdentified
      ? "declaration-soupcon"
      : score >= 3
        ? "renforcee"
        : "standard";

  return {
    id: `aml-${caseId}`,
    caseId,
    ...input,
    score,
    vigilanceLevel,
    rationale,
    scoredAt: "2026-06-11T15:15:00.000Z",
  };
}
