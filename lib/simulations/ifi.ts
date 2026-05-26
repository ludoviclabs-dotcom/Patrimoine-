import { demoHousehold } from "../demo-data/household";
import type { CalculationStep, Household, IfiResult, SimulationRun } from "../types";

const RULE_ID = "rule-ifi-simplified-2026-v1";
const SOURCE_ID = "src-service-public-ifi-2026";
const THRESHOLD = 1_300_000;

function numberOrNull(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function calculateIfi(household: Household = demoHousehold): SimulationRun & {
  result: IfiResult;
} {
  const realEstateAssets = household.assets.filter(
    (asset) => asset.category === "real-estate",
  );
  const missingValue = realEstateAssets.some((asset) => numberOrNull(asset.value) === null);
  const deductibleDebt = household.liabilities
    .filter((liability) => liability.linkedCategory === "real-estate")
    .reduce((sum, liability) => sum + liability.value, 0);

  if (missingValue) {
    return {
      id: "run-ifi-demo",
      scenario: "ifi",
      householdId: household.id,
      status: "needs_review",
      createdAt: "2026-05-26T09:00:00.000Z",
      steps: [
        createStep(
          "ifi-step-missing",
          1,
          "Données immobilières incomplètes",
          "Valeur manquante",
          "Abstention déterministe",
          "Contrôle requis",
          "needs_review",
        ),
      ],
      result: {
        threshold: THRESHOLD,
        taxableBase: null,
        taxableRealEstateBeforeDebt: null,
        deductibleDebt,
        triggered: null,
        message: "Simulation suspendue : une valeur immobilière manque au dossier.",
      },
    };
  }

  const mainResidence = realEstateAssets
    .filter((asset) => asset.ifiKind === "main-residence")
    .reduce((sum, asset) => sum + asset.value, 0);
  const mainResidenceTaxable = Math.round(mainResidence * 0.7);
  const rental = realEstateAssets
    .filter((asset) => asset.ifiKind === "rental")
    .reduce((sum, asset) => sum + asset.value, 0);
  const sci = realEstateAssets
    .filter((asset) => asset.ifiKind === "sci")
    .reduce((sum, asset) => sum + asset.value, 0);
  const other = realEstateAssets
    .filter((asset) => !["main-residence", "rental", "sci"].includes(asset.ifiKind ?? ""))
    .reduce((sum, asset) => sum + asset.value, 0);
  const taxableRealEstateBeforeDebt = mainResidenceTaxable + rental + sci + other;
  const taxableBase = Math.max(0, taxableRealEstateBeforeDebt - deductibleDebt);
  const triggered = taxableBase > THRESHOLD;

  const steps: CalculationStep[] = [
    createStep(
      "ifi-step-main-residence",
      1,
      "Résidence principale",
      mainResidence,
      "Valeur déclarée × 70 %",
      mainResidenceTaxable,
      "indicative",
    ),
    createStep(
      "ifi-step-rental",
      2,
      "Immobilier locatif",
      rental,
      "Valeur immobilière retenue",
      rental,
      "indicative",
    ),
    createStep(
      "ifi-step-sci",
      3,
      "Parts SCI immobilière",
      sci,
      "Valeur immobilière à contrôler",
      sci,
      "needs_review",
    ),
    createStep(
      "ifi-step-subtotal",
      4,
      "Sous-total immobilier IFI simplifié",
      `${mainResidenceTaxable} + ${rental} + ${sci} + ${other}`,
      "Somme des valeurs retenues",
      taxableRealEstateBeforeDebt,
      "indicative",
    ),
    createStep(
      "ifi-step-debt",
      5,
      "Dettes immobilières déclarées",
      deductibleDebt,
      "Sous conditions de déductibilité",
      -deductibleDebt,
      "needs_review",
    ),
    createStep(
      "ifi-step-threshold",
      6,
      "Base simplifiée comparée au seuil",
      taxableBase,
      `Base nette ${triggered ? ">" : "<="} ${THRESHOLD}`,
      triggered ? "Alerte IFI" : "Sous seuil indicatif",
      "indicative",
    ),
  ];

  return {
    id: "run-ifi-demo",
    scenario: "ifi",
    householdId: household.id,
    status: "indicative",
    createdAt: "2026-05-26T09:00:00.000Z",
    steps,
    result: {
      threshold: THRESHOLD,
      taxableBase,
      taxableRealEstateBeforeDebt,
      deductibleDebt,
      triggered,
      message: triggered
        ? "Alerte IFI : la base simplifiée dépasse le seuil, revue professionnelle requise."
        : "Pas d’alerte immédiate dans cette simulation, sous réserve de validation des dettes et situations particulières.",
    },
  };
}

function createStep(
  id: string,
  order: number,
  label: string,
  inputValue: number | string,
  formula: string,
  outputValue: number | string,
  confidenceStatus: CalculationStep["confidenceStatus"],
): CalculationStep {
  return {
    id,
    order,
    label,
    inputValue,
    formula,
    outputValue,
    ruleVersionId: RULE_ID,
    evidenceSourceId: SOURCE_ID,
    confidenceStatus,
  };
}
