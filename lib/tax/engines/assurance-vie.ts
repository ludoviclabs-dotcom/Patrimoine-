import { demoTenant } from "../../demo-data/v1";
import { demoHousehold } from "../../demo-data/household";
import { createTaxRunFactory, makeStep } from "../engine-kit";
import { computeDmtg, DMTG_RELATIONSHIP_LABELS, type DmtgRelationship } from "./dmtg";

/**
 * Assurance-vie au décès — art. 990 I et 757 B du CGI.
 *
 * Paramètres vérifiés le 11/06/2026 (BOFiP BOI-TCAS-AUT-60, presse spécialisée
 * concordante) :
 * - primes versées avant 70 ans (990 I) : abattement 152 500 € par
 *   bénéficiaire (capitaux décès, produits inclus), puis 20 % jusqu'à
 *   700 000 € de part taxable et 31,25 % au-delà ;
 * - primes versées après 70 ans (757 B) : abattement global de 30 500 €
 *   partagé entre bénéficiaires, surplus de PRIMES soumis aux DMTG selon le
 *   lien de parenté ; les produits attachés restent exonérés ;
 * - conjoint et partenaire de PACS exonérés (loi TEPA, art. 796-0 bis).
 * Note rachats du vivant : le PFU assurance-vie reste à 30 % (PS 17,2 % par
 * dérogation LFSS 2026) — voir coverage-pfu-assurance-vie-30.
 */

export const AV_990I_ALLOWANCE_PER_BENEFICIARY = 152_500;
export const AV_990I_RATE_LOW = 0.2;
export const AV_990I_RATE_HIGH = 0.3125;
export const AV_990I_HIGH_THRESHOLD = 700_000;
export const AV_757B_GLOBAL_ALLOWANCE = 30_500;

export type AssuranceVieInput = {
  /** Capitaux décès issus de primes versées avant 70 ans (produits inclus). */
  deathBenefitBefore70?: number;
  /** Primes versées après 70 ans (assiette 757 B). */
  premiumsAfter70?: number;
  /** Produits attachés aux primes après 70 ans (exonérés). */
  gainsAfter70?: number;
  beneficiaries?: number;
  relationship?: DmtgRelationship;
  /** Bénéficiaire conjoint/PACS : exonération totale (TEPA). */
  spouseBeneficiary?: boolean;
};

