import { demoTenant } from "../../demo-data/v1";
import { demoHousehold } from "../../demo-data/household";
import { createTaxRunFactory, makeStep } from "../engine-kit";
import { computeIs } from "./is";
import { computePvImmo } from "./pv-immo";

/**
 * SCI à l'IR vs option IS — moteur v3 (remplace le stub flux/exposition).
 *
 * - IR : revenus fonciers nets imposés à TMI + prélèvements sociaux 17,2 %
 *   (revenus fonciers maintenus hors hausse LFSS 2026 par dérogation) ;
 *   à la cession, régime des plus-values immobilières des particuliers
 *   (abattements pour durée de détention — moteur pv-immo).
 * - IS : résultat après amortissements imposé à l'IS (moteur is.ts) ; à la
 *   cession, plus-value professionnelle = prix − valeur nette comptable
 *   (réintégration des amortissements), imposée à l'IS — étape needs_review.
 * La sortie de trésorerie de la SCI IS (dividendes → PFU) n'est pas
 * automatisée — coverage limit dédiée.
 */

export const RENTAL_SOCIAL_RATE = 0.172;

export type SciArbitrageInput = {
  annualRent?: number;
  charges?: number;
  loanInterest?: number;
  depreciationBase?: number;
  depreciationRate?: number;
  tmi?: number;
  holdingYears?: number;
  projectedSalePrice?: number;
  acquisitionValue?: number;
};

export function computeSciIrVsIs({
  annualRent = 30_000,
  charges = 8_000,
  loanInterest = 0,
  depreciationBase = 250_000,
  depreciationRate = 0.025,
  tmi = 0.3,
  holdingYears = 10,
  projectedSalePrice = 400_000,
  acquisitionValue = 300_000,
}: SciArbitrageInput = {}) {
  // Régime IR : revenus fonciers nets × (TMI + PS 17,2 %).
  const netRentalIncome = Math.max(0, annualRent - charges - loanInterest);
  const annualTaxAtIr = Math.round(netRentalIncome * (tmi + RENTAL_SOCIAL_RATE));

  // Régime IS : amortissements déductibles puis barème IS.
  const annualDepreciation = Math.round(depreciationBase * depreciationRate);
  const taxableProfitAtIs = Math.max(0, annualRent - charges - loanInterest - annualDepreciation);
  const isResult = computeIs({ profit: taxableProfitAtIs, turnover: annualRent });
  const annualTaxAtIs = isResult.totalIs;
  const annualAdvantageIs = annualTaxAtIr - annualTaxAtIs;

  // Cession après N années.
  const cumulatedDepreciation = Math.min(acquisitionValue, annualDepreciation * holdingYears);
  const netBookValue = Math.max(0, acquisitionValue - cumulatedDepreciation);
  const professionalGain = Math.max(0, projectedSalePrice - netBookValue);
  const saleTaxAtIs = computeIs({ profit: professionalGain, turnover: annualRent }).totalIs;
  const saleTaxAtIr = computePvImmo({
    salePrice: projectedSalePrice,
    purchasePrice: acquisitionValue,
    acquisitionCosts: 0,
    works: 0,
    yearsHeld: holdingYears,
  }).estimatedTax;
  const saleAdvantageIr = saleTaxAtIs - saleTaxAtIr;

  return {
    annualRent,
    charges,
    loanInterest,
    tmi,
    netRentalIncome,
    annualTaxAtIr,
    annualDepreciation,
    taxableProfitAtIs,
    annualTaxAtIs,
    annualAdvantageIs,
    holdingYears,
    projectedSalePrice,
    acquisitionValue,
    cumulatedDepreciation,
    netBookValue,
    professionalGain,
    saleTaxAtIs,
    saleTaxAtIr,
    saleAdvantageIr,
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

const RULE_ID = "rule-sci-arbitrage-2026-v2";
const SOURCE_BOFIP = "src-bofip-sci-is-2026";
const SOURCE_IS = "src-service-public-is-taux-2026";
const COVERAGE = ["coverage-sci-arbitrage", "coverage-sci-is-sortie"];

export function simulateSciIrVsIs(input: SciArbitrageInput = {}) {
  const result = computeSciIrVsIs(input);

  const steps = [
    makeStep({
      id: "sci-step-ir-annual",
      order: 1,
      label: "SCI à l'IR : imposition annuelle",
      inputValue: `${result.netRentalIncome} € de foncier net`,
      formula: `foncier net × (TMI ${Math.round(result.tmi * 100)} % + PS 17,2 %)`,
      outputValue: result.annualTaxAtIr,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "sci-step-is-annual",
      order: 2,
      label: "SCI à l'IS : imposition annuelle après amortissements",
      inputValue: `résultat ${result.taxableProfitAtIs} € (amortissement ${result.annualDepreciation} €)`,
      formula: "loyers − charges − intérêts − amortissements → barème IS 15/25 %",
      outputValue: result.annualTaxAtIs,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_IS,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Faire valider le plan d'amortissement par l'expert-comptable.",
    }),
    makeStep({
      id: "sci-step-annual-delta",
      order: 3,
      label: "Avantage annuel indicatif de l'IS",
      inputValue: `${result.annualTaxAtIr} € IR / ${result.annualTaxAtIs} € IS`,
      formula: "impôt annuel IR − impôt annuel IS",
      outputValue: result.annualAdvantageIs,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Intégrer la fiscalité de distribution (PFU sur dividendes) avant conclusion.",
    }),
    makeStep({
      id: "sci-step-sale-is",
      order: 4,
      label: "Cession à l'IS : plus-value professionnelle",
      inputValue: `VNC ${result.netBookValue} € (amortissements réintégrés ${result.cumulatedDepreciation} €)`,
      formula: "prix de cession − valeur nette comptable → IS",
      outputValue: result.saleTaxAtIs,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "La réintégration des amortissements alourdit la sortie : chiffrage expert-comptable requis.",
    }),
    makeStep({
      id: "sci-step-sale-ir",
      order: 5,
      label: "Cession à l'IR : plus-value des particuliers",
      inputValue: `${result.holdingYears} ans de détention`,
      formula: "régime des plus-values immobilières (abattements art. 150 VC)",
      outputValue: result.saleTaxAtIr,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Comparer IR vs IS sur la durée totale de détention, pas seulement à l'année.",
    }),
  ];

  return taxRun({
    module: "sci-arbitrage",
    scenario: "sci-arbitrage",
    steps,
    resultLabel:
      result.annualAdvantageIs >= 0
        ? `IS favorable de ${result.annualAdvantageIs} €/an, sortie à chiffrer`
        : `IR favorable de ${Math.abs(result.annualAdvantageIs)} €/an`,
    resultAmount: result.annualAdvantageIs,
    evidenceSourceIds: [SOURCE_BOFIP, SOURCE_IS],
    reviewerRequired: "expert-comptable",
    computedResult: { ...result },
  });
}
