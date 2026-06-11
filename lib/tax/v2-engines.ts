import { demoHousehold } from "../demo-data/household";
import { demoTenant } from "../demo-data/v1";
import { calculatePerDeduction, demoConnectorImport } from "../patrimonial-model/model";
import { createTaxRunFactory, getBareOwnershipRate, makeStep } from "./engine-kit";
import {
  computeDmtgForShare,
  DMTG_RELATIONSHIP_LABELS,
  type DmtgRelationship,
} from "./engines/dmtg";
import { computeCdhr } from "./engines/ir";
import {
  computePerCeiling2026,
  PER_CARRY_FORWARD_YEARS,
  PER_DEDUCTION_AGE_LIMIT,
  type PerStatus,
} from "./engines/per";
import { simulatePvImmoV3, type PvImmoInput } from "./engines/pv-immo";
import type { Household, ProfessionalDocument } from "../types";

export { calculateProgressiveTax, getBareOwnershipRate } from "./engine-kit";
export {
  calculateHighRealEstateGainSurtax,
  calculateRealEstateHoldingAllowances,
} from "./engines/pv-immo";

const tenantId = demoTenant.id;
const caseId = "case-claire-marc-2026";
const dossierSnapshotId = "snapshot-dossier-claire-marc-v2";
const FAMILY_CASH_GIFT_EXEMPTION = 31_865;

const taxRun = createTaxRunFactory({
  tenantId,
  caseId,
  householdId: demoHousehold.id,
  dossierSnapshotId,
  runIdSuffix: "claire-marc-v2",
  createdAt: "2026-05-26T12:00:00.000Z",
});

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
  // CDHR déléguée au moteur ir.ts (seuil couple 500 k€, plancher 20 %).
  const { minimumTax, cdhr } = computeCdhr({
    rfr,
    situation: "couple",
    taxAlreadyPaid: otherIncomeTax + pfuTax,
  });

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

/**
 * Wrapper de compatibilité : la plus-value immobilière est désormais calculée
 * par le moteur v3 (lib/tax/engines/pv-immo.ts, règle v2 : forfaits 7,5 %/15 %
 * et arrondi officiel). Voir lib/evidence/pv-immo-rule-diff.ts pour l'impact.
 */
export function simulateRealEstateGainV2(input: PvImmoInput = {}) {
  return simulatePvImmoV3(input);
}

