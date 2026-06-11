import { demoTenant } from "../../demo-data/v1";
import { demoHousehold } from "../../demo-data/household";
import { createTaxRunFactory, makeStep, type ProgressiveBracket } from "../engine-kit";
import { fromCents, roundCents, toCents } from "../money";

/**
 * IR 2026 (revenus 2025) — barème progressif, quotient familial plafonné,
 * décote, CEHR et CDHR plancher 20 %.
 *
 * Paramètres vérifiés le 11/06/2026 sur les sources officielles :
 * - barème 11 600 / 29 579 / 84 577 / 181 917 à 0/11/30/41/45 % et plafond QF
 *   1 807 €/demi-part : service-public.gouv.fr fiche F1419 ;
 * - décote 897 € (célibataire) / 1 483 € (imposition commune), taux 45,25 %,
 *   seuils 1 982 / 3 277 € : economie.gouv.fr ;
 * - CEHR art. 223 sexies CGI (3 %/4 % au-delà de 250 k€ / 500 k€ de RFR) ;
 * - CDHR : imposition minimale de 20 % du RFR (réutilise la logique v2).
 *
 * Tous les calculs intermédiaires sont menés en centimes entiers : le golden
 * officiel (célibataire, 30 000 € → 2 103,99 €) est exact au centime.
 */

export const IR_BRACKETS_2026: ProgressiveBracket[] = [
  { ceiling: 11_600, rate: 0 },
  { ceiling: 29_579, rate: 0.11 },
  { ceiling: 84_577, rate: 0.3 },
  { ceiling: 181_917, rate: 0.41 },
  { ceiling: Number.POSITIVE_INFINITY, rate: 0.45 },
];

export const FAMILY_QUOTIENT_CAP_PER_HALF_PART = 1_807;
const DECOTE_RATE = 0.4525;
const DECOTE_BASE = { single: 897, couple: 1_483 } as const;
const DECOTE_THRESHOLD = { single: 1_982, couple: 3_277 } as const;
const CEHR_THRESHOLDS = {
  single: [
    { from: 250_000, to: 500_000, rate: 0.03 },
    { from: 500_000, to: Number.POSITIVE_INFINITY, rate: 0.04 },
  ],
  couple: [
    { from: 500_000, to: 1_000_000, rate: 0.03 },
    { from: 1_000_000, to: Number.POSITIVE_INFINITY, rate: 0.04 },
  ],
} as const;
const CDHR_THRESHOLD = { single: 250_000, couple: 500_000 } as const;
const CDHR_MINIMUM_RATE = 0.2;

export type IrSituation = "single" | "couple";

/**
 * CDHR seule (imposition minimale 20 % du RFR) — déléguée ici pour que les
 * seuils vivent à un seul endroit ; utilisée aussi par simulateIrPfuCdhr (v2).
 * Arithmétique en euros arrondis, comme le moteur v2 historique.
 */
export function computeCdhr({
  rfr,
  situation = "couple" as IrSituation,
  taxAlreadyPaid = 0,
}: {
  rfr: number;
  situation?: IrSituation;
  taxAlreadyPaid?: number;
}) {
  const applicable = rfr >= CDHR_THRESHOLD[situation];
  const minimumTax = applicable ? Math.round(rfr * CDHR_MINIMUM_RATE) : 0;
  const cdhr = Math.max(0, minimumTax - taxAlreadyPaid);
  return { applicable, minimumTax, cdhr };
}

/** Barème progressif en centimes : aucune perte de précision intermédiaire. */
function progressiveTaxCents(baseCents: number, brackets: ProgressiveBracket[]): number {
  let previousCeilingCents = 0;
  let taxCents = 0;

  for (const bracket of brackets) {
    const ceilingCents = Number.isFinite(bracket.ceiling)
      ? toCents(bracket.ceiling)
      : Number.POSITIVE_INFINITY;
    const slice = Math.max(0, Math.min(baseCents, ceilingCents) - previousCeilingCents);
    taxCents += Math.round(slice * bracket.rate);
    previousCeilingCents = ceilingCents;
    if (baseCents <= ceilingCents) break;
  }

  return taxCents;
}

