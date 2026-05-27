import { demoHousehold } from "../demo-data/household";
import { demoTenant } from "../demo-data/v1";
import type {
  CalculationStep,
  Household,
  ProfessionalDocument,
  TaxModule,
  TaxRun,
} from "../types";

const tenantId = demoTenant.id;
const caseId = "case-claire-marc-2026";
const dossierSnapshotId = "snapshot-dossier-claire-marc-v2";
const DIRECT_LINE_ALLOWANCE_PER_CHILD = 100_000;
const FAMILY_CASH_GIFT_EXEMPTION = 31_865;

type StepMeta = {
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

type ProgressiveBracket = {
  ceiling: number;
  rate: number;
};

const directLineDonationBrackets: ProgressiveBracket[] = [
  { ceiling: 8_072, rate: 0.05 },
  { ceiling: 12_109, rate: 0.1 },
  { ceiling: 15_932, rate: 0.15 },
  { ceiling: 552_324, rate: 0.2 },
  { ceiling: 902_838, rate: 0.3 },
  { ceiling: 1_805_677, rate: 0.4 },
  { ceiling: Number.POSITIVE_INFINITY, rate: 0.45 },
];

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

export function calculateProgressiveTax(base: number, brackets: ProgressiveBracket[] = directLineDonationBrackets) {
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

function makeStep(meta: StepMeta): CalculationStep {
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

function taxRun({
  module,
  scenario,
  steps,
  resultLabel,
  resultAmount,
  evidenceSourceIds,
  reviewerRequired,
  computedResult,
}: {
  module: TaxModule;
  scenario: TaxRun["scenario"];
  steps: CalculationStep[];
  resultLabel: string;
  resultAmount?: number;
  evidenceSourceIds: string[];
  reviewerRequired: TaxRun["reviewerRequired"];
  computedResult: TaxRun["computedResult"];
}): TaxRun {
  return {
    id: `taxrun-${module}-claire-marc-v2`,
    module,
    scenario,
    tenantId,
    caseId,
    householdId: demoHousehold.id,
    dossierSnapshotId,
    inputSnapshotId: dossierSnapshotId,
    ruleSnapshotId: `${module}-rules-2026-05`,
    coverageLimitIds: Array.from(new Set(steps.flatMap((step) => step.coverageLimitIds))),
    professionalValidationRequired: true,
    status: "needs_review",
    createdAt: "2026-05-26T12:00:00.000Z",
    evidenceSourceIds,
    resultLabel,
    resultAmount,
    reviewerRequired,
    computedResult,
    steps,
  };
}

export function simulateIrPfuCdhr({
  household = demoHousehold,
  taxableIncome = 280_000,
  capitalIncome = 120_000,
  pfuRate = 0.314,
  otherIncomeTax = 58_000,
}: {
  household?: Household;
  taxableIncome?: number;
  capitalIncome?: number;
  pfuRate?: 0.3 | 0.314;
  otherIncomeTax?: number;
} = {}) {
  const pfuTax = Math.round(capitalIncome * pfuRate);
  const rfr = taxableIncome + capitalIncome;
  const minimumTax = rfr >= 500_000 ? Math.round(rfr * 0.2) : 0;
  const currentTax = otherIncomeTax + pfuTax;
  const cdhr = Math.max(0, minimumTax - currentTax);

  const steps = [
    makeStep({
      id: "ir-pfu-step-pfu",
      order: 1,
      label: "PFU sur revenus de capitaux",
      inputValue: capitalIncome,
      formula: `${capitalIncome} x ${(pfuRate * 100).toFixed(1)} %`,
      outputValue: pfuTax,
      ruleVersionId: "rule-ir-pfu-cdhr-2026-v2",
      evidenceSourceId: "src-service-public-pfu-2026",
      coverageLimitIds: ["coverage-ir-pfu-cdhr-simple"],
    }),
    makeStep({
      id: "ir-pfu-step-cdhr",
      order: 2,
      label: "CDHR indicative",
      inputValue: rfr,
      formula: `max(0, 20 % RFR - impôts déjà estimés)`,
      outputValue: cdhr,
      ruleVersionId: "rule-ir-pfu-cdhr-2026-v2",
      evidenceSourceId: "src-economie-cdhr-2026",
      coverageLimitIds: ["coverage-ir-pfu-cdhr-simple"],
      confidenceStatus: "needs_review",
      nextAction: "Valider le revenu fiscal de référence et les impôts déjà dus.",
    }),
  ];

  return taxRun({
    module: "ir-pfu-cdhr",
    scenario: "ir-pfu-cdhr",
    steps,
    resultLabel: household.name,
    resultAmount: pfuTax + cdhr,
    evidenceSourceIds: ["src-service-public-pfu-2026", "src-economie-cdhr-2026"],
    reviewerRequired: "avocat",
    computedResult: { taxableIncome, capitalIncome, pfuTax, rfr, minimumTax, cdhr },
  });
}

export function simulateRealEstateGainV2({
  salePrice = 720_000,
  purchasePrice = 420_000,
  acquisitionCosts = 31_500,
  works = 35_000,
  yearsHeld = 9,
  isMainResidence = false,
}: {
  salePrice?: number;
  purchasePrice?: number;
  acquisitionCosts?: number;
  works?: number;
  yearsHeld?: number;
  isMainResidence?: boolean;
} = {}) {
  const grossGain = Math.max(0, salePrice - purchasePrice - acquisitionCosts - works);
  const allowances = calculateRealEstateHoldingAllowances(yearsHeld);
  const incomeTaxAllowanceRate = isMainResidence ? 1 : allowances.incomeTaxAllowanceRate;
  const socialAllowanceRate = isMainResidence ? 1 : allowances.socialAllowanceRate;
  const incomeTaxBase = Math.round(grossGain * (1 - incomeTaxAllowanceRate));
  const socialTaxBase = Math.round(grossGain * (1 - socialAllowanceRate));
  const incomeTax = Math.round(incomeTaxBase * 0.19);
  const socialTax = Math.round(socialTaxBase * 0.172);
  const surtax = isMainResidence ? 0 : calculateHighRealEstateGainSurtax(incomeTaxBase);
  const estimatedTax = incomeTax + socialTax + surtax;
  const surtaxSignal = isMainResidence
    ? "Résidence principale exonérée dans le cas simple"
    : surtax > 0
      ? "Surtaxe plus-value élevée appliquée"
      : "Pas de surtaxe signalée";

  const steps = [
    makeStep({
      id: "pvi-step-gross",
      order: 1,
      label: "Plus-value brute corrigée",
      inputValue: `${salePrice} / ${purchasePrice}`,
      formula: "cession - acquisition - frais - travaux",
      outputValue: grossGain,
      ruleVersionId: "rule-plus-value-immobiliere-2026-v1",
      evidenceSourceId: "src-bofip-plus-value-immobiliere",
      coverageLimitIds: ["coverage-plus-value-structure"],
    }),
    makeStep({
      id: "pvi-step-allowances",
      order: 2,
      label: "Abattements durée de détention",
      inputValue: yearsHeld,
      formula: "IR 22 ans / prélèvements sociaux 30 ans",
      outputValue: `${Math.round(incomeTaxAllowanceRate * 100)} % / ${Math.round(socialAllowanceRate * 100)} %`,
      ruleVersionId: "rule-plus-value-immobiliere-2026-v1",
      evidenceSourceId: "src-bofip-plus-value-immobiliere",
      coverageLimitIds: ["coverage-plus-value-structure"],
      confidenceStatus: "needs_review",
    }),
    makeStep({
      id: "pvi-step-tax",
      order: 3,
      label: "Impôt indicatif plus-value",
      inputValue: `${incomeTaxBase} / ${socialTaxBase}`,
      formula: "base IR x 19 % + base PS x 17,2 % + surtaxe éventuelle",
      outputValue: estimatedTax,
      ruleVersionId: "rule-plus-value-immobiliere-2026-v1",
      evidenceSourceId: "src-bofip-plus-value-immobiliere",
      coverageLimitIds: ["coverage-plus-value-structure"],
      confidenceStatus: "needs_review",
      nextAction: "Contrôler exonération résidence principale, surtaxe et justificatifs.",
    }),
    makeStep({
      id: "pvi-step-surtax",
      order: 4,
      label: "Surtaxe plus-value élevée",
      inputValue: incomeTaxBase,
      formula: "barème spécifique si plus-value imposable IR > 50 000 €",
      outputValue: surtax,
      ruleVersionId: "rule-plus-value-immobiliere-2026-v1",
      evidenceSourceId: "src-bofip-plus-value-immobiliere",
      coverageLimitIds: ["coverage-plus-value-structure"],
      confidenceStatus: surtax > 0 ? "needs_review" : "indicative",
      nextAction: "Valider la nature du bien, le seuil et les abattements avant toute conclusion.",
    }),
  ];

  return taxRun({
    module: "plus-value-immo",
    scenario: "plus-value",
    steps,
    resultLabel: surtaxSignal,
    resultAmount: estimatedTax,
    evidenceSourceIds: ["src-bofip-plus-value-immobiliere"],
    reviewerRequired: "avocat",
    computedResult: {
      grossGain,
      incomeTaxAllowanceRate,
      socialAllowanceRate,
      incomeTaxBase,
      socialTaxBase,
      incomeTax,
      socialTax,
      surtax,
      estimatedTax,
      surtaxSignal,
      isMainResidence,
    },
  });
}

export function simulateTransmissionV2({
  assetValue = 300_000,
  children = 2,
  priorDonations = 0,
  donorAge = 51,
  useDismemberment = false,
  familyCashGift = 0,
}: {
  assetValue?: number;
  children?: number;
  priorDonations?: number;
  donorAge?: number;
  useDismemberment?: boolean;
  familyCashGift?: number;
} = {}) {
  const childCount = Math.max(1, children);
  const bareOwnershipRate = getBareOwnershipRate(donorAge);
  const transmittedValue = useDismemberment ? Math.round(assetValue * bareOwnershipRate) : assetValue;
  const grossShare = Math.round(transmittedValue / childCount);
  const availableAllowancePerChild = Math.max(0, DIRECT_LINE_ALLOWANCE_PER_CHILD - priorDonations);
  const taxableShare = Math.max(0, grossShare - availableAllowancePerChild);
  const rightsPerChild = calculateProgressiveTax(taxableShare);
  const indicativeRights = rightsPerChild * childCount;
  const familyCashGiftNeedsReview = familyCashGift > 0;

  const steps = [
    makeStep({
      id: "transmission-step-share",
      order: 1,
      label: "Part transmise par enfant",
      inputValue: transmittedValue,
      formula: `${transmittedValue} / ${childCount}`,
      outputValue: grossShare,
      ruleVersionId: "rule-transmission-checklist-2026-v1",
      evidenceSourceId: "src-legifrance-code-civil-transmission",
      coverageLimitIds: ["coverage-transmission-checklist"],
    }),
    makeStep({
      id: "transmission-step-bare-ownership",
      order: 2,
      label: "Valeur fiscale en nue-propriété",
      inputValue: `${assetValue} / ${donorAge} ans`,
      formula: useDismemberment ? `valeur x ${Math.round(bareOwnershipRate * 100)} %` : "pleine propriété retenue",
      outputValue: transmittedValue,
      ruleVersionId: "rule-donation-usufruit-2026-v1",
      evidenceSourceId: "src-impots-donation-usufruit",
      coverageLimitIds: ["coverage-donation-usufruit-simple"],
      confidenceStatus: useDismemberment ? "needs_review" : "indicative",
      nextAction: "Valider l'âge, la réserve d'usufruit et l'acte envisagé avec le notaire.",
    }),
    makeStep({
      id: "transmission-step-allowance",
      order: 3,
      label: "Abattement indicatif par enfant",
      inputValue: `${grossShare} / donations antérieures ${priorDonations}`,
      formula: "part enfant - abattement disponible sur 15 ans",
      outputValue: taxableShare,
      ruleVersionId: "rule-transmission-checklist-2026-v1",
      evidenceSourceId: "src-legifrance-code-civil-transmission",
      coverageLimitIds: ["coverage-transmission-checklist", "coverage-donation-usufruit-simple"],
      confidenceStatus: "needs_review",
      nextAction: "Valider donations antérieures, donation-partage et protection du conjoint.",
    }),
    makeStep({
      id: "transmission-step-progressive-scale",
      order: 4,
      label: "Droits indicatifs au barème ligne directe",
      inputValue: taxableShare,
      formula: "barème progressif 5 % à 45 %",
      outputValue: indicativeRights,
      ruleVersionId: "rule-transmission-checklist-2026-v1",
      evidenceSourceId: "src-legifrance-code-civil-transmission",
      coverageLimitIds: ["coverage-transmission-checklist"],
      confidenceStatus: "needs_review",
      nextAction: "Faire liquider les droits par le notaire avant toute décision.",
    }),
    makeStep({
      id: "transmission-step-family-cash-gift",
      order: 5,
      label: "Don familial de somme d'argent",
      inputValue: familyCashGift,
      formula: `exonération potentielle ${FAMILY_CASH_GIFT_EXEMPTION} € sous conditions`,
      outputValue: familyCashGiftNeedsReview ? "À vérifier" : "Non mobilisé",
      ruleVersionId: "rule-transmission-checklist-2026-v1",
      evidenceSourceId: "src-legifrance-code-civil-transmission",
      coverageLimitIds: ["coverage-transmission-checklist"],
      confidenceStatus: familyCashGiftNeedsReview ? "needs_review" : "indicative",
      nextAction: "Vérifier âge du donateur, majorité du bénéficiaire et cumul des exonérations.",
    }),
  ];

  return taxRun({
    module: "transmission",
    scenario: "transmission",
    steps,
    resultLabel: `Donateur ${donorAge} ans, ${childCount} enfants`,
    resultAmount: indicativeRights,
    evidenceSourceIds: ["src-legifrance-code-civil-transmission", "src-impots-donation-usufruit"],
    reviewerRequired: "notaire",
    computedResult: {
      assetValue,
      children: childCount,
      donorAge,
      useDismemberment,
      bareOwnershipRate,
      transmittedValue,
      grossShare,
      priorDonations,
      availableAllowancePerChild,
      taxableShare,
      rightsPerChild,
      indicativeRights,
      familyCashGift,
      familyCashGiftNeedsReview,
    },
  });
}

export function simulateDutreilV2({
  companyValue = 850_000,
  eligibleOperatingValue = 790_000,
  nonEligibleAssets = 60_000,
  excludedLuxuryAssetsValue = 0,
  collectiveCommitmentSigned = true,
  managementCommitmentSigned = true,
  individualCommitmentYears = 6,
}: {
  companyValue?: number;
  eligibleOperatingValue?: number;
  nonEligibleAssets?: number;
  excludedLuxuryAssetsValue?: number;
  collectiveCommitmentSigned?: boolean;
  managementCommitmentSigned?: boolean;
  individualCommitmentYears?: number;
} = {}) {
  const totalExcludedValue = nonEligibleAssets + excludedLuxuryAssetsValue;
  const eligibleBase = Math.max(0, Math.min(eligibleOperatingValue, companyValue - totalExcludedValue));
  const eligible = collectiveCommitmentSigned && managementCommitmentSigned && individualCommitmentYears >= 6;
  const exemptValue = eligible ? Math.round(eligibleBase * 0.75) : 0;
  const taxableBeforeOtherAllowances = companyValue - exemptValue;

  const steps = [
    makeStep({
      id: "dutreil-step-eligibility",
      order: 1,
      label: "Éligibilité Dutreil LF 2026",
      inputValue: `${collectiveCommitmentSigned} / ${managementCommitmentSigned} / ${individualCommitmentYears} ans`,
      formula: "engagement collectif + fonction de direction + engagement individuel 6 ans",
      outputValue: eligible ? "Éligible sous réserve" : "Non éligible",
      ruleVersionId: "rule-dutreil-2026-v2",
      evidenceSourceId: "src-legifrance-dutreil-2026",
      coverageLimitIds: ["coverage-dutreil-eligibility"],
      confidenceStatus: "needs_review",
    }),
    makeStep({
      id: "dutreil-step-exclusions",
      order: 2,
      label: "Actifs exclus ou non affectés",
      inputValue: `${nonEligibleAssets} / ${excludedLuxuryAssetsValue}`,
      formula: "actifs non éligibles + biens somptuaires à exclure",
      outputValue: totalExcludedValue,
      ruleVersionId: "rule-dutreil-2026-v2",
      evidenceSourceId: "src-legifrance-dutreil-2026",
      coverageLimitIds: ["coverage-dutreil-eligibility"],
      confidenceStatus: totalExcludedValue > 0 ? "needs_review" : "indicative",
      nextAction: "Inventorier les actifs non affectés à l'exploitation et les biens somptuaires.",
    }),
    makeStep({
      id: "dutreil-step-exemption",
      order: 3,
      label: "Abattement Dutreil indicatif",
      inputValue: eligibleBase,
      formula: "valeur éligible nette x 75 %",
      outputValue: exemptValue,
      ruleVersionId: "rule-dutreil-2026-v2",
      evidenceSourceId: "src-legifrance-dutreil-2026",
      coverageLimitIds: ["coverage-dutreil-eligibility"],
      confidenceStatus: "needs_review",
      nextAction: "Faire qualifier l'activité, les actifs non affectés et les engagements par notaire/avocat.",
    }),
  ];

  return taxRun({
    module: "dutreil",
    scenario: "dutreil",
    steps,
    resultLabel: `${totalExcludedValue} € d'actifs à exclure ou documenter`,
    resultAmount: taxableBeforeOtherAllowances,
    evidenceSourceIds: ["src-legifrance-dutreil-2026"],
    reviewerRequired: "notaire",
    computedResult: {
      eligible,
      companyValue,
      eligibleOperatingValue,
      nonEligibleAssets,
      excludedLuxuryAssetsValue,
      totalExcludedValue,
      eligibleBase,
      collectiveCommitmentSigned,
      managementCommitmentSigned,
      individualCommitmentYears,
      exemptValue,
      taxableBeforeOtherAllowances,
    },
  });
}

export function simulateApportCessionV2({
  saleProceeds = 1_200_000,
  reinvestedAmount = 860_000,
  reinvestmentMonths = 30,
  conservationYears = 5,
}: {
  saleProceeds?: number;
  reinvestedAmount?: number;
  reinvestmentMonths?: number;
  conservationYears?: number;
} = {}) {
  const requiredReinvestment = Math.round(saleProceeds * 0.7);
  const compliant = reinvestedAmount >= requiredReinvestment && reinvestmentMonths <= 36 && conservationYears >= 5;

  const steps = [
    makeStep({
      id: "apport-step-reinvestment",
      order: 1,
      label: "Réinvestissement minimal",
      inputValue: saleProceeds,
      formula: "produit de cession x 70 %",
      outputValue: requiredReinvestment,
      ruleVersionId: "rule-apport-cession-2026-v2",
      evidenceSourceId: "src-legifrance-apport-cession-2026",
      coverageLimitIds: ["coverage-apport-cession-150-0-b-ter"],
    }),
    makeStep({
      id: "apport-step-status",
      order: 2,
      label: "Maintien indicatif du report",
      inputValue: `${reinvestedAmount} / ${reinvestmentMonths} mois / ${conservationYears} ans`,
      formula: "70 % + 36 mois + conservation 5 ans",
      outputValue: compliant ? "Conditions indicatives réunies" : "Correction requise",
      ruleVersionId: "rule-apport-cession-2026-v2",
      evidenceSourceId: "src-legifrance-apport-cession-2026",
      coverageLimitIds: ["coverage-apport-cession-150-0-b-ter"],
      confidenceStatus: "needs_review",
    }),
  ];

  return taxRun({
    module: "apport-cession",
    scenario: "apport-cession",
    steps,
    resultLabel: compliant ? "Report à documenter" : "Report fragilisé",
    resultAmount: requiredReinvestment,
    evidenceSourceIds: ["src-legifrance-apport-cession-2026"],
    reviewerRequired: "avocat",
    computedResult: { saleProceeds, reinvestedAmount, requiredReinvestment, reinvestmentMonths, conservationYears, compliant },
  });
}

export function simulateHoldingTaxV2({
  isSubjectToCorporateTax = true,
  totalAssets = 5_400_000,
  passiveIncomeRatio = 0.56,
  individualControlRatio = 0.72,
  luxuryAssetsValue = 420_000,
  financialAssetsValue = 0,
  realEstateLuxuryValue = 0,
  cashAndReceivablesValue = 0,
}: {
  isSubjectToCorporateTax?: boolean;
  totalAssets?: number;
  passiveIncomeRatio?: number;
  individualControlRatio?: number;
  luxuryAssetsValue?: number;
  financialAssetsValue?: number;
  realEstateLuxuryValue?: number;
  cashAndReceivablesValue?: number;
} = {}) {
  const criteria = {
    isSubjectToCorporateTax,
    assetThreshold: totalAssets >= 5_000_000,
    passiveIncome: passiveIncomeRatio > 0.5,
    individualControl: individualControlRatio >= 0.5,
  };
  const conditionsMet = Object.values(criteria).every(Boolean);
  const taxableLuxuryInventory =
    luxuryAssetsValue + financialAssetsValue + realEstateLuxuryValue + cashAndReceivablesValue;
  const holdingTax = conditionsMet ? Math.round(taxableLuxuryInventory * 0.2) : 0;

  const steps = [
    makeStep({
      id: "holding-step-conditions",
      order: 1,
      label: "Critères cumulés holding patrimoniale",
      inputValue: `${totalAssets} / ${Math.round(passiveIncomeRatio * 100)} % / ${Math.round(individualControlRatio * 100)} %`,
      formula: "IS + actifs >= 5 M€ + revenus passifs > 50 % + contrôle >= 50 %",
      outputValue: conditionsMet ? "Critères réunis" : "Critères non réunis",
      ruleVersionId: "rule-holding-tax-2026-v2",
      evidenceSourceId: "src-legifrance-holding-tax-2026",
      coverageLimitIds: ["coverage-holding-tax-235-ter-c"],
      confidenceStatus: "needs_review",
    }),
    makeStep({
      id: "holding-step-inventory",
      order: 2,
      label: "Inventaire taxable indicatif",
      inputValue: `${luxuryAssetsValue} / ${financialAssetsValue} / ${realEstateLuxuryValue} / ${cashAndReceivablesValue}`,
      formula: "biens somptuaires + actifs financiers + immobilier de jouissance + liquidités ciblées",
      outputValue: taxableLuxuryInventory,
      ruleVersionId: "rule-holding-tax-2026-v2",
      evidenceSourceId: "src-legifrance-holding-tax-2026",
      coverageLimitIds: ["coverage-holding-tax-235-ter-c"],
      confidenceStatus: taxableLuxuryInventory > 0 ? "needs_review" : "indicative",
      nextAction: "Qualifier chaque ligne de l'inventaire avant application du taux.",
    }),
    makeStep({
      id: "holding-step-tax",
      order: 3,
      label: "Taxe indicative sur actifs non professionnels",
      inputValue: taxableLuxuryInventory,
      formula: "valeur vénale brute x 20 %",
      outputValue: holdingTax,
      ruleVersionId: "rule-holding-tax-2026-v2",
      evidenceSourceId: "src-legifrance-holding-tax-2026",
      coverageLimitIds: ["coverage-holding-tax-235-ter-c"],
      confidenceStatus: "needs_review",
      nextAction: "Qualifier chaque actif et l'articulation IFI avant toute conclusion.",
    }),
  ];

  return taxRun({
    module: "holding-tax",
    scenario: "holding-tax",
    steps,
    resultLabel: conditionsMet ? "Risque taxe holding détecté" : "Pas d'alerte immédiate",
    resultAmount: holdingTax,
    evidenceSourceIds: ["src-legifrance-holding-tax-2026"],
    reviewerRequired: "avocat",
    computedResult: {
      conditionsMet,
      isSubjectToCorporateTaxCriteria: criteria.isSubjectToCorporateTax,
      assetThresholdCriteria: criteria.assetThreshold,
      passiveIncomeCriteria: criteria.passiveIncome,
      individualControlCriteria: criteria.individualControl,
      totalAssets,
      passiveIncomeRatio,
      individualControlRatio,
      luxuryAssetsValue,
      financialAssetsValue,
      realEstateLuxuryValue,
      cashAndReceivablesValue,
      taxableLuxuryInventory,
      holdingTax,
    },
  });
}

export const v2TaxRuns = [
  simulateIrPfuCdhr(),
  simulateRealEstateGainV2(),
  simulateTransmissionV2(),
  simulateDutreilV2(),
  simulateApportCessionV2(),
  simulateHoldingTaxV2(),
];

export function getV2TaxRuns() {
  return v2TaxRuns;
}

export function generateProfessionalDocuments(caseIdInput = caseId): ProfessionalDocument[] {
  const base = {
    tenantId,
    caseId: caseIdInput,
    generatedAt: "2026-05-26T12:30:00.000Z",
    version: "V2.0-draft",
    status: "draft" as const,
    professionalValidationRequired: true,
  };

  return [
    {
      ...base,
      id: "doc-der-v2",
      kind: "der",
      title: "Document d'entrée en relation",
      hash: "doc-der-v2-hash-demo",
      requiredInputs: ["Identité client", "Statut CIF/IAS/IOBSP", "Mode de rémunération"],
    },
    {
      ...base,
      id: "doc-fil-v2",
      kind: "fil",
      title: "Fiche d'information légale",
      hash: "doc-fil-v2-hash-demo",
      requiredInputs: ["Cabinet", "Mandat", "Champ de mission"],
    },
    {
      ...base,
      id: "doc-lettre-mission-v2",
      kind: "lettre-mission",
      title: "Lettre de mission patrimoniale",
      hash: "doc-lettre-mission-v2-hash-demo",
      requiredInputs: ["Objectifs", "Livrables", "Limites", "Validation professionnelle"],
    },
    {
      ...base,
      id: "doc-adequation-v2",
      kind: "rapport-adequation",
      title: "Rapport d'adéquation MIF II",
      hash: "doc-adequation-v2-hash-demo",
      requiredInputs: ["Profil client", "Objectifs", "Risques", "Raisons de l'adéquation"],
    },
    {
      ...base,
      id: "doc-note-fiscale-v2",
      kind: "note-synthese-fiscale",
      title: "Note de synthèse fiscale sourcée",
      hash: "doc-note-fiscale-v2-hash-demo",
      requiredInputs: ["Simulations", "Sources", "Limites", "Questions ouvertes"],
    },
    {
      ...base,
      id: "doc-lcb-ft-v2",
      kind: "checklist-lcb-ft",
      title: "Checklist LCB-FT",
      hash: "doc-lcb-ft-v2-hash-demo",
      requiredInputs: ["Identité", "Origine des fonds", "Bénéficiaires effectifs", "Risque"],
    },
  ];
}
