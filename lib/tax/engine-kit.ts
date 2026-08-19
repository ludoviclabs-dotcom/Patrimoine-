import type { CalculationStep, TaxModule, TaxRun } from "../types";

/**
 * Socle commun des moteurs fiscaux (v2 et v3).
 *
 * Extraction pure depuis lib/tax/v2-engines.ts : makeStep, la factory taxRun,
 * le barème progressif et le barème usufruit art. 669 CGI.
 *
 * PF-02B2 : `calculateProgressiveTax` ne pratique aucun arrondi intermédiaire
 * par tranche — chaque tranche est calculée au centime exact, la somme n'est
 * arrondie qu'une seule fois, à l'euro le plus proche, sur le total. C'est la
 * convention confirmée par BOFiP (BOI-ENR-DG-30, § 100 : « les sommes ou
 * valeurs servant de base aux droits... sont arrondies à l'euro le plus
 * proche » puis « la même règle s'applique pour l'arrondissement des
 * montants des droits... exigibles » — l'arrondi porte sur le montant final
 * dû, pas sur chaque tranche) et par l'exemple officiel chiffré de
 * service-public.gouv.fr (fiche F14205, donation de 200 000 € à un enfant,
 * abattement 100 000 € : tranches à 403,60 € / 403,70 € / 573,45 € /
 * 16 813,60 €, total exact 18 194,35 €, droits dus arrondis à 18 194 €).
 * Une ancienne option `perSliceRounding` arrondissait chaque tranche avant
 * sommation ; elle a été retirée le 19/08/2026 car elle produisait un écart
 * de 1 € par rapport à cette référence officielle sur le cas Dutreil à 1 M€
 * (voir `docs/agent/PF02B_FISCAL_COMPLETENESS.md`).
 */

export type StepMeta = {
  id: string;
  order: number;
  label: string;
  inputValue: number | string;
  formula: string;
  outputValue: number | string;
  ruleVersionId: string;
  evidenceSourceId: string;
  coverageLimitIds: string[];
  confidenceStatus?: CalculationStep["confidenceStatus"];
  nextAction?: string;
};

export type ProgressiveBracket = {
  ceiling: number;
  rate: number;
};

/** Barème des droits de mutation à titre gratuit en ligne directe (art. 777 CGI, tableau I). */
export const directLineDonationBrackets: ProgressiveBracket[] = [
  { ceiling: 8_072, rate: 0.05 },
  { ceiling: 12_109, rate: 0.1 },
  { ceiling: 15_932, rate: 0.15 },
  { ceiling: 552_324, rate: 0.2 },
  { ceiling: 902_838, rate: 0.3 },
  { ceiling: 1_805_677, rate: 0.4 },
  { ceiling: Number.POSITIVE_INFINITY, rate: 0.45 },
];

/** Valeur fiscale de la nue-propriété selon l'âge de l'usufruitier (art. 669 I CGI). */
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

export function calculateProgressiveTax(
  base: number,
  brackets: ProgressiveBracket[] = directLineDonationBrackets,
) {
  let previousCeiling = 0;
  let tax = 0;

  for (const bracket of brackets) {
    const slice = Math.max(0, Math.min(base, bracket.ceiling) - previousCeiling);
    tax += slice * bracket.rate;
    previousCeiling = bracket.ceiling;
    if (base <= bracket.ceiling) break;
  }

  return Math.round(tax);
}

export function makeStep(meta: StepMeta): CalculationStep {
  const confidenceStatus = meta.confidenceStatus ?? "indicative";
  const statusByConfidence: Record<
    CalculationStep["confidenceStatus"],
    CalculationStep["displayStatus"]
  > = {
    validated: "validated_calculation",
    indicative: "indicative_calculation",
    needs_review: "professional_review_required",
  };

  return {
    id: meta.id,
    order: meta.order,
    label: meta.label,
    inputValue: meta.inputValue,
    formula: meta.formula,
    outputValue: meta.outputValue,
    ruleVersionId: meta.ruleVersionId,
    evidenceSourceId: meta.evidenceSourceId,
    confidenceStatus,
    usedData: [meta.label],
    intermediateResult: `${meta.formula} = ${meta.outputValue}`,
    coverageLimitIds: meta.coverageLimitIds,
    nextAction: meta.nextAction ?? "Faire valider cette étape avant remise client.",
    displayStatus: statusByConfidence[confidenceStatus],
  };
}

export type TaxRunContext = {
  tenantId: string;
  caseId: string;
  householdId: string;
  dossierSnapshotId: string;
  runIdSuffix: string;
  createdAt: string;
};

export type TaxRunInput = {
  module: TaxModule;
  scenario: TaxRun["scenario"];
  steps: CalculationStep[];
  resultLabel: string;
  resultAmount?: number;
  evidenceSourceIds: string[];
  reviewerRequired: TaxRun["reviewerRequired"];
  computedResult: TaxRun["computedResult"];
};

export function createTaxRunFactory(context: TaxRunContext) {
  return function taxRun({
    module,
    scenario,
    steps,
    resultLabel,
    resultAmount,
    evidenceSourceIds,
    reviewerRequired,
    computedResult,
  }: TaxRunInput): TaxRun {
    return {
      id: `taxrun-${scenario}-${context.runIdSuffix}`,
      module,
      scenario,
      tenantId: context.tenantId,
      caseId: context.caseId,
      householdId: context.householdId,
      dossierSnapshotId: context.dossierSnapshotId,
      inputSnapshotId: context.dossierSnapshotId,
      ruleSnapshotId: `${module}-rules-2026-05`,
      coverageLimitIds: Array.from(new Set(steps.flatMap((step) => step.coverageLimitIds))),
      professionalValidationRequired: true,
      status: "needs_review",
      createdAt: context.createdAt,
      evidenceSourceIds,
      resultLabel,
      resultAmount,
      reviewerRequired,
      computedResult,
      steps,
    };
  };
}