export function computeAssuranceVieTransmission({
  deathBenefitBefore70 = 352_500,
  premiumsAfter70 = 0,
  gainsAfter70 = 0,
  beneficiaries = 1,
  relationship = "direct-line" as DmtgRelationship,
  spouseBeneficiary = false,
}: AssuranceVieInput = {}) {
  const beneficiaryCount = Math.max(1, beneficiaries);

  if (spouseBeneficiary) {
    return {
      deathBenefitBefore70,
      premiumsAfter70,
      gainsAfter70,
      beneficiaries: beneficiaryCount,
      relationship,
      spouseBeneficiary: true,
      perBeneficiaryBefore70: Math.round(deathBenefitBefore70 / beneficiaryCount),
      taxablePerBeneficiary990I: 0,
      tax990IPerBeneficiary: 0,
      tax990ITotal: 0,
      taxablePremiums757B: 0,
      tax757B: 0,
      totalTax: 0,
      exemptSpouse: true,
    };
  }

  // Art. 990 I — par bénéficiaire.
  const perBeneficiaryBefore70 = deathBenefitBefore70 / beneficiaryCount;
  const taxablePerBeneficiary990I = Math.max(
    0,
    perBeneficiaryBefore70 - AV_990I_ALLOWANCE_PER_BENEFICIARY,
  );
  const tax990IPerBeneficiary = Math.round(
    Math.min(taxablePerBeneficiary990I, AV_990I_HIGH_THRESHOLD) * AV_990I_RATE_LOW +
      Math.max(0, taxablePerBeneficiary990I - AV_990I_HIGH_THRESHOLD) * AV_990I_RATE_HIGH,
  );
  const tax990ITotal = tax990IPerBeneficiary * beneficiaryCount;

  // Art. 757 B — abattement global, surplus de primes aux DMTG du lien.
  const taxablePremiums757B = Math.max(0, premiumsAfter70 - AV_757B_GLOBAL_ALLOWANCE);
  const dmtg = computeDmtg({ taxableAfterAllowance: taxablePremiums757B, relationship });
  const tax757B = dmtg.tax;

  return {
    deathBenefitBefore70,
    premiumsAfter70,
    gainsAfter70,
    beneficiaries: beneficiaryCount,
    relationship,
    spouseBeneficiary: false,
    perBeneficiaryBefore70: Math.round(perBeneficiaryBefore70),
    taxablePerBeneficiary990I: Math.round(taxablePerBeneficiary990I),
    tax990IPerBeneficiary,
    tax990ITotal,
    taxablePremiums757B,
    tax757B,
    totalTax: tax990ITotal + tax757B,
    exemptSpouse: false,
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

const RULE_ID = "rule-assurance-vie-990i-757b-2026-v1";
const SOURCE_BOFIP = "src-bofip-tcas-aut-60-2026";
const SOURCE_DMTG = "src-impots-dmtg-bareme-2026";
const COVERAGE = ["coverage-assurance-vie-transmission"];

export function simulateAssuranceVieTransmission(input: AssuranceVieInput = {}) {
  const result = computeAssuranceVieTransmission(input);

  const steps = [
    makeStep({
      id: "av-step-990i-allowance",
      order: 1,
      label: "990 I : abattement 152 500 € par bénéficiaire",
      inputValue: `${result.deathBenefitBefore70} € / ${result.beneficiaries} bénéficiaire(s)`,
      formula: "capitaux décès (primes < 70 ans, produits inclus) / bénéficiaires − 152 500 €",
      outputValue: result.taxablePerBeneficiary990I,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "av-step-990i-tax",
      order: 2,
      label: "990 I : prélèvement 20 % / 31,25 %",
      inputValue: result.taxablePerBeneficiary990I,
      formula: "20 % jusqu'à 700 000 € de part taxable, 31,25 % au-delà",
      outputValue: result.tax990ITotal,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.tax990ITotal > 0 ? "needs_review" : "indicative",
      nextAction: "Vérifier les clauses bénéficiaires et la ventilation par contrat.",
    }),
    makeStep({
      id: "av-step-757b",
      order: 3,
      label: "757 B : primes après 70 ans",
      inputValue: `${result.premiumsAfter70} € de primes`,
      formula: `surplus au-delà de 30 500 € (abattement global) → DMTG ${DMTG_RELATIONSHIP_LABELS[result.relationship]}`,
      outputValue: result.tax757B,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_DMTG,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.taxablePremiums757B > 0 ? "needs_review" : "indicative",
      nextAction: "Faire liquider l'intégration successorale du surplus par le notaire.",
    }),
    makeStep({
      id: "av-step-gains-after-70",
      order: 4,
      label: "Produits des primes après 70 ans",
      inputValue: result.gainsAfter70,
      formula: "produits attachés aux primes post-70 ans : exonérés (757 B)",
      outputValue: "Exonérés",
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "av-step-spouse",
      order: 5,
      label: "Exonération conjoint / PACS",
      inputValue: result.spouseBeneficiary ? "Bénéficiaire conjoint/PACS" : "Autre bénéficiaire",
      formula: "loi TEPA : conjoint et partenaire de PACS exonérés de 990 I et 757 B",
      outputValue: result.exemptSpouse ? "Exonération totale" : "Non applicable",
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BOFIP,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Confirmer la qualité du bénéficiaire dans la clause au jour du décès.",
    }),
  ];

  return taxRun({
    module: "assurance-vie",
    scenario: "assurance-vie",
    steps,
    resultLabel: result.exemptSpouse
      ? "Conjoint/PACS exonéré"
      : `990 I : ${result.tax990ITotal} € · 757 B : ${result.tax757B} €`,
    resultAmount: result.totalTax,
    evidenceSourceIds: [SOURCE_BOFIP, SOURCE_DMTG],
    reviewerRequired: "notaire",
    computedResult: { ...result },
  });
}
