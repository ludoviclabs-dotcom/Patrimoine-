import type { CalculationStep, SimulationRun } from "../types";

const donationRuleId = "rule-donation-usufruit-2026-v1";
const donationSourceId = "src-impots-donation-usufruit";
const plusValueRuleId = "rule-plus-value-immobiliere-2026-v1";
const plusValueSourceId = "src-bofip-plus-value-immobiliere";
const sciRuleId = "rule-sci-arbitrage-2026-v1";
const sciSourceId = "src-legifrance-code-civil-transmission";

export function getBareOwnershipRate(age: number) {
  if (age < 21) return 0.1;
  if (age < 31) return 0.2;
  if (age < 41) return 0.3;
  if (age < 51) return 0.4;
  if (age < 61) return 0.5;
  if (age < 71) return 0.6;
  if (age < 81) return 0.7;
  if (age < 91) return 0.8;
  return 0.9;
}

function step(
  id: string,
  order: number,
  label: string,
  inputValue: number | string,
  formula: string,
  outputValue: number | string,
  ruleVersionId: string,
  evidenceSourceId: string,
  confidenceStatus: CalculationStep["confidenceStatus"] = "indicative",
  coverageLimitIds: string[] = ["coverage-donation-usufruit-simple"],
): CalculationStep {
  const statusByConfidence: Record<
    CalculationStep["confidenceStatus"],
    CalculationStep["displayStatus"]
  > = {
    validated: "validated_calculation",
    indicative: "indicative_calculation",
    needs_review: "professional_review_required",
  };

  return {
    id,
    order,
    label,
    inputValue,
    formula,
    outputValue,
    ruleVersionId,
    evidenceSourceId,
    confidenceStatus,
    usedData: [label],
    intermediateResult: String(outputValue),
    coverageLimitIds,
    nextAction: "Faire relire cette hypothese avant usage professionnel.",
    displayStatus: statusByConfidence[confidenceStatus],
  };
}

export function simulateDismemberedDonation({
  householdId,
  assetValue,
  donorAge,
}: {
  householdId: string;
  assetValue: number;
  donorAge: number;
}): SimulationRun & { result: { bareOwnershipValue: number; bareOwnershipRate: number } } {
  const bareOwnershipRate = getBareOwnershipRate(donorAge);
  const bareOwnershipValue = Math.round(assetValue * bareOwnershipRate);

  return {
    id: "simulation-donation-demembrement-demo",
    scenario: "demembrement",
    householdId,
    status: "indicative",
    createdAt: new Date("2026-05-26T10:30:00.000Z").toISOString(),
    result: {
      bareOwnershipValue,
      bareOwnershipRate,
    },
    steps: [
      step(
        "donation-step-rate",
        1,
        "Taux indicatif de nue-propriete",
        donorAge,
        "bareme age donateur",
        `${Math.round(bareOwnershipRate * 100)} %`,
        donationRuleId,
        donationSourceId,
      ),
      step(
        "donation-step-value",
        2,
        "Valeur indicative transmise en nue-propriete",
        assetValue,
        `${assetValue} x ${Math.round(bareOwnershipRate * 100)} %`,
        bareOwnershipValue,
        donationRuleId,
        donationSourceId,
        "indicative",
        ["coverage-donation-usufruit-simple"],
      ),
    ],
  };
}

export function simulateRealEstateGain({
  householdId,
  salePrice,
  purchasePrice,
  declaredCosts,
}: {
  householdId: string;
  salePrice: number;
  purchasePrice: number;
  declaredCosts: number;
}): SimulationRun & { result: { grossGain: number; netBeforeAllowances: number } } {
  const grossGain = salePrice - purchasePrice;
  const netBeforeAllowances = grossGain - declaredCosts;

  return {
    id: "simulation-plus-value-demo",
    scenario: "plus-value",
    householdId,
    status: "needs_review",
    createdAt: new Date("2026-05-26T10:35:00.000Z").toISOString(),
    result: {
      grossGain,
      netBeforeAllowances,
    },
    steps: [
      step(
        "plus-value-step-gross",
        1,
        "Plus-value brute",
        `${salePrice} / ${purchasePrice}`,
        "prix de cession - prix d'acquisition",
        grossGain,
        plusValueRuleId,
        plusValueSourceId,
        "indicative",
        ["coverage-plus-value-structure"],
      ),
      step(
        "plus-value-step-costs",
        2,
        "Base avant abattements et cas particuliers",
        declaredCosts,
        "plus-value brute - frais declares",
        netBeforeAllowances,
        plusValueRuleId,
        plusValueSourceId,
        "needs_review",
        ["coverage-plus-value-structure"],
      ),
    ],
  };
}

export function simulateSciArbitrage({
  householdId,
  propertyValue,
  debt,
  annualRent,
  annualCharges,
}: {
  householdId: string;
  propertyValue: number;
  debt: number;
  annualRent: number;
  annualCharges: number;
}): SimulationRun & { result: { netExposure: number; annualCashflowBeforeTax: number } } {
  const netExposure = propertyValue - debt;
  const annualCashflowBeforeTax = annualRent - annualCharges;

  return {
    id: "simulation-sci-arbitrage-demo",
    scenario: "sci-arbitrage",
    householdId,
    status: "needs_review",
    createdAt: new Date("2026-05-26T10:40:00.000Z").toISOString(),
    result: {
      netExposure,
      annualCashflowBeforeTax,
    },
    steps: [
      step(
        "sci-step-exposure",
        1,
        "Exposition nette immobiliere",
        `${propertyValue} / ${debt}`,
        "valeur du bien - dette rattachee",
        netExposure,
        sciRuleId,
        sciSourceId,
        "indicative",
        ["coverage-sci-arbitrage"],
      ),
      step(
        "sci-step-cashflow",
        2,
        "Flux annuel avant fiscalite",
        `${annualRent} / ${annualCharges}`,
        "loyers annuels - charges annuelles",
        annualCashflowBeforeTax,
        sciRuleId,
        sciSourceId,
        "needs_review",
        ["coverage-sci-arbitrage"],
      ),
    ],
  };
}
