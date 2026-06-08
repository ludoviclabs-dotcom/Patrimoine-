import { demoHousehold } from "../demo-data/household";
import type { CalculationStep, Household, IfiResult, SimulationRun } from "../types";

const RULE_ID = "rule-ifi-complete-2026-v2";
const SOURCE_ID = "src-service-public-ifi-2026";
const THRESHOLD = 1_300_000;
const DISCOUNT_MAX_BASE = 1_400_000;
const CAP_RATE = 0.75;

type IfiOptions = {
  annualIncome?: number;
  otherTaxes?: number;
};

function numberOrNull(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function calculateIfi(
  household: Household = demoHousehold,
  options: IfiOptions = {},
): SimulationRun & {
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
          "Donnees immobilieres incompletes",
          "Valeur manquante",
          "Abstention deterministe",
          "Controle requis",
          "needs_review",
          {
            coverageLimitIds: ["coverage-ifi-rental-simple", "coverage-ifi-sci-simple"],
            nextAction: "Completer les valeurs immobilieres avant de relancer la simulation.",
          },
        ),
      ],
      result: {
        threshold: THRESHOLD,
        taxableBase: null,
        taxableRealEstateBeforeDebt: null,
        deductibleDebt,
        triggered: null,
        message: "Simulation suspendue : une valeur immobiliere manque au dossier.",
      },
    };
  }

  const directMainResidence = realEstateAssets
    .filter((asset) => asset.ifiKind === "main-residence" && asset.isDirectlyHeld !== false)
    .reduce((sum, asset) => sum + asset.value, 0);
  const indirectMainResidence = realEstateAssets
    .filter((asset) => asset.ifiKind === "main-residence" && asset.isDirectlyHeld === false)
    .reduce((sum, asset) => sum + asset.value, 0);
  const mainResidenceTaxable = Math.round(directMainResidence * 0.7);
  const rental = realEstateAssets
    .filter((asset) => asset.ifiKind === "rental")
    .reduce((sum, asset) => sum + asset.value, 0);
  const sci = realEstateAssets
    .filter((asset) => asset.ifiKind === "sci")
    .reduce((sum, asset) => sum + asset.value, 0);
  const other = realEstateAssets
    .filter((asset) => !["main-residence", "rental", "sci"].includes(asset.ifiKind ?? ""))
    .reduce((sum, asset) => sum + asset.value, 0);
  const taxableRealEstateBeforeDebt =
    mainResidenceTaxable + indirectMainResidence + rental + sci + other;
  const taxableBase = Math.max(0, taxableRealEstateBeforeDebt - deductibleDebt);
  const triggered = taxableBase > THRESHOLD;
  const grossIfi = triggered ? calculateProgressiveIfi(taxableBase) : 0;
  const discount =
    triggered && taxableBase <= DISCOUNT_MAX_BASE
      ? Math.max(0, Math.round(17_500 - taxableBase * 0.0125))
      : 0;
  const ifiAfterDiscount = Math.max(0, grossIfi - discount);
  const capLimit =
    options.annualIncome && options.annualIncome > 0
      ? Math.round(options.annualIncome * CAP_RATE)
      : null;
  const taxBeforeCap = ifiAfterDiscount + (options.otherTaxes ?? 0);
  const capApplied = Boolean(capLimit !== null && taxBeforeCap > capLimit);
  const cappedIfi =
    capLimit !== null && capApplied ? Math.max(0, capLimit - (options.otherTaxes ?? 0)) : ifiAfterDiscount;
  const netIfi = Math.max(0, cappedIfi);

  const steps: CalculationStep[] = [
    createStep(
      "ifi-step-main-residence",
      1,
      "Résidence principale détenue en direct",
      directMainResidence,
      "Valeur declaree x 70 %",
      mainResidenceTaxable,
      "indicative",
      {
        usedData: ["Résidence principale déclarée", "Détention directe", "Abattement résidence principale"],
        intermediateResult: `${directMainResidence} x 70 % = ${mainResidenceTaxable}`,
        coverageLimitIds: ["coverage-ifi-main-residence"],
        nextAction: "Confirmer la détention directe et la valeur avec un avis récent.",
      },
    ),
    createStep(
      "ifi-step-indirect-main-residence",
      2,
      "Résidence principale via société ou SCI",
      indirectMainResidence,
      "Pas d'abattement automatique dans le moteur V2",
      indirectMainResidence,
      indirectMainResidence > 0 ? "needs_review" : "indicative",
      {
        usedData: ["Biens indiqués comme résidence principale hors détention directe"],
        intermediateResult: `${indirectMainResidence}`,
        coverageLimitIds: ["coverage-ifi-sci-simple", "coverage-ifi-main-residence"],
        nextAction: "Valider la structure de détention avant d'appliquer un abattement.",
      },
    ),
    createStep(
      "ifi-step-rental",
      3,
      "Immobilier locatif",
      rental,
      "Valeur immobiliere retenue",
      rental,
      "indicative",
      {
        usedData: ["Immobilier locatif déclaré"],
        intermediateResult: `${rental}`,
        coverageLimitIds: ["coverage-ifi-rental-simple"],
        nextAction: "Vérifier titres, baux et valorisation retenue.",
      },
    ),
    createStep(
      "ifi-step-sci",
      4,
      "Parts SCI immobilière",
      sci,
      "Valeur immobilière à contrôler",
      sci,
      "needs_review",
      {
        usedData: ["Parts SCI déclarées"],
        intermediateResult: `${sci}`,
        coverageLimitIds: ["coverage-ifi-sci-simple", "coverage-ifi-holdings"],
        nextAction: "Confirmer la répartition des parts et les actifs immobiliers sous-jacents.",
      },
    ),
    createStep(
      "ifi-step-subtotal",
      5,
      "Sous-total immobilier IFI",
      `${mainResidenceTaxable} + ${indirectMainResidence} + ${rental} + ${sci} + ${other}`,
      "Somme des valeurs retenues",
      taxableRealEstateBeforeDebt,
      "indicative",
      {
        usedData: ["Résidence principale", "Immobilier locatif", "Parts SCI"],
        intermediateResult: `${mainResidenceTaxable} + ${indirectMainResidence} + ${rental} + ${sci} + ${other} = ${taxableRealEstateBeforeDebt}`,
        coverageLimitIds: [
          "coverage-ifi-main-residence",
          "coverage-ifi-rental-simple",
          "coverage-ifi-sci-simple",
        ],
        nextAction: "Contrôler les cas non couverts avant conclusion.",
      },
    ),
    createStep(
      "ifi-step-debt",
      6,
      "Dettes immobilières déclarées",
      deductibleDebt,
      "Sous conditions de deductibilite",
      -deductibleDebt,
      "needs_review",
      {
        usedData: ["Dettes immobilières déclarées"],
        intermediateResult: `${taxableRealEstateBeforeDebt} - ${deductibleDebt} = ${taxableBase}`,
        coverageLimitIds: ["coverage-ifi-deductible-debt"],
        nextAction: "Vérifier la nature, le justificatif et la déductibilité de chaque dette.",
      },
    ),
    createStep(
      "ifi-step-threshold",
      7,
      "Base nette comparée au seuil",
      taxableBase,
      `Base nette ${triggered ? ">" : "<="} ${THRESHOLD}`,
      triggered ? "Alerte IFI" : "Sous seuil indicatif",
      "indicative",
      {
        usedData: ["Base IFI", "Seuil IFI"],
        intermediateResult: `${taxableBase} ${triggered ? ">" : "<="} ${THRESHOLD}`,
        coverageLimitIds: [
          "coverage-ifi-trusts",
          "coverage-ifi-demembrement-complexe",
          "coverage-ifi-actifs-pro-complexes",
          "coverage-ifi-non-residents-complexes",
        ],
        nextAction:
          "Faire relire les dettes, SCI et situations particulières avant usage professionnel.",
      },
    ),
    createStep(
      "ifi-step-scale-discount-cap",
      8,
      "Barème, décote et plafonnement",
      taxableBase,
      "barème progressif - décote éventuelle - plafonnement 75 %",
      netIfi,
      triggered ? "needs_review" : "indicative",
      {
        usedData: ["Base IFI", "Barème", "Décote 1,3-1,4 M€", "Plafonnement 75 % si revenu fourni"],
        intermediateResult: `IFI brut ${grossIfi} - décote ${discount} = ${ifiAfterDiscount}; IFI net ${netIfi}`,
        coverageLimitIds: ["coverage-ifi-main-residence", "coverage-ifi-deductible-debt"],
        nextAction: "Valider revenus, autres impôts et réductions avant émission d'un rapport.",
      },
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
      grossIfi,
      discount,
      cappedIfi,
      netIfi,
      capApplied,
      message: triggered
        ? "Alerte IFI : la base simplifiee depasse le seuil, revue professionnelle requise."
        : "Pas d'alerte immediate dans cette simulation, sous reserve de validation des dettes et situations particulieres.",
    },
  };
}

