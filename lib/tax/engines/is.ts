import { demoTenant } from "../../demo-data/v1";
import { demoHousehold } from "../../demo-data/household";
import { createTaxRunFactory, makeStep } from "../engine-kit";

/**
 * Impôt sur les sociétés 2026 — vérifié le 11/06/2026 sur
 * entreprendre.service-public.gouv.fr (fiche F23575) :
 * - taux normal 25 % ;
 * - taux réduit 15 % jusqu'à 42 500 € de bénéfice si CA ≤ 10 M€ et capital
 *   détenu à 75 % au moins par des personnes physiques ;
 * - contribution sociale 3,3 % sur la fraction d'IS excédant 763 000 €
 *   (art. 235 ter ZC — seuil hors fiche, étape marquée à revoir).
 */

export const IS_REDUCED_RATE = 0.15;
export const IS_STANDARD_RATE = 0.25;
export const IS_REDUCED_CEILING = 42_500;
export const IS_REDUCED_TURNOVER_LIMIT = 10_000_000;
export const IS_SOCIAL_CONTRIBUTION_THRESHOLD = 763_000;
export const IS_SOCIAL_CONTRIBUTION_RATE = 0.033;

export type IsInput = {
  profit?: number;
  turnover?: number;
  individualOwnershipPercent?: number;
};

export function computeIs({
  profit = 120_000,
  turnover = 900_000,
  individualOwnershipPercent = 100,
}: IsInput = {}) {
  const positiveProfit = Math.max(0, profit);
  const reducedRateEligible =
    turnover <= IS_REDUCED_TURNOVER_LIMIT && individualOwnershipPercent >= 75;
  const reducedBase = reducedRateEligible ? Math.min(positiveProfit, IS_REDUCED_CEILING) : 0;
  const standardBase = positiveProfit - reducedBase;
  const taxAtReducedRate = Math.round(reducedBase * IS_REDUCED_RATE);
  const taxAtStandardRate = Math.round(standardBase * IS_STANDARD_RATE);
  const grossIs = taxAtReducedRate + taxAtStandardRate;
  const socialContribution =
    grossIs > IS_SOCIAL_CONTRIBUTION_THRESHOLD
      ? Math.round((grossIs - IS_SOCIAL_CONTRIBUTION_THRESHOLD) * IS_SOCIAL_CONTRIBUTION_RATE)
      : 0;
  const totalIs = grossIs + socialContribution;
  const effectiveRatePercent =
    positiveProfit > 0 ? Math.round((totalIs / positiveProfit) * 10_000) / 100 : 0;

  return {
    profit: positiveProfit,
    turnover,
    individualOwnershipPercent,
    reducedRateEligible,
    reducedBase,
    standardBase,
    taxAtReducedRate,
    taxAtStandardRate,
    grossIs,
    socialContribution,
    totalIs,
    effectiveRatePercent,
  };
}

const taxRun = createTaxRunFactory({
  tenantId: demoTenant.id,
  caseId: "case-claire-marc-2026",
  householdId: demoHousehold.id,
  dossierSnapshotId: "snapshot-dossier-claire-marc-v2",
  runIdSuffix: "claire-marc-v3",
  createdAt: "2026-06-11T09:00:00.000Z",
});

const RULE_ID = "rule-is-bareme-2026-v1";
const SOURCE_SP = "src-service-public-is-taux-2026";
const COVERAGE = ["coverage-is-bareme-2026"];

export function simulateIs(input: IsInput = {}) {
  const result = computeIs(input);

  const steps = [
    makeStep({
      id: "is-step-reduced",
      order: 1,
      label: "Taux réduit 15 % (PME)",
      inputValue: `CA ${result.turnover} € / ${result.individualOwnershipPercent} % personnes physiques`,
      formula: "15 % jusqu'à 42 500 € si CA ≤ 10 M€ et capital ≥ 75 % personnes physiques",
      outputValue: result.taxAtReducedRate,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_SP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.reducedRateEligible ? "indicative" : "needs_review",
      nextAction: "Vérifier la libération du capital et la composition de l'actionnariat.",
    }),
    makeStep({
      id: "is-step-standard",
      order: 2,
      label: "Taux normal 25 %",
      inputValue: result.standardBase,
      formula: "bénéfice au-delà de la tranche réduite × 25 %",
      outputValue: result.taxAtStandardRate,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_SP,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "is-step-social-contribution",
      order: 3,
      label: "Contribution sociale 3,3 %",
      inputValue: result.grossIs,
      formula: "3,3 % de la fraction d'IS excédant 763 000 € (art. 235 ter ZC)",
      outputValue: result.socialContribution,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_SP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Vérifier le seuil d'exonération (CA < 7,63 M€) avec l'expert-comptable.",
    }),
    makeStep({
      id: "is-step-total",
      order: 4,
      label: "IS total et taux effectif",
      inputValue: result.profit,
      formula: "taux réduit + taux normal + contribution sociale",
      outputValue: `${result.totalIs} € (${result.effectiveRatePercent.toLocaleString("fr-FR")} %)`,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_SP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Faire valider le résultat fiscal (réintégrations, déficits) par l'expert-comptable.",
    }),
  ];

  return taxRun({
    module: "is",
    scenario: "is",
    steps,
    resultLabel: `Taux effectif ${result.effectiveRatePercent.toLocaleString("fr-FR")} %`,
    resultAmount: result.totalIs,
    evidenceSourceIds: [SOURCE_SP],
    reviewerRequired: "expert-comptable",
    computedResult: { ...result },
  });
}