export type IrBaremeInput = {
  taxableIncome?: number;
  situation?: IrSituation;
  /** Demi-parts fiscales liées aux enfants (1 enfant = 1, 3e enfant = 2). */
  childrenHalfParts?: number;
  /** Revenu fiscal de référence si différent du revenu imposable (CEHR/CDHR). */
  referenceIncome?: number;
  /** Impôts déjà acquittés pris en compte pour la CDHR (PFU, IR étranger…). */
  taxAlreadyPaidForCdhr?: number;
};

export function computeIrBareme2026({
  taxableIncome = 30_000,
  situation = "single" as IrSituation,
  childrenHalfParts = 0,
  referenceIncome,
  taxAlreadyPaidForCdhr = 0,
}: IrBaremeInput = {}) {
  const baseParts = situation === "couple" ? 2 : 1;
  const parts = baseParts + childrenHalfParts * 0.5;
  const incomeCents = toCents(Math.max(0, taxableIncome));
  const rfr = Math.max(0, referenceIncome ?? taxableIncome);

  // 1. Barème appliqué au quotient familial complet.
  const quotientCents = Math.round(incomeCents / parts);
  const taxWithQuotientCents = progressiveTaxCents(quotientCents, IR_BRACKETS_2026) * parts;

  // 2. Plafonnement du quotient familial : l'avantage des demi-parts enfants
  //    est limité à 1 807 € par demi-part (référence : IR sans ces demi-parts).
  const referenceQuotientCents = Math.round(incomeCents / baseParts);
  const taxWithoutChildrenCents =
    progressiveTaxCents(referenceQuotientCents, IR_BRACKETS_2026) * baseParts;
  const quotientAdvantageCents = Math.max(0, taxWithoutChildrenCents - taxWithQuotientCents);
  const quotientCapCents = toCents(FAMILY_QUOTIENT_CAP_PER_HALF_PART) * childrenHalfParts;
  const quotientCapped = childrenHalfParts > 0 && quotientAdvantageCents > quotientCapCents;
  const taxAfterCapCents = quotientCapped
    ? taxWithoutChildrenCents - quotientCapCents
    : taxWithQuotientCents;

  // 3. Décote.
  const decoteThresholdCents = toCents(DECOTE_THRESHOLD[situation]);
  const decoteCents =
    taxAfterCapCents > 0 && taxAfterCapCents < decoteThresholdCents
      ? Math.max(0, toCents(DECOTE_BASE[situation]) - Math.round(taxAfterCapCents * DECOTE_RATE))
      : 0;
  const taxAfterDecoteCents = Math.max(0, taxAfterCapCents - decoteCents);

  // 4. CEHR sur le revenu fiscal de référence.
  const cehrCents = CEHR_THRESHOLDS[situation].reduce((sum, slice) => {
    const taxable = Math.max(0, Math.min(rfr, slice.to) - slice.from);
    return sum + Math.round(toCents(taxable) * slice.rate);
  }, 0);

  // 5. CDHR : imposition minimale de 20 % du RFR au-delà du seuil.
  const cdhrApplicable = rfr >= CDHR_THRESHOLD[situation];
  const minimumTaxCents = cdhrApplicable ? Math.round(toCents(rfr) * CDHR_MINIMUM_RATE) : 0;
  const alreadyPaidCents = taxAfterDecoteCents + cehrCents + toCents(taxAlreadyPaidForCdhr);
  const cdhrCents = Math.max(0, minimumTaxCents - alreadyPaidCents);

  // Taux marginal : tranche atteinte par le quotient familial.
  const quotient = fromCents(quotientCents);
  const marginalRate =
    IR_BRACKETS_2026.find((bracket) => quotient <= bracket.ceiling)?.rate ?? 0.45;
  const incomeTax = fromCents(taxAfterDecoteCents);
  const averageRate = taxableIncome > 0 ? roundCents((incomeTax / taxableIncome) * 100) : 0;

  return {
    taxableIncome,
    situation,
    parts,
    childrenHalfParts,
    quotient: roundCents(quotient),
    taxBeforeCap: fromCents(taxWithQuotientCents),
    quotientAdvantage: fromCents(quotientAdvantageCents),
    quotientCapped,
    taxAfterCap: fromCents(taxAfterCapCents),
    decote: fromCents(decoteCents),
    incomeTax,
    marginalRate,
    averageRatePercent: averageRate,
    referenceIncome: rfr,
    cehr: fromCents(cehrCents),
    cdhrApplicable,
    cdhr: fromCents(cdhrCents),
    totalTax: fromCents(taxAfterDecoteCents + cehrCents + cdhrCents),
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

const RULE_ID = "rule-ir-bareme-2026-v1";
const SOURCE_BAREME = "src-service-public-bareme-ir-2026";
const SOURCE_DECOTE = "src-economie-decote-ir-2026";
const SOURCE_CDHR = "src-economie-cdhr-2026";
const COVERAGE = ["coverage-ir-bareme-2026"];

export function simulateIrBareme2026(input: IrBaremeInput = {}) {
  const result = computeIrBareme2026(input);

  const steps = [
    makeStep({
      id: "ir-step-quotient",
      order: 1,
      label: "Quotient familial",
      inputValue: `${result.taxableIncome} € / ${result.parts} part(s)`,
      formula: "revenu imposable / nombre de parts",
      outputValue: result.quotient,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BAREME,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "ir-step-bareme",
      order: 2,
      label: "Barème progressif 2026 par part",
      inputValue: result.quotient,
      formula: "tranches 11 600 / 29 579 / 84 577 / 181 917 à 0/11/30/41/45 %",
      outputValue: result.taxBeforeCap,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BAREME,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "ir-step-quotient-cap",
      order: 3,
      label: "Plafonnement du quotient familial",
      inputValue: `avantage ${result.quotientAdvantage} € / plafond ${
        FAMILY_QUOTIENT_CAP_PER_HALF_PART * result.childrenHalfParts
      } €`,
      formula: "avantage limité à 1 807 € par demi-part enfant",
      outputValue: result.taxAfterCap,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_BAREME,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.quotientCapped ? "needs_review" : "indicative",
      nextAction: "Vérifier la composition du foyer et les demi-parts spéciales sur l'avis.",
    }),
    makeStep({
      id: "ir-step-decote",
      order: 4,
      label: "Décote",
      inputValue: result.taxAfterCap,
      formula: `max(0 ; ${DECOTE_BASE[result.situation]} − 45,25 % × IR) si IR < ${
        DECOTE_THRESHOLD[result.situation]
      } €`,
      outputValue: result.decote,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_DECOTE,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "ir-step-cehr",
      order: 5,
      label: "CEHR (art. 223 sexies)",
      inputValue: `RFR ${result.referenceIncome} €`,
      formula: "3 % puis 4 % au-delà de 250 k€ (célibataire) / 500 k€ (couple)",
      outputValue: result.cehr,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_CDHR,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.cehr > 0 ? "needs_review" : "indicative",
      nextAction: "Contrôler le RFR exact et le mécanisme de lissage éventuel.",
    }),
    makeStep({
      id: "ir-step-cdhr",
      order: 6,
      label: "CDHR : imposition minimale 20 %",
      inputValue: `RFR ${result.referenceIncome} €`,
      formula: "max(0 ; 20 % RFR − impôts déjà dus) si RFR ≥ seuil",
      outputValue: result.cdhr,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_CDHR,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.cdhrApplicable ? "needs_review" : "indicative",
      nextAction: "Valider le RFR, les revenus exceptionnels et les crédits d'impôt retenus.",
    }),
  ];

  return taxRun({
    module: "ir-bareme",
    scenario: "ir",
    steps,
    resultLabel: `TMI ${Math.round(result.marginalRate * 100)} % · taux moyen ${result.averageRatePercent.toLocaleString(
      "fr-FR",
    )} %`,
    resultAmount: result.totalTax,
    evidenceSourceIds: [SOURCE_BAREME, SOURCE_DECOTE, SOURCE_CDHR],
    reviewerRequired: "avocat",
    computedResult: { ...result },
  });
}
