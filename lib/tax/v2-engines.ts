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
  const incomeTaxAllowanceRate = isMainResidence ? 1 : yearsHeld <= 5 ? 0 : Math.min(1, (yearsHeld - 5) * 0.06);
  const socialAllowanceRate = isMainResidence ? 1 : yearsHeld <= 5 ? 0 : Math.min(1, (yearsHeld - 5) * 0.0165);
  const incomeTaxBase = Math.round(grossGain * (1 - incomeTaxAllowanceRate));
  const socialTaxBase = Math.round(grossGain * (1 - socialAllowanceRate));
  const estimatedTax = Math.round(incomeTaxBase * 0.19 + socialTaxBase * 0.172);
  const surtaxSignal = incomeTaxBase > 50_000 ? "Surtaxe à vérifier" : "Pas de surtaxe signalée";

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
      formula: "abattements IR et prélèvements sociaux",
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
      formula: "base IR x 19 % + base PS x 17,2 %",
      outputValue: estimatedTax,
      ruleVersionId: "rule-plus-value-immobiliere-2026-v1",
      evidenceSourceId: "src-bofip-plus-value-immobiliere",
      coverageLimitIds: ["coverage-plus-value-structure"],
      confidenceStatus: "needs_review",
      nextAction: "Contrôler exonération résidence principale, surtaxe et justificatifs.",
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
    computedResult: { grossGain, incomeTaxBase, socialTaxBase, estimatedTax, surtaxSignal },
  });
}

export function simulateTransmissionV2({
  assetValue = 300_000,
  children = 2,
  priorDonations = 0,
  donorAge = 51,
}: {
  assetValue?: number;
  children?: number;
  priorDonations?: number;
  donorAge?: number;
} = {}) {
  const allowancePerChild = 100_000;
  const grossShare = Math.round(assetValue / children);
  const taxableShare = Math.max(0, grossShare + priorDonations - allowancePerChild);
  const indicativeRights = Math.round(taxableShare * 0.2 * children);

  const steps = [
    makeStep({
      id: "transmission-step-share",
      order: 1,
      label: "Part transmise par enfant",
      inputValue: assetValue,
      formula: `${assetValue} / ${children}`,
      outputValue: grossShare,
      ruleVersionId: "rule-transmission-checklist-2026-v1",
      evidenceSourceId: "src-legifrance-code-civil-transmission",
      coverageLimitIds: ["coverage-transmission-checklist"],
    }),
    makeStep({
      id: "transmission-step-allowance",
      order: 2,
      label: "Abattement indicatif par enfant",
      inputValue: `${grossShare} + donations antérieures ${priorDonations}`,
      formula: "base enfant - 100 000 €",
      outputValue: taxableShare,
      ruleVersionId: "rule-transmission-checklist-2026-v1",
      evidenceSourceId: "src-legifrance-code-civil-transmission",
      coverageLimitIds: ["coverage-transmission-checklist", "coverage-donation-usufruit-simple"],
      confidenceStatus: "needs_review",
      nextAction: "Valider donations antérieures, donation-partage et protection du conjoint.",
    }),
  ];

  return taxRun({
    module: "transmission",
    scenario: "transmission",
    steps,
    resultLabel: `Donateur ${donorAge} ans, ${children} enfants`,
    resultAmount: indicativeRights,
    evidenceSourceIds: ["src-legifrance-code-civil-transmission", "src-impots-donation-usufruit"],
    reviewerRequired: "notaire",
    computedResult: { assetValue, children, grossShare, taxableShare, indicativeRights, donorAge },
  });
}

export function simulateDutreilV2({
  companyValue = 850_000,
  eligibleOperatingValue = 790_000,
  nonEligibleAssets = 60_000,
  collectiveCommitmentSigned = true,
  individualCommitmentYears = 6,
}: {
  companyValue?: number;
  eligibleOperatingValue?: number;
  nonEligibleAssets?: number;
  collectiveCommitmentSigned?: boolean;
  individualCommitmentYears?: number;
} = {}) {
  const eligible = collectiveCommitmentSigned && individualCommitmentYears >= 6;
  const exemptValue = eligible ? Math.round(eligibleOperatingValue * 0.75) : 0;
  const taxableBeforeOtherAllowances = companyValue - exemptValue;

  const steps = [
    makeStep({
      id: "dutreil-step-eligibility",
      order: 1,
      label: "Éligibilité Dutreil LF 2026",
      inputValue: `${collectiveCommitmentSigned} / ${individualCommitmentYears} ans`,
      formula: "engagement collectif + engagement individuel 6 ans",
      outputValue: eligible ? "Éligible sous réserve" : "Non éligible",
      ruleVersionId: "rule-dutreil-2026-v2",
      evidenceSourceId: "src-legifrance-dutreil-2026",
      coverageLimitIds: ["coverage-dutreil-eligibility"],
      confidenceStatus: "needs_review",
    }),
    makeStep({
      id: "dutreil-step-exemption",
      order: 2,
      label: "Abattement Dutreil indicatif",
      inputValue: eligibleOperatingValue,
      formula: "valeur éligible x 75 %",
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
    resultLabel: `${nonEligibleAssets} € d'actifs à exclure ou documenter`,
    resultAmount: taxableBeforeOtherAllowances,
    evidenceSourceIds: ["src-legifrance-dutreil-2026"],
    reviewerRequired: "notaire",
    computedResult: { eligible, companyValue, eligibleOperatingValue, exemptValue, taxableBeforeOtherAllowances },
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
}: {
  isSubjectToCorporateTax?: boolean;
  totalAssets?: number;
  passiveIncomeRatio?: number;
  individualControlRatio?: number;
  luxuryAssetsValue?: number;
} = {}) {
  const conditionsMet =
    isSubjectToCorporateTax &&
    totalAssets >= 5_000_000 &&
    passiveIncomeRatio > 0.5 &&
    individualControlRatio >= 0.5;
  const holdingTax = conditionsMet ? Math.round(luxuryAssetsValue * 0.2) : 0;

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
      id: "holding-step-tax",
      order: 2,
      label: "Taxe indicative sur actifs non professionnels",
      inputValue: luxuryAssetsValue,
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
    computedResult: { conditionsMet, totalAssets, passiveIncomeRatio, individualControlRatio, luxuryAssetsValue, holdingTax },
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