export function simulateTransmissionV2({
  assetValue = 300_000,
  children = 2,
  priorDonations = 0,
  donorAge = 51,
  useDismemberment = false,
  familyCashGift = 0,
  relationship = "direct-line" as DmtgRelationship,
}: {
  assetValue?: number;
  children?: number;
  priorDonations?: number;
  donorAge?: number;
  useDismemberment?: boolean;
  familyCashGift?: number;
  relationship?: DmtgRelationship;
} = {}) {
  const childCount = Math.max(1, children);
  const bareOwnershipRate = getBareOwnershipRate(donorAge);
  const transmittedValue = useDismemberment ? Math.round(assetValue * bareOwnershipRate) : assetValue;
  const grossShare = Math.round(transmittedValue / childCount);
  // Barème DMTG multi-liens (art. 777) avec rappel fiscal 15 ans (art. 784)
  // et arrondi par tranche — voir rule-dmtg-bareme-2026-v1 et le RuleDiff associé.
  const dmtg = computeDmtgForShare({
    grossShare,
    relationship,
    priorDonationsWithin15Years: priorDonations,
  });
  const availableAllowancePerChild = Number.isFinite(dmtg.availableAllowance)
    ? Math.max(0, dmtg.availableAllowance)
    : 0;
  const taxableShare = dmtg.taxableShare;
  const rightsPerChild = dmtg.tax;
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
      label: `Abattement ${DMTG_RELATIONSHIP_LABELS[relationship]} (rappel fiscal 15 ans)`,
      inputValue: `${grossShare} / donations antérieures ${priorDonations}`,
      formula: "part par bénéficiaire - abattement disponible sur 15 ans (art. 784)",
      outputValue: taxableShare,
      ruleVersionId: "rule-dmtg-bareme-2026-v1",
      evidenceSourceId: "src-impots-dmtg-bareme-2026",
      coverageLimitIds: ["coverage-transmission-checklist", "coverage-dmtg-multi-liens"],
      confidenceStatus: "needs_review",
      nextAction: "Valider donations antérieures, donation-partage et protection du conjoint.",
    }),
    makeStep({
      id: "transmission-step-progressive-scale",
      order: 4,
      label: `Droits indicatifs au barème ${DMTG_RELATIONSHIP_LABELS[relationship]}`,
      inputValue: taxableShare,
      formula: dmtg.exempt
        ? "conjoint/PACS : exonération de droits de succession (loi TEPA)"
        : "barème DMTG art. 777 du lien de parenté, arrondi par tranche",
      outputValue: indicativeRights,
      ruleVersionId: "rule-dmtg-bareme-2026-v1",
      evidenceSourceId: "src-impots-dmtg-bareme-2026",
      coverageLimitIds: ["coverage-transmission-checklist", "coverage-dmtg-multi-liens"],
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
      relationship,
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
  children = 1,
  donorAge = 65,
  fullOwnership = true,
  priorDonations = 0,
  donationBeforeFeb2026 = false,
}: {
  companyValue?: number;
  eligibleOperatingValue?: number;
  nonEligibleAssets?: number;
  excludedLuxuryAssetsValue?: number;
  collectiveCommitmentSigned?: boolean;
  managementCommitmentSigned?: boolean;
  individualCommitmentYears?: number;
  children?: number;
  donorAge?: number;
  fullOwnership?: boolean;
  priorDonations?: number;
  /** Réduction 50 % (art. 790 I) abrogée par la LF 2026 pour les transmissions à compter du 21/02/2026. */
  donationBeforeFeb2026?: boolean;
} = {}) {
  const totalExcludedValue = nonEligibleAssets + excludedLuxuryAssetsValue;
  const eligibleBase = Math.max(0, Math.min(eligibleOperatingValue, companyValue - totalExcludedValue));
  const eligible = collectiveCommitmentSigned && managementCommitmentSigned && individualCommitmentYears >= 6;
  const exemptValue = eligible ? Math.round(eligibleBase * 0.75) : 0;
  const taxableBeforeOtherAllowances = companyValue - exemptValue;

  // Chaînage DMTG : droits avec et sans pacte (ligne directe, rappel 15 ans).
  const childCount = Math.max(1, children);
  const withDutreilPerChild = computeDmtgForShare({
    grossShare: Math.round(taxableBeforeOtherAllowances / childCount),
    relationship: "direct-line",
    priorDonationsWithin15Years: priorDonations,
  });
  // Réduction 50 % art. 790 I : uniquement donations antérieures au 21/02/2026,
  // donateur < 70 ans et transmission en pleine propriété (abrogée par la LF 2026).
  const fiftyPercentReductionApplicable =
    donationBeforeFeb2026 && eligible && fullOwnership && donorAge < 70;
  const rightsWithDutreilPerChild = fiftyPercentReductionApplicable
    ? Math.round(withDutreilPerChild.tax * 0.5)
    : withDutreilPerChild.tax;
  const rightsWithDutreil = rightsWithDutreilPerChild * childCount;
  const withoutDutreilPerChild = computeDmtgForShare({
    grossShare: Math.round(companyValue / childCount),
    relationship: "direct-line",
    priorDonationsWithin15Years: priorDonations,
  });
  const rightsWithoutDutreil = withoutDutreilPerChild.tax * childCount;
  const dutreilSavings = Math.max(0, rightsWithoutDutreil - rightsWithDutreil);

  const steps = [
    makeStep({
      id: "dutreil-step-eligibility",
      order: 1,
      label: "Éligibilité Dutreil LF 2026",
      inputValue: `${collectiveCommitmentSigned} / ${managementCommitmentSigned} / ${individualCommitmentYears} ans`,
      formula: "engagement collectif + fonction de direction + engagement individuel 6 ans",
      outputValue: eligible ? "Éligible sous réserve" : "Non éligible",
      ruleVersionId: "rule-dutreil-2026-v3",
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
      ruleVersionId: "rule-dutreil-2026-v3",
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
      ruleVersionId: "rule-dutreil-2026-v3",
      evidenceSourceId: "src-legifrance-dutreil-2026",
      coverageLimitIds: ["coverage-dutreil-eligibility"],
      confidenceStatus: "needs_review",
      nextAction: "Faire qualifier l'activité, les actifs non affectés et les engagements par notaire/avocat.",
    }),
    makeStep({
      id: "dutreil-step-rights-with",
      order: 4,
      label: "Droits indicatifs avec pacte Dutreil",
      inputValue: `${taxableBeforeOtherAllowances} € / ${childCount} bénéficiaire(s)`,
      formula: "base après exonération 75 % → abattement 100 000 € → barème DMTG ligne directe",
      outputValue: rightsWithDutreil,
      ruleVersionId: "rule-dutreil-2026-v3",
      evidenceSourceId: "src-impots-dmtg-bareme-2026",
      coverageLimitIds: ["coverage-dutreil-eligibility"],
      confidenceStatus: "needs_review",
      nextAction: "Faire liquider les droits par le notaire (donation-partage, soulte, démembrement).",
    }),
    makeStep({
      id: "dutreil-step-reduction-790",
      order: 5,
      label: "Réduction 50 % art. 790 I (abrogée LF 2026)",
      inputValue: `donateur ${donorAge} ans / ${fullOwnership ? "pleine propriété" : "démembrement"}`,
      formula:
        "réduction 50 % des droits si donateur < 70 ans en pleine propriété — abrogée pour les transmissions à compter du 21/02/2026 (loi 2026-103)",
      outputValue: fiftyPercentReductionApplicable
        ? "Appliquée (donation antérieure au 21/02/2026)"
        : "Non applicable (abrogée LF 2026)",
      ruleVersionId: "rule-dutreil-2026-v3",
      evidenceSourceId: "src-bofip-dmtg-reduction-790-2026",
      coverageLimitIds: ["coverage-dutreil-eligibility"],
      confidenceStatus: "needs_review",
      nextAction: "Vérifier la date de la donation par rapport au 21/02/2026 et le régime transitoire.",
    }),
    makeStep({
      id: "dutreil-step-savings",
      order: 6,
      label: "Économie indicative vs donation sans pacte",
      inputValue: `${rightsWithoutDutreil} € sans pacte / ${rightsWithDutreil} € avec pacte`,
      formula: "droits sans Dutreil − droits avec Dutreil",
      outputValue: dutreilSavings,
      ruleVersionId: "rule-dutreil-2026-v3",
      evidenceSourceId: "src-legifrance-dutreil-2026",
      coverageLimitIds: ["coverage-dutreil-eligibility"],
      confidenceStatus: "needs_review",
      nextAction: "Ne décider qu'après validation notaire/avocat des engagements et de l'éligibilité.",
    }),
  ];

  return taxRun({
    module: "dutreil",
    scenario: "dutreil",
    steps,
    resultLabel: eligible
      ? `Économie indicative ${dutreilSavings} € vs donation sans pacte`
      : `${totalExcludedValue} € d'actifs à exclure ou documenter`,
    resultAmount: dutreilSavings,
    evidenceSourceIds: [
      "src-legifrance-dutreil-2026",
      "src-impots-dmtg-bareme-2026",
      "src-bofip-dmtg-reduction-790-2026",
    ],
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
      children: childCount,
      donorAge,
      fullOwnership,
      donationBeforeFeb2026,
      fiftyPercentReductionApplicable,
      rightsWithDutreil,
      rightsWithoutDutreil,
      dutreilSavings,
    },
  });
}