export function calculateProgressiveIfi(taxableBase: number) {
  const brackets = [
    { floor: 800_000, ceiling: 1_300_000, rate: 0.005 },
    { floor: 1_300_000, ceiling: 2_570_000, rate: 0.007 },
    { floor: 2_570_000, ceiling: 5_000_000, rate: 0.01 },
    { floor: 5_000_000, ceiling: 10_000_000, rate: 0.0125 },
    { floor: 10_000_000, ceiling: Number.POSITIVE_INFINITY, rate: 0.015 },
  ];

  return Math.round(
    brackets.reduce((sum, bracket) => {
      const taxableSlice = Math.max(0, Math.min(taxableBase, bracket.ceiling) - bracket.floor);
      return sum + taxableSlice * bracket.rate;
    }, 0),
  );
}

function createStep(
  id: string,
  order: number,
  label: string,
  inputValue: number | string,
  formula: string,
  outputValue: number | string,
  confidenceStatus: CalculationStep["confidenceStatus"],
  meta: Partial<
    Pick<
      CalculationStep,
      "usedData" | "intermediateResult" | "coverageLimitIds" | "nextAction" | "displayStatus"
    >
  > = {},
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
    ruleVersionId: RULE_ID,
    evidenceSourceId: SOURCE_ID,
    confidenceStatus,
    usedData: meta.usedData ?? [label],
    intermediateResult: meta.intermediateResult ?? String(outputValue),
    coverageLimitIds: meta.coverageLimitIds ?? ["coverage-ifi-main-residence"],
    nextAction: meta.nextAction ?? "Conserver l'etape dans le dossier de preuve.",
    displayStatus: meta.displayStatus ?? statusByConfidence[confidenceStatus],
  };
}
