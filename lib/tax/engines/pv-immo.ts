import { demoTenant } from "../../demo-data/v1";
import { demoHousehold } from "../../demo-data/household";
import { createTaxRunFactory, makeStep } from "../engine-kit";

/**
 * Plus-value immobilière des particuliers — moteur v3 (règle v2).
 *
 * Reprend la logique v2 (abattements pour durée de détention art. 150 VC,
 * surtaxe art. 1609 nonies G) et la complète :
 * - forfait frais d'acquisition 7,5 % du prix d'achat (option) ;
 * - forfait travaux 15 % du prix d'achat si détention > 5 ans (option) ;
 * - arrondi officiel : bases exactes, impôt tronqué à l'euro. L'exemple
 *   BOFiP/2048-IMM (PV brute 66 250 €, 16 années révolues) tombe exactement
 *   sur IR 4 279 € / PS 9 326 € ; tolérance documentée ±2 € selon les
 *   conventions d'arrondi des exemples officiels.
 * Prélèvements sociaux maintenus à 17,2 % sur les PV immobilières (la hausse
 * LFSS 2026 à 18,6 % ne s'applique pas à cette assiette — exclusion expresse).
 */

export const PV_IMMO_INCOME_TAX_RATE = 0.19;
export const PV_IMMO_SOCIAL_RATE = 0.172;
export const ACQUISITION_COSTS_LUMP_SUM_RATE = 0.075;
export const WORKS_LUMP_SUM_RATE = 0.15;

export function calculateRealEstateHoldingAllowances(yearsHeld: number) {
  const fullYears = Math.max(0, Math.floor(yearsHeld));
  const incomeTaxAllowanceRate =
    fullYears <= 5 ? 0 : fullYears >= 22 ? 1 : fullYears === 21 ? 0.96 : Math.min(0.96, (fullYears - 5) * 0.06);
  const socialAllowanceRate =
    fullYears <= 5
      ? 0
      : fullYears >= 30
        ? 1
        : fullYears <= 21
          ? (fullYears - 5) * 0.0165
          : 0.28 + (fullYears - 22) * 0.09;

  return {
    yearsHeld: fullYears,
    incomeTaxAllowanceRate: Math.min(1, incomeTaxAllowanceRate),
    socialAllowanceRate: Math.min(1, socialAllowanceRate),
  };
}

export function calculateHighRealEstateGainSurtax(incomeTaxBase: number) {
  const pv = Math.max(0, incomeTaxBase);

  if (pv <= 50_000) return 0;
  if (pv <= 60_000) return Math.round(pv * 0.02 - (60_000 - pv) / 20);
  if (pv <= 100_000) return Math.round(pv * 0.02);
  if (pv <= 110_000) return Math.round(pv * 0.03 - (110_000 - pv) / 10);
  if (pv <= 150_000) return Math.round(pv * 0.03);
  if (pv <= 160_000) return Math.round(pv * 0.04 - (160_000 - pv) * 0.15);
  if (pv <= 200_000) return Math.round(pv * 0.04);
  if (pv <= 210_000) return Math.round(pv * 0.05 - (210_000 - pv) * 0.2);
  if (pv <= 250_000) return Math.round(pv * 0.05);
  if (pv <= 260_000) return Math.round(pv * 0.06 - (260_000 - pv) * 0.25);
  return Math.round(pv * 0.06);
}

export type PvImmoInput = {
  salePrice?: number;
  purchasePrice?: number;
  acquisitionCosts?: number;
  works?: number;
  yearsHeld?: number;
  isMainResidence?: boolean;
  /** Option : forfait frais d'acquisition 7,5 % du prix d'achat. */
  useAcquisitionLumpSum?: boolean;
  /** Option : forfait travaux 15 % du prix d'achat (détention > 5 ans). */
  useWorksLumpSum?: boolean;
};

export function computePvImmo({
  salePrice = 720_000,
  purchasePrice = 420_000,
  acquisitionCosts = 31_500,
  works = 35_000,
  yearsHeld = 9,
  isMainResidence = false,
  useAcquisitionLumpSum = false,
  useWorksLumpSum = false,
}: PvImmoInput = {}) {
  const retainedAcquisitionCosts = useAcquisitionLumpSum
    ? purchasePrice * ACQUISITION_COSTS_LUMP_SUM_RATE
    : acquisitionCosts;
  const worksLumpSumApplicable = useWorksLumpSum && Math.floor(yearsHeld) > 5;
  const retainedWorks = worksLumpSumApplicable ? purchasePrice * WORKS_LUMP_SUM_RATE : works;

  const grossGain = Math.max(
    0,
    salePrice - purchasePrice - retainedAcquisitionCosts - retainedWorks,
  );
  const allowances = calculateRealEstateHoldingAllowances(yearsHeld);
  const incomeTaxAllowanceRate = isMainResidence ? 1 : allowances.incomeTaxAllowanceRate;
  const socialAllowanceRate = isMainResidence ? 1 : allowances.socialAllowanceRate;
  // Bases exactes, impôt tronqué à l'euro (convention des exemples officiels).
  const incomeTaxBase = grossGain * (1 - incomeTaxAllowanceRate);
  const socialTaxBase = grossGain * (1 - socialAllowanceRate);
  const incomeTax = Math.floor(incomeTaxBase * PV_IMMO_INCOME_TAX_RATE);
  const socialTax = Math.floor(socialTaxBase * PV_IMMO_SOCIAL_RATE);
  const surtax = isMainResidence ? 0 : calculateHighRealEstateGainSurtax(Math.floor(incomeTaxBase));
  const estimatedTax = incomeTax + socialTax + surtax;

  return {
    salePrice,
    purchasePrice,
    retainedAcquisitionCosts: Math.round(retainedAcquisitionCosts),
    retainedWorks: Math.round(retainedWorks),
    useAcquisitionLumpSum,
    worksLumpSumApplicable,
    grossGain: Math.round(grossGain),
    yearsHeld: allowances.yearsHeld,
    incomeTaxAllowanceRate,
    socialAllowanceRate,
    incomeTaxBase: Math.round(incomeTaxBase),
    socialTaxBase: Math.round(socialTaxBase),
    incomeTax,
    socialTax,
    surtax,
    estimatedTax,
    isMainResidence,
  };
}

