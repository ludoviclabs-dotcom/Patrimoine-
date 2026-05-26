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
      "Residence principale",
      mainResidence,
      "Valeur declaree x 70 %",
      mainResidenceTaxable,
      "indicative",
      {
        usedData: ["Residence principale declaree", "Abattement residence principale"],
        intermediateResult: `${mainResidence} x 70 % = ${mainResidenceTaxable}`,
        coverageLimitIds: ["coverage-ifi-main-residence"],
        nextAction: "Confirmer la valeur avec un avis de valeur recent.",
      },
    ),
    createStep(
      "ifi-step-rental",
      2,
      "Immobilier locatif",
      rental,
      "Valeur immobiliere retenue",
      rental,
      "indicative",
      {
        usedData: ["Immobilier locatif declare"],
        intermediateResult: `${rental}`,
        coverageLimitIds: ["coverage-ifi-rental-simple"],
        nextAction: "Verifier titres, baux et valorisation retenue.",
      },
    ),
    createStep(
      "ifi-step-sci",
      3,
      "Parts SCI immobiliere",
      sci,
      "Valeur immobiliere a controler",
      sci,
      "needs_review",
      {
        usedData: ["Parts SCI declarees"],
        intermediateResult: `${sci}`,
        coverageLimitIds: ["coverage-ifi-sci-simple", "coverage-ifi-holdings"],
        nextAction: "Confirmer la repartition des parts et les actifs immobiliers sous-jacents.",
      },
    ),
    createStep(
      "ifi-step-subtotal",
      4,
      "Sous-total immobilier IFI simplifie",
      `${mainResidenceTaxable} + ${rental} + ${sci} + ${other}`,
      "Somme des valeurs retenues",
      taxableRealEstateBeforeDebt,
      "indicative",
      {
        usedData: ["Residence principale", "Immobilier locatif", "Parts SCI"],
        intermediateResult: `${mainResidenceTaxable} + ${rental} + ${sci} + ${other} = ${taxableRealEstateBeforeDebt}`,
        coverageLimitIds: [
          "coverage-ifi-main-residence",
          "coverage-ifi-rental-simple",
          "coverage-ifi-sci-simple",
        ],
        nextAction: "Controler les cas non couverts avant conclusion.",
      },
    ),
    createStep(
      "ifi-step-debt",
      5,
      "Dettes immobilieres declarees",
      deductibleDebt,
      "Sous conditions de deductibilite",
      -deductibleDebt,
      "needs_review",
      {
        usedData: ["Dettes immobilieres declarees"],
        intermediateResult: `${taxableRealEstateBeforeDebt} - ${deductibleDebt} = ${taxableBase}`,
        coverageLimitIds: ["coverage-ifi-deductible-debt"],
        nextAction: "Verifier la nature et la deductibilite de chaque dette.",
      },
    ),
    createStep(
      "ifi-step-threshold",
      6,
      "Base simplifiee comparee au seuil",
      taxableBase,
      `Base nette ${triggered ? ">" : "<="} ${THRESHOLD}`,
      triggered ? "Alerte IFI" : "Sous seuil indicatif",
      "indicative",
      {
        usedData: ["Base IFI simplifiee", "Seuil IFI"],
        intermediateResult: `${taxableBase} ${triggered ? ">" : "<="} ${THRESHOLD}`,
        coverageLimitIds: [
          "coverage-ifi-trusts",
          "coverage-ifi-demembrement-complexe",
          "coverage-ifi-actifs-pro-complexes",
          "coverage-ifi-non-residents-complexes",
        ],
        nextAction:
          "Faire relire les dettes, SCI et situations particulieres avant usage professionnel.",
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
      message: triggered
        ? "Alerte IFI : la base simplifiee depasse le seuil, revue professionnelle requise."
        : "Pas d'alerte immediate dans cette simulation, sous reserve de validation des dettes et situations particulieres.",
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