export function simulateApportCessionV2({
  saleProceeds = 1_200_000,
  reinvestedAmount = 860_000,
  reinvestmentMonths = 30,
  conservationYears = 5,
  deferredGain = 600_000,
}: {
  saleProceeds?: number;
  reinvestedAmount?: number;
  reinvestmentMonths?: number;
  conservationYears?: number;
  /** Plus-value en report (assiette de la comparaison cession directe). */
  deferredGain?: number;
} = {}) {
  const requiredReinvestment = Math.round(saleProceeds * 0.7);
  const compliant = reinvestedAmount >= requiredReinvestment && reinvestmentMonths <= 36 && conservationYears >= 5;
  // Comparaison cession directe : PFU 31,4 %, et jusqu'à ~38,4 % avec CEHR 4 %
  // et CDHR (plancher 20 % du RFR) pour les hauts revenus — chiffrage ir.ts.
  const directSaleTaxAtPfu = Math.round(deferredGain * 0.314);
  const directSaleTaxWithCehrCdhr = Math.round(deferredGain * 0.384);

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
    makeStep({
      id: "apport-step-direct-sale",
      order: 3,
      label: "Comparaison cession directe sans report",
      inputValue: `PV en report ${deferredGain} €`,
      formula: "PFU 31,4 % — jusqu'à ~38,4 % avec CEHR 4 % et CDHR (plancher 20 %, moteur ir.ts)",
      outputValue: `${directSaleTaxAtPfu} € à ${directSaleTaxWithCehrCdhr} €`,
      ruleVersionId: "rule-apport-cession-2026-v2",
      evidenceSourceId: "src-legifrance-lfss-2026-ps-capital",
      coverageLimitIds: ["coverage-apport-cession-150-0-b-ter"],
      confidenceStatus: "needs_review",
      nextAction: "Chiffrer CEHR/CDHR sur le RFR réel du foyer avant de comparer au report.",
    }),
  ];

  return taxRun({
    module: "apport-cession",
    scenario: "apport-cession",
    steps,
    resultLabel: compliant ? "Report à documenter" : "Report fragilisé",
    resultAmount: requiredReinvestment,
    evidenceSourceIds: ["src-legifrance-apport-cession-2026", "src-legifrance-lfss-2026-ps-capital"],
    reviewerRequired: "avocat",
    computedResult: {
      saleProceeds,
      reinvestedAmount,
      requiredReinvestment,
      reinvestmentMonths,
      conservationYears,
      compliant,
      deferredGain,
      directSaleTaxAtPfu,
      directSaleTaxWithCehrCdhr,
    },
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
    makeStep({
      id: "holding-step-ifi-exoneration",
      order: 4,
      label: "Exonération IFI corrélative (art. 975 VII)",
      inputValue: taxableLuxuryInventory,
      formula: "les actifs soumis à la taxe holding ouvrent une exonération IFI corrélative",
      outputValue: conditionsMet ? "Articulation IFI à documenter" : "Sans objet",
      ruleVersionId: "rule-holding-tax-2026-v2",
      evidenceSourceId: "src-legifrance-holding-tax-2026",
      coverageLimitIds: ["coverage-holding-tax-235-ter-c"],
      confidenceStatus: "needs_review",
      nextAction: "Faire arbitrer taxe holding vs IFI par l'avocat fiscaliste (pas de double imposition).",
    }),
    makeStep({
      id: "holding-step-deadline",
      order: 5,
      label: "Échéance : première taxation",
      inputValue: "Exercices clos en 2026",
      formula: "première campagne déclarative attendue au printemps 2027",
      outputValue: "Printemps 2027",
      ruleVersionId: "rule-holding-tax-2026-v2",
      evidenceSourceId: "src-legifrance-holding-tax-2026",
      coverageLimitIds: ["coverage-holding-tax-235-ter-c"],
      confidenceStatus: "needs_review",
      nextAction: "Inscrire l'échéance au calendrier fiscal du dossier et préparer l'inventaire d'actifs.",
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

export function simulatePeaWithdrawalV2({
  yearsHeld = 7,
  withdrawnGains = 42_000,
  socialContributionRate = 0.172,
  partialWithdrawal = true,
}: {
  yearsHeld?: number;
  withdrawnGains?: number;
  socialContributionRate?: number;
  partialWithdrawal?: boolean;
} = {}) {
  const afterFiveYears = yearsHeld >= 5;
  const incomeTax = afterFiveYears ? 0 : Math.round(withdrawnGains * 0.128);
  const socialContributions = Math.round(withdrawnGains * socialContributionRate);
  const estimatedTax = incomeTax + socialContributions;
  const closesPlan = afterFiveYears ? !partialWithdrawal : true;

  const steps = [
    makeStep({
      id: "pea-step-age",
      order: 1,
      label: "Âge fiscal du PEA",
      inputValue: `${yearsHeld} ans`,
      formula: "date retrait - date ouverture",
      outputValue: afterFiveYears ? "Après 5 ans" : "Avant 5 ans",
      ruleVersionId: "rule-pea-withdrawal-2026-v1",
      evidenceSourceId: "src-service-public-pea-2026",
      coverageLimitIds: ["coverage-pea-withdrawal-simple"],
      confidenceStatus: "indicative",
    }),
    makeStep({
      id: "pea-step-income-tax",
      order: 2,
      label: "IR indicatif sur les gains",
      inputValue: withdrawnGains,
      formula: afterFiveYears ? "gains x 0 % après 5 ans" : "régime anticipé à vérifier",
      outputValue: incomeTax,
      ruleVersionId: "rule-pea-withdrawal-2026-v1",
      evidenceSourceId: "src-service-public-pea-2026",
      coverageLimitIds: ["coverage-pea-withdrawal-simple"],
      confidenceStatus: afterFiveYears ? "indicative" : "needs_review",
      nextAction: "Valider date d'ouverture, nature du retrait et cas d'exception.",
    }),
    makeStep({
      id: "pea-step-social-contributions",
      order: 3,
      label: "Prélèvements sociaux à contrôler",
      inputValue: withdrawnGains,
      formula: `gains retirés x ${(socialContributionRate * 100).toFixed(1)} %`,
      outputValue: socialContributions,
      ruleVersionId: "rule-pea-withdrawal-2026-v1",
      evidenceSourceId: "src-service-public-pea-2026",
      coverageLimitIds: ["coverage-pea-withdrawal-simple"],
      confidenceStatus: "needs_review",
      nextAction: "Contrôler le taux applicable et le calcul bancaire avant remise client.",
    }),
    makeStep({
      id: "pea-step-closure",
      order: 4,
      label: "Effet sur clôture du plan",
      inputValue: partialWithdrawal ? "Retrait partiel" : "Retrait total",
      formula: "après 5 ans + retrait partiel = pas de clôture",
      outputValue: closesPlan ? "Clôture à prévoir" : "Plan maintenu",
      ruleVersionId: "rule-pea-withdrawal-2026-v1",
      evidenceSourceId: "src-service-public-pea-2026",
      coverageLimitIds: ["coverage-pea-withdrawal-simple"],
      confidenceStatus: "needs_review",
      nextAction: "Confirmer retrait partiel ou total avec l'établissement teneur de compte.",
    }),
  ];

  return taxRun({
    module: "pea",
    scenario: "pea-withdrawal",
    steps,
    resultLabel: afterFiveYears
      ? "IR indicatif à 0, prélèvements sociaux à contrôler"
      : "Retrait anticipé à revoir",
    resultAmount: estimatedTax,
    evidenceSourceIds: ["src-service-public-pea-2026"],
    reviewerRequired: "cgp",
    computedResult: {
      yearsHeld,
      withdrawnGains,
      afterFiveYears,
      partialWithdrawal,
      closesPlan,
      incomeTax,
      socialContributionRate,
      socialContributions,
      estimatedTax,
    },
  });
}

export function simulatePerDeductionV2({
  voluntaryPayments = 18_000,
  annualCeiling = 12_000,
  unusedCeilings = [3_000, 2_400, 1_600],
  spouseMutualization = 4_000,
  status = "manual",
  professionalIncome = 0,
  age = 45,
  tmi = 0.3,
}: {
  voluntaryPayments?: number;
  annualCeiling?: number;
  unusedCeilings?: number[];
  spouseMutualization?: number;
  /** "salarie"/"tns" : plafond 2026 calculé (37 680 / 88 911 €) ; "manual" : plafond saisi. */
  status?: PerStatus | "manual";
  professionalIncome?: number;
  age?: number;
  tmi?: number;
} = {}) {
  const computedCeiling =
    status === "manual"
      ? null
      : computePerCeiling2026({ status, professionalIncome });
  const effectiveAnnualCeiling = computedCeiling?.ceiling ?? annualCeiling;
  // Versements à partir de 70 ans : plus de déduction à l'entrée (LF 2026).
  const ageBlocked = age >= PER_DEDUCTION_AGE_LIMIT;
  const retainedUnusedCeilings = unusedCeilings.slice(0, PER_CARRY_FORWARD_YEARS);
  const result = calculatePerDeduction({
    voluntaryPayments,
    annualCeiling: ageBlocked ? 0 : effectiveAnnualCeiling,
    unusedCeilings: ageBlocked ? [] : retainedUnusedCeilings,
    spouseMutualization: ageBlocked ? 0 : spouseMutualization,
  });
  const taxSaving = Math.round(result.deductionUsed * tmi);

  const steps = [
    makeStep({
      id: "per-step-computed-ceiling",
      order: 1,
      label: "Plafond annuel 2026",
      inputValue:
        status === "manual"
          ? `${effectiveAnnualCeiling} € (saisi)`
          : `${status} · revenus ${professionalIncome} €`,
      formula:
        status === "tns"
          ? "10 % du bénéfice (≤ 8 PASS 2026) + 15 % de la fraction 1-8 PASS — max 88 911 €"
          : status === "salarie"
            ? "10 % des revenus N-1 plafonnés à 8 PASS 2025 — max 37 680 €"
            : "plafond saisi par le conseiller (avis d'impôt)",
      outputValue: effectiveAnnualCeiling,
      ruleVersionId: "rule-per-deduction-2026-v2",
      evidenceSourceId: "src-legifrance-pass-2026",
      coverageLimitIds: ["coverage-per-deduction-simple"],
      confidenceStatus: "needs_review",
      nextAction: "Comparer avec le plafond figurant sur l'avis d'imposition.",
    }),
    makeStep({
      id: "per-step-ceiling",
      order: 2,
      label: `Plafond disponible (reliquats ${PER_CARRY_FORWARD_YEARS} ans)`,
      inputValue: `${effectiveAnnualCeiling} + ${retainedUnusedCeilings.join(" + ") || "0"} + ${spouseMutualization}`,
      formula: "plafond annuel + reliquats non utilisés (report 5 ans LF 2026) + mutualisation",
      outputValue: result.availableCeiling,
      ruleVersionId: "rule-per-deduction-2026-v2",
      evidenceSourceId: "src-service-public-per-deduction-2026",
      coverageLimitIds: ["coverage-per-deduction-simple"],
      confidenceStatus: "needs_review",
      nextAction: "Comparer avec l'avis d'impôt et les plafonds réellement disponibles.",
    }),
    makeStep({
      id: "per-step-age-limit",
      order: 3,
      label: "Limite d'âge de déduction",
      inputValue: `${age} ans`,
      formula: "versements à partir de 70 ans non déductibles à l'entrée (LF 2026)",
      outputValue: ageBlocked ? "Déduction bloquée (≥ 70 ans)" : "Déduction possible",
      ruleVersionId: "rule-per-deduction-2026-v2",
      evidenceSourceId: "src-legifrance-pass-2026",
      coverageLimitIds: ["coverage-per-deduction-simple"],
      confidenceStatus: ageBlocked ? "needs_review" : "indicative",
      nextAction: "Vérifier l'âge au jour du versement et l'intérêt successoral du PER après 70 ans.",
    }),
    makeStep({
      id: "per-step-deduction",
      order: 4,
      label: "Déduction utilisée",
      inputValue: voluntaryPayments,
      formula: "min(versements volontaires, plafond disponible)",
      outputValue: result.deductionUsed,
      ruleVersionId: "rule-per-deduction-2026-v2",
      evidenceSourceId: "src-impots-epargne-retraite-2026",
      coverageLimitIds: ["coverage-per-deduction-simple"],
      confidenceStatus: "indicative",
    }),
    makeStep({
      id: "per-step-tax-saving",
      order: 5,
      label: "Économie d'impôt indicative",
      inputValue: `${result.deductionUsed} € × TMI ${Math.round(tmi * 100)} %`,
      formula: "déduction utilisée × taux marginal d'imposition (barème ir.ts)",
      outputValue: taxSaving,
      ruleVersionId: "rule-per-deduction-2026-v2",
      evidenceSourceId: "src-impots-epargne-retraite-2026",
      coverageLimitIds: ["coverage-per-deduction-simple"],
      confidenceStatus: "needs_review",
      nextAction: "Vérifier la TMI réelle du foyer (moteur IR barème) et l'effet sur le RFR.",
    }),
    makeStep({
      id: "per-step-excess",
      order: 6,
      label: "Versement non déduit",
      inputValue: voluntaryPayments,
      formula: "max(0, versements - déduction utilisée)",
      outputValue: result.excessPayment,
      ruleVersionId: "rule-per-deduction-2026-v2",
      evidenceSourceId: "src-impots-epargne-retraite-2026",
      coverageLimitIds: ["coverage-per-deduction-simple"],
      confidenceStatus: "indicative",
      nextAction: "Documenter sortie future capital/rente avant arbitrage patrimonial.",
    }),
  ];

  return taxRun({
    module: "per",
    scenario: "per-deduction",
    steps,
    resultLabel: ageBlocked ? "Déduction bloquée après 70 ans" : "Déduction PER indicative",
    resultAmount: result.deductionUsed,
    evidenceSourceIds: [
      "src-service-public-per-deduction-2026",
      "src-impots-epargne-retraite-2026",
      "src-legifrance-pass-2026",
    ],
    reviewerRequired: "cgp",
    computedResult: {
      voluntaryPayments,
      annualCeiling: effectiveAnnualCeiling,
      computedCeilingStatus: status,
      cappedAtMax: computedCeiling?.cappedAtMax ?? false,
      unusedCeilingsTotal: retainedUnusedCeilings.reduce((sum, amount) => sum + amount, 0),
      spouseMutualization,
      age,
      ageBlocked,
      tmi,
      taxSaving,
      ...result,
    },
  });
}

export function simulateBankImportV2() {
  const alertsCount = demoConnectorImport.alerts.length;
  const steps = demoConnectorImport.steps.map((step, index) =>
    makeStep({
      id: `bank-import-step-${index + 1}`,
      order: index + 1,
      label: step.label,
      inputValue: step.status,
      formula: "fixture démo sans connecteur externe",
      outputValue: step.detail,
      ruleVersionId: "rule-bank-import-demo-2026-v1",
      evidenceSourceId:
        index === 1 ? "src-eurlex-sca-2018-389" : index === 3 ? "src-eurlex-aml-2015-849" : "src-banque-france-sca-2022",
      coverageLimitIds: ["coverage-bank-import-demo"],
      confidenceStatus: step.status === "revue requise" ? "needs_review" : "indicative",
      nextAction:
        step.status === "revue requise"
          ? "Escalader les alertes avant toute simulation patrimoniale partageable."
          : "Conserver le statut simulé tant que le connecteur réel n'est pas branché.",
    }),
  );

  return taxRun({
    module: "bank-import",
    scenario: "bank-import",
    steps,
    resultLabel: `${demoConnectorImport.detectedEnvelopes.length} enveloppes détectées, ${alertsCount} alertes`,
    resultAmount: alertsCount,
    evidenceSourceIds: ["src-eurlex-sca-2018-389", "src-banque-france-sca-2022", "src-eurlex-aml-2015-849"],
    reviewerRequired: "cgp",
    computedResult: {
      detectedEnvelopes: demoConnectorImport.detectedEnvelopes.length,
      alertsCount,
      connectorStatus: "demo-only",
      storesBankSecret: false,
    },
  });
}

export function simulateSuccessionChecklistV24({
  grossEstate = 1_150_000,
  children = 2,
  priorDonations = 80_000,
  hasRealEstate = true,
  hasWill = true,
  spousePresent = true,
  documentsReceived = 4,
  documentsExpected = 7,
}: {
  grossEstate?: number;
  children?: number;
  priorDonations?: number;
  hasRealEstate?: boolean;
  hasWill?: boolean;
  spousePresent?: boolean;
  documentsReceived?: number;
  documentsExpected?: number;
} = {}) {
  const missingDocuments = Math.max(0, documentsExpected - documentsReceived);
  const notaryRequired = hasRealEstate || hasWill || grossEstate > 50_000;
  const reviewItems = [
    priorDonations > 0 ? "Donations anterieures a rappeler" : null,
    hasRealEstate ? "Actif immobilier a qualifier par acte" : null,
    hasWill ? "Testament ou disposition a relire" : null,
    spousePresent ? "Droits du conjoint a documenter" : null,
    missingDocuments > 0 ? `${missingDocuments} justificatifs manquants` : null,
  ].filter(Boolean);

  const steps = [
    makeStep({
      id: "succession-step-active-brut",
      order: 1,
      label: "Actif brut declare",
      inputValue: grossEstate,
      formula: "actifs declares avant liquidation notariale",
      outputValue: grossEstate,
      ruleVersionId: "rule-succession-checklist-2026-v1",
      evidenceSourceId: "src-service-public-succession-declaration-2025",
      coverageLimitIds: ["coverage-succession-simple-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Rattacher titres, relevés et dettes avant toute estimation partageable.",
    }),
    makeStep({
      id: "succession-step-notary",
      order: 2,
      label: "Intervention notaire",
      inputValue: `${hasRealEstate} / ${hasWill} / ${grossEstate}`,
      formula: "immobilier ou disposition particuliere ou actif significatif = revue notaire",
      outputValue: notaryRequired ? "Notaire attendu" : "À vérifier",
      ruleVersionId: "rule-succession-checklist-2026-v1",
      evidenceSourceId: "src-service-public-succession-declaration-2025",
      coverageLimitIds: ["coverage-succession-simple-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Préparer le rendez-vous notaire et la liste de pièces.",
    }),
    makeStep({
      id: "succession-step-donations",
      order: 3,
      label: "Donations anterieures",
      inputValue: priorDonations,
      formula: "donations anterieures a rapprocher du dossier familial",
      outputValue: priorDonations > 0 ? "Rappel fiscal a verifier" : "Aucun rappel declare",
      ruleVersionId: "rule-succession-checklist-2026-v1",
      evidenceSourceId: "src-service-public-rapport-fiscal-succession-2025",
      coverageLimitIds: ["coverage-succession-simple-v24"],
      confidenceStatus: priorDonations > 0 ? "needs_review" : "indicative",
      nextAction: "Demander actes de donation et calendrier des transmissions.",
    }),
    makeStep({
      id: "succession-step-documents",
      order: 4,
      label: "Checklist documentaire",
      inputValue: `${documentsReceived}/${documentsExpected}`,
      formula: "documents attendus - documents recus",
      outputValue: missingDocuments,
      ruleVersionId: "rule-succession-checklist-2026-v1",
      evidenceSourceId: "src-service-public-succession-declaration-2025",
      coverageLimitIds: ["coverage-succession-simple-v24"],
      confidenceStatus: missingDocuments > 0 ? "needs_review" : "indicative",
      nextAction: "Bloquer le rapport valide tant que les justificatifs clés manquent.",
    }),
  ];

  return taxRun({
    module: "succession",
    scenario: "succession-checklist",
    steps,
    resultLabel: `${reviewItems.length} points de revue succession`,
    resultAmount: reviewItems.length,
    evidenceSourceIds: [
      "src-service-public-succession-declaration-2025",
      "src-service-public-succession-rights-2024",
      "src-service-public-rapport-fiscal-succession-2025",
    ],
    reviewerRequired: "notaire",
    computedResult: {
      grossEstate,
      children,
      priorDonations,
      hasRealEstate,
      hasWill,
      spousePresent,
      notaryRequired,
      missingDocuments,
      reviewItems: reviewItems.join(" | "),
      definitiveRecommendation: false,
    },
  });
}

export function simulatePerEarlyExitV24({
  capitalReleased = 80_000,
  voluntaryPayments = 62_000,
  gainPortion = 18_000,
  usedDeductionAtEntry = true,
  primaryResidencePurpose = true,
}: {
  capitalReleased?: number;
  voluntaryPayments?: number;
  gainPortion?: number;
  usedDeductionAtEntry?: boolean;
  primaryResidencePurpose?: boolean;
} = {}) {
  const amountReconciled = voluntaryPayments + gainPortion;
  const reconciliationGap = capitalReleased - amountReconciled;
  const taxablePaymentsToReview = usedDeductionAtEntry ? voluntaryPayments : 0;
  const reviewRequired = primaryResidencePurpose && (reconciliationGap !== 0 || taxablePaymentsToReview > 0 || gainPortion > 0);

  const steps = [
    makeStep({
      id: "per-exit-step-purpose",
      order: 1,
      label: "Motif de sortie anticipee",
      inputValue: primaryResidencePurpose ? "Residence principale" : "Autre motif",
      formula: "motif declare = cas de deblocage a verifier",
      outputValue: primaryResidencePurpose ? "Cas residence principale" : "Hors cas demo",
      ruleVersionId: "rule-per-early-exit-primary-home-2026-v1",
      evidenceSourceId: "src-service-public-per-release-2025",
      coverageLimitIds: ["coverage-per-early-exit-primary-home-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Verifier le justificatif d'acquisition de residence principale.",
    }),
    makeStep({
      id: "per-exit-step-reconcile",
      order: 2,
      label: "Ventilation versements / gains",
      inputValue: `${voluntaryPayments} + ${gainPortion}`,
      formula: "versements + gains = capital debloque",
      outputValue: reconciliationGap === 0 ? "Ventilation coherente" : `Ecart ${reconciliationGap}`,
      ruleVersionId: "rule-per-early-exit-primary-home-2026-v1",
      evidenceSourceId: "src-bofip-per-fiscal-regime-2026",
      coverageLimitIds: ["coverage-per-early-exit-primary-home-v24"],
      confidenceStatus: reconciliationGap === 0 ? "indicative" : "needs_review",
      nextAction: "Demander le decompte de l'etablissement gestionnaire.",
    }),
    makeStep({
      id: "per-exit-step-payments",
      order: 3,
      label: "Versements a traiter fiscalement",
      inputValue: voluntaryPayments,
      formula: usedDeductionAtEntry ? "versements deduits a l'entree = IR a revoir" : "versements non deduits = traitement distinct",
      outputValue: taxablePaymentsToReview,
      ruleVersionId: "rule-per-early-exit-primary-home-2026-v1",
      evidenceSourceId: "src-service-public-per-release-2025",
      coverageLimitIds: ["coverage-per-early-exit-primary-home-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Valider l'historique de deduction sur les avis d'impot.",
    }),
    makeStep({
      id: "per-exit-step-gains",
      order: 4,
      label: "Gains et prelevements",
      inputValue: gainPortion,
      formula: "produits du PER = traitement fiscal et social à contrôler",
      outputValue: gainPortion,
      ruleVersionId: "rule-per-early-exit-primary-home-2026-v1",
      evidenceSourceId: "src-bofip-per-fiscal-regime-2026",
      coverageLimitIds: ["coverage-per-early-exit-primary-home-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Ne pas chiffrer definitivement sans decompte fiscal et source a jour.",
    }),
  ];

  return taxRun({
    module: "per-exit",
    scenario: "per-early-exit",
    steps,
    resultLabel: reviewRequired
      ? "Sortie PER residence principale a revoir"
      : "Ventilation PER pedagogique",
    resultAmount: capitalReleased,
    evidenceSourceIds: ["src-service-public-per-release-2025", "src-bofip-per-fiscal-regime-2026"],
    reviewerRequired: "cgp",
    computedResult: {
      capitalReleased,
      voluntaryPayments,
      gainPortion,
      usedDeductionAtEntry,
      primaryResidencePurpose,
      amountReconciled,
      reconciliationGap,
      taxablePaymentsToReview,
      reviewRequired,
      definitiveRecommendation: false,
    },
  });
}

export function simulateSuccessionLiquidityStressV24({
  estimatedDuties = 145_000,
  cashAvailable = 90_000,
  reservedExpenses = 20_000,
  saleDelayMonths = 9,
}: {
  estimatedDuties?: number;
  cashAvailable?: number;
  reservedExpenses?: number;
  saleDelayMonths?: number;
} = {}) {
  const usableCash = Math.max(0, cashAvailable - reservedExpenses);
  const liquidityGap = Math.max(0, estimatedDuties - usableCash);
  const stressStatus = liquidityGap > 0 ? "Deficit de liquidite" : "Liquidite suffisante dans l'hypothese";

  const steps = [
    makeStep({
      id: "liquidity-step-usable-cash",
      order: 1,
      label: "Cash disponible apres reserve",
      inputValue: `${cashAvailable} - ${reservedExpenses}`,
      formula: "liquidites - reserve prudente",
      outputValue: usableCash,
      ruleVersionId: "rule-succession-liquidity-stress-2026-v1",
      evidenceSourceId: "src-service-public-succession-declaration-2025",
      coverageLimitIds: ["coverage-succession-liquidity-stress-v24"],
      confidenceStatus: "indicative",
      nextAction: "Verifier comptes, assurance-vie et delais de mobilisation.",
    }),
    makeStep({
      id: "liquidity-step-duties",
      order: 2,
      label: "Droits estimes a financer",
      inputValue: estimatedDuties,
      formula: "montant declare par le conseiller, non liquide par la demo",
      outputValue: estimatedDuties,
      ruleVersionId: "rule-succession-liquidity-stress-2026-v1",
      evidenceSourceId: "src-service-public-succession-rights-2024",
      coverageLimitIds: ["coverage-succession-liquidity-stress-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Faire liquider les droits par le notaire.",
    }),
    makeStep({
      id: "liquidity-step-gap",
      order: 3,
      label: "Alerte deficit de liquidite",
      inputValue: `${estimatedDuties} / ${usableCash}`,
      formula: "max(0, droits estimes - cash utilisable)",
      outputValue: liquidityGap,
      ruleVersionId: "rule-succession-liquidity-stress-2026-v1",
      evidenceSourceId: "src-service-public-succession-declaration-2025",
      coverageLimitIds: ["coverage-succession-liquidity-stress-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Etudier paiement fractionne/differe, cession ou avance de liquidite avec professionnel.",
    }),
    makeStep({
      id: "liquidity-step-sale-delay",
      order: 4,
      label: "Delai de cession sous stress",
      inputValue: `${saleDelayMonths} mois`,
      formula: "actifs non liquides = delai avant cash",
      outputValue: saleDelayMonths > 6 ? "Delai defavorable" : "Delai court",
      ruleVersionId: "rule-succession-liquidity-stress-2026-v1",
      evidenceSourceId: "src-service-public-succession-declaration-2025",
      coverageLimitIds: ["coverage-succession-liquidity-stress-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Documenter actifs mobilisables et calendrier réaliste.",
    }),
  ];

  return taxRun({
    module: "liquidity-stress",
    scenario: "succession-liquidity-stress",
    steps,
    resultLabel: stressStatus,
    resultAmount: liquidityGap,
    evidenceSourceIds: ["src-service-public-succession-declaration-2025", "src-service-public-succession-rights-2024"],
    reviewerRequired: "notaire",
    computedResult: {
      estimatedDuties,
      cashAvailable,
      reservedExpenses,
      usableCash,
      liquidityGap,
      saleDelayMonths,
      stressStatus,
      definitiveRecommendation: false,
    },
  });
}

export function simulateProductAdequacyV24({
  horizonYears = 6,
  riskTolerance = 3,
  productRisk = 4,
  sustainabilityPreference = true,
  sustainabilityDocumented = false,
  targetMarketAligned = false,
}: {
  horizonYears?: number;
  riskTolerance?: number;
  productRisk?: number;
  sustainabilityPreference?: boolean;
  sustainabilityDocumented?: boolean;
  targetMarketAligned?: boolean;
} = {}) {
  const riskMismatch = productRisk > riskTolerance;
  const horizonMismatch = horizonYears < 5;
  const durabilityGap = sustainabilityPreference && !sustainabilityDocumented;
  const mismatchCount = [riskMismatch, horizonMismatch, durabilityGap, !targetMarketAligned].filter(Boolean).length;

  const steps = [
    makeStep({
      id: "adequacy-step-horizon",
      order: 1,
      label: "Horizon client",
      inputValue: `${horizonYears} ans`,
      formula: "horizon declare compare au besoin produit",
      outputValue: horizonMismatch ? "Horizon court" : "Horizon compatible en demo",
      ruleVersionId: "rule-product-adequacy-demo-2026-v1",
      evidenceSourceId: "src-amf-mif2-adequation",
      coverageLimitIds: ["coverage-product-adequacy-demo-v24"],
      confidenceStatus: horizonMismatch ? "needs_review" : "indicative",
      nextAction: "Revoir l'horizon et le besoin de liquidite avec le client.",
    }),
    makeStep({
      id: "adequacy-step-risk",
      order: 2,
      label: "Risque produit vs profil",
      inputValue: `${productRisk}/${riskTolerance}`,
      formula: "risque produit > tolerance client = alerte",
      outputValue: riskMismatch ? "Risque superieur au profil" : "Risque coherent en demo",
      ruleVersionId: "rule-product-adequacy-demo-2026-v1",
      evidenceSourceId: "src-amf-mif2-adequation",
      coverageLimitIds: ["coverage-product-adequacy-demo-v24"],
      confidenceStatus: riskMismatch ? "needs_review" : "indicative",
      nextAction: "Ne pas recommander sans justification et revue d'adequation.",
    }),
    makeStep({
      id: "adequacy-step-durability",
      order: 3,
      label: "Durabilite documentee",
      inputValue: sustainabilityPreference ? "Preference exprimee" : "Pas de preference",
      formula: "preference ESG + absence de preuve = question ouverte",
      outputValue: durabilityGap ? "Preference non documentee" : "Pas d'alerte durabilite",
      ruleVersionId: "rule-product-adequacy-demo-2026-v1",
      evidenceSourceId: "src-amf-durabilite-2022",
      coverageLimitIds: ["coverage-product-adequacy-demo-v24"],
      confidenceStatus: durabilityGap ? "needs_review" : "indicative",
      nextAction: "Completer le questionnaire de durabilite avant rapport d'adequation.",
    }),
    makeStep({
      id: "adequacy-step-no-recommendation",
      order: 4,
      label: "Absence de recommandation automatique",
      inputValue: mismatchCount,
      formula: "mismatches > 0 ou marche cible non prouve = revue humaine",
      outputValue: "Revue humaine obligatoire",
      ruleVersionId: "rule-product-adequacy-demo-2026-v1",
      evidenceSourceId: "src-cnil-profiling-automated-decision",
      coverageLimitIds: ["coverage-product-adequacy-demo-v24"],
      confidenceStatus: "needs_review",
      nextAction: "Transformer ce résultat en question conseiller, pas en conseil automatisé.",
    }),
  ];

  return taxRun({
    module: "product-adequacy",
    scenario: "product-adequacy",
    steps,
    resultLabel: mismatchCount > 0 ? `${mismatchCount} alertes adequation` : "Profil coherent en demo",
    resultAmount: mismatchCount,
    evidenceSourceIds: ["src-amf-mif2-adequation", "src-amf-durabilite-2022", "src-cnil-profiling-automated-decision"],
    reviewerRequired: "cgp",
    computedResult: {
      horizonYears,
      riskTolerance,
      productRisk,
      sustainabilityPreference,
      sustainabilityDocumented,
      targetMarketAligned,
      riskMismatch,
      horizonMismatch,
      durabilityGap,
      mismatchCount,
      definitiveRecommendation: false,
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
  simulatePeaWithdrawalV2(),
  simulatePerDeductionV2(),
  simulateBankImportV2(),
  simulateSuccessionChecklistV24(),
  simulatePerEarlyExitV24(),
  simulateSuccessionLiquidityStressV24(),
  simulateProductAdequacyV24(),
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