const taxRun = createTaxRunFactory({
  tenantId: demoTenant.id,
  caseId: "case-claire-marc-2026",
  householdId: demoHousehold.id,
  dossierSnapshotId: "snapshot-dossier-claire-marc-v2",
  runIdSuffix: "claire-marc-v2",
  createdAt: "2026-05-26T12:00:00.000Z",
});

const RULE_ID = "rule-plus-value-immobiliere-2026-v2";
const SOURCE_BOFIP = "src-bofip-plus-value-immobiliere";
const SOURCE_2048 = "src-impots-2048-imm-2026";
const COVERAGE = ["coverage-plus-value-structure"];

export function simulatePvImmoV3(input: PvImmoInput = {}) {
  const result = computePvImmo(input);
  const surtaxSignal = result.isMainResidence
    ? "Résidence principale exonérée dans le cas simple"
    : result.surtax > 0
      ? "Surtaxe plus-value élevée appliquée"
      : "Pas de surtaxe signalée";

  const steps = [
    makeStep({
      id: "pvi-step-gross",
      order: 1,
      label: "Plus-value brute corrigée",
      inputValue: `${result.salePrice} / ${result.purchasePrice}`,
      formula: result.useAcquisitionLumpSum
        ? "cession − acquisition − forfait frais 7,5 % − travaux retenus"
        : "cession − acquisition − frais − travaux retenus",
      outputValue: result.grossGain,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_2048,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "pvi-step-lump-sums",
      order: 2,
      label: "Forfaits acquisition / travaux",
      inputValue: `${result.retainedAcquisitionCosts} / ${result.retainedWorks}`,
      formula: "forfait acquisition 7,5 % (option) · forfait travaux 15 % si détention > 5 ans",
      outputValue: result.worksLumpSumApplicable || result.useAcquisitionLumpSum ? "Forfait appliqué" : "Frais réels",
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_2048,
      coverageLimitIds: COVERAGE,
      confidenceStatus:
        result.worksLumpSumApplicable || result.useAcquisitionLumpSum ? "needs_review" : "indicative",
      nextAction: "Comparer frais réels justifiés et forfaits avant dépôt de la 2048-IMM.",
    }),
    makeStep({
      id: "pvi-step-allowances",
      order: 3,
      label: "Abattements durée de détention",
      inputValue: result.yearsHeld,
      formula: "IR : 6 %/an de la 6e à la 21e année · PS : 1,65 %/an puis 9 %/an (art. 150 VC)",
      outputValue: `${Math.round(result.incomeTaxAllowanceRate * 100)} % / ${Math.round(result.socialAllowanceRate * 100)} %`,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
    }),
    makeStep({
      id: "pvi-step-tax",
      order: 4,
      label: "Impôt indicatif plus-value",
      inputValue: `${result.incomeTaxBase} / ${result.socialTaxBase}`,
      formula: "base IR × 19 % + base PS × 17,2 % (PS immobilier maintenus hors hausse LFSS 2026)",
      outputValue: result.estimatedTax,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Contrôler exonération résidence principale, surtaxe et justificatifs.",
    }),
    makeStep({
      id: "pvi-step-surtax",
      order: 5,
      label: "Surtaxe plus-value élevée",
      inputValue: result.incomeTaxBase,
      formula: "barème spécifique si plus-value imposable IR > 50 000 € (art. 1609 nonies G)",
      outputValue: result.surtax,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.surtax > 0 ? "needs_review" : "indicative",
      nextAction: "Valider la nature du bien, le seuil et les abattements avant toute conclusion.",
    }),
  ];

  return taxRun({
    module: "plus-value-immo",
    scenario: "plus-value",
    steps,
    resultLabel: surtaxSignal,
    resultAmount: result.estimatedTax,
    evidenceSourceIds: [SOURCE_BOFIP, SOURCE_2048],
    reviewerRequired: "avocat",
    computedResult: { ...result, surtaxSignal },
  });
}
