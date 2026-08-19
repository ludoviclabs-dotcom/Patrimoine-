import { applyRate, fromCents, toCents } from "./money";

/**
 * Profils de taux par catégorie de revenu mobilier — correction P0 TAX-P0-002.
 *
 * Le taux global de 31,4 % ne doit PAS être stocké comme constante universelle
 * ni appliqué indistinctement : la composante sociale dépend du produit.
 * Référentiel : REGLEMENTATION_AOUT_2026.md § 3.1 à § 3.4 (matrice par produit),
 * CGI art. 200 A, LFSS 2026 art. 12.
 *
 * Deux composantes sont conservées séparément (IR et prélèvements sociaux) ;
 * le taux agrégé est une valeur **dérivée**, destinée à l'affichage, et n'est
 * jamais la source de vérité du calcul.
 *
 * Versionnement dans le temps : la LFSS 2026 porte les prélèvements sociaux sur
 * les revenus du capital de 17,2 % à 18,6 % au 1er janvier 2026. Les produits
 * expressément dérogatoires (assurance-vie, CEL/PEL/PEP historiques) restent à
 * 17,2 % des deux côtés du pivot. Un calcul portant sur une date antérieure
 * sélectionne donc la composante sociale de 17,2 %.
 */

export type FinancialIncomeKind =
  | "dividend"
  | "interest"
  | "securities-capital-gain"
  | "private-crypto-gain"
  | "pea-before-five-years"
  | "pea-after-five-years"
  | "life-insurance"
  | "legacy-cel-pel-pep"
  | "disability-savings-annuity";

export type InvestmentIncomeTaxProfile = {
  /** Identifiant stable du régime, repris dans les calculation_steps. */
  regimeId: string;
  label: string;
  /** Composante impôt sur le revenu (forfaitaire). */
  incomeTaxRate: number;
  /** Composante prélèvements sociaux au régime 2026. */
  socialLevyRate: number;
  /**
   * `true` si la hausse LFSS 2026 (17,2 % → 18,6 %) s'applique à ce produit.
   * `false` pour les produits expressément maintenus à 17,2 %.
   */
  socialLevyRaisedByLfss2026: boolean;
  /** Le régime exige une qualification professionnelle avant conclusion. */
  needsReview: boolean;
  note: string;
  legalRef: string;
};

/** Pivot LFSS 2026 (loi n° 2025-1403 du 30/12/2025, art. 12). */
export const PFU_LFSS_2026_PIVOT_DATE = "2026-01-01";
/** Prélèvements sociaux sur revenus du capital avant la hausse LFSS 2026. */
export const PRE_LFSS_2026_SOCIAL_LEVY_RATE = 0.172;
/** Prélèvements sociaux sur revenus du capital à compter du 01/01/2026. */
export const LFSS_2026_SOCIAL_LEVY_RATE = 0.186;
/** Taux forfaitaire d'impôt sur le revenu de droit commun (CGI art. 200 A). */
export const PFU_STANDARD_INCOME_TAX_RATE = 0.128;

/**
 * Matrice par produit — REGLEMENTATION_AOUT_2026.md § 3.2.
 * Aucune valeur n'est déduite de la mémoire du modèle : chaque ligne provient
 * de la table du référentiel approuvé du 18/08/2026.
 */
export const PFU_2026_RATE_PROFILES: Readonly<
  Record<FinancialIncomeKind, InvestmentIncomeTaxProfile>
> = {
  dividend: {
    regimeId: "pfu-dividend-2026",
    label: "Dividendes ordinaires",
    incomeTaxRate: PFU_STANDARD_INCOME_TAX_RATE,
    socialLevyRate: LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: true,
    needsReview: false,
    note: "PFU 31,4 % ; l'abattement de 40 % n'est applicable qu'en cas d'option globale au barème.",
    legalRef: "CGI art. 200 A ; art. 158-3-2° ; LFSS 2026 art. 12",
  },
  interest: {
    regimeId: "pfu-interest-2026",
    label: "Intérêts ordinaires",
    incomeTaxRate: PFU_STANDARD_INCOME_TAX_RATE,
    socialLevyRate: LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: true,
    needsReview: false,
    note: "PFU 31,4 % pour les produits de placement ordinaires ; une dispense d'acompte n'est pas une exonération.",
    legalRef: "CGI art. 200 A ; LFSS 2026 art. 12",
  },
  "securities-capital-gain": {
    regimeId: "pfu-securities-gain-2026",
    label: "Plus-values mobilières",
    incomeTaxRate: PFU_STANDARD_INCOME_TAX_RATE,
    socialLevyRate: LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: true,
    needsReview: false,
    note: "PFU 31,4 % sur le gain net taxable ; abattements historiques uniquement en cas d'option barème.",
    legalRef: "CGI art. 200 A ; LFSS 2026 art. 12",
  },
  "private-crypto-gain": {
    regimeId: "pfu-crypto-private-2026",
    label: "Crypto-actifs, activité privée",
    incomeTaxRate: PFU_STANDARD_INCOME_TAX_RATE,
    socialLevyRate: LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: true,
    needsReview: true,
    note: "Taux 31,4 % pour l'activité occasionnelle privée ; une activité professionnelle doit être requalifiée.",
    legalRef: "CGI art. 150 VH bis ; art. 200 A",
  },
  "pea-before-five-years": {
    regimeId: "pea-before-five-years-2026",
    label: "PEA, retrait avant cinq ans",
    incomeTaxRate: PFU_STANDARD_INCOME_TAX_RATE,
    socialLevyRate: LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: true,
    needsReview: true,
    note: "Retrait avant cinq ans : clôture, exceptions et date d'acquisition à contrôler.",
    legalRef: "CGI art. 200 A ; LFSS 2026 art. 12",
  },
  "pea-after-five-years": {
    regimeId: "pea-after-five-years-2026",
    label: "PEA, retrait après cinq ans",
    incomeTaxRate: 0,
    socialLevyRate: LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: true,
    needsReview: true,
    note: "Exonération d'IR après cinq ans ; prélèvements sociaux 18,6 % selon les règles 2026, date et retraits à contrôler.",
    legalRef: "CGI art. 157-5° bis ; LFSS 2026 art. 12",
  },
  "life-insurance": {
    regimeId: "life-insurance-2026",
    label: "Assurance-vie, cas général",
    incomeTaxRate: PFU_STANDARD_INCOME_TAX_RATE,
    socialLevyRate: PRE_LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: false,
    needsReview: true,
    note:
      "Prélèvements sociaux maintenus à 17,2 % par dérogation expresse. Taux IR 7,5 % ou 12,8 % et abattement annuel 4 600/9 200 € à qualifier (ancienneté, primes, encours).",
    legalRef: "CGI art. 125-0 A ; LFSS 2026 art. 12 (dérogation)",
  },
  "legacy-cel-pel-pep": {
    regimeId: "legacy-cel-pel-pep-2026",
    label: "CEL / PEL / PEP historiques",
    incomeTaxRate: PFU_STANDARD_INCOME_TAX_RATE,
    socialLevyRate: PRE_LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: false,
    needsReview: true,
    note: "Certains produits historiques conservent 17,2 % de prélèvements sociaux ; vérifier la date d'ouverture.",
    legalRef: "CGI art. 125-0 A ; LFSS 2026 art. 12 (dérogation)",
  },
  "disability-savings-annuity": {
    regimeId: "disability-savings-annuity-2026",
    label: "Rente-survie / épargne handicap",
    incomeTaxRate: 0,
    socialLevyRate: LFSS_2026_SOCIAL_LEVY_RATE,
    socialLevyRaisedByLfss2026: true,
    needsReview: true,
    note: "Traitement spécial à valider contrat par contrat.",
    legalRef: "CGI art. 199 septies ; LFSS 2026 art. 12",
  },
};

export type ResolvedInvestmentIncomeProfile = InvestmentIncomeTaxProfile & {
  /** Taux agrégé DÉRIVÉ (IR + PS) — affichage uniquement, jamais source du calcul. */
  aggregateRate: number;
  /** `true` si la date retenue relève du régime LFSS 2026. */
  lfss2026Applies: boolean;
  asOfDate: string;
};

/**
 * Résout le profil applicable à une catégorie et à une date de fait générateur.
 * Comparaison lexicographique valide entre dates ISO de même format.
 */
export function getInvestmentIncomeProfile(
  kind: FinancialIncomeKind,
  asOfDate: string = PFU_LFSS_2026_PIVOT_DATE,
): ResolvedInvestmentIncomeProfile {
  const base = PFU_2026_RATE_PROFILES[kind];
  const lfss2026Applies = asOfDate >= PFU_LFSS_2026_PIVOT_DATE;
  const socialLevyRate =
    lfss2026Applies || !base.socialLevyRaisedByLfss2026
      ? base.socialLevyRate
      : PRE_LFSS_2026_SOCIAL_LEVY_RATE;

  return {
    ...base,
    socialLevyRate,
    aggregateRate: base.incomeTaxRate + socialLevyRate,
    lfss2026Applies,
    asOfDate,
  };
}

/** Taux agrégé dérivé d'une catégorie — pour libellés et affichage seulement. */
export function getAggregateRate(
  kind: FinancialIncomeKind,
  asOfDate: string = PFU_LFSS_2026_PIVOT_DATE,
) {
  return getInvestmentIncomeProfile(kind, asOfDate).aggregateRate;
}

export type PfuByCategoryInput = {
  kind: FinancialIncomeKind;
  grossTaxableGain: number;
  /** Abattement portant uniquement sur la composante IR (ex. assurance-vie > 8 ans). */
  incomeTaxAllowance?: number;
  asOfDate?: string;
};

/**
 * Calcule le PFU d'une catégorie en conservant les composantes séparées.
 * L'abattement d'IR ne réduit pas la base des prélèvements sociaux.
 */
export function computePfuByCategory({
  kind,
  grossTaxableGain,
  incomeTaxAllowance = 0,
  asOfDate = PFU_LFSS_2026_PIVOT_DATE,
}: PfuByCategoryInput) {
  const profile = getInvestmentIncomeProfile(kind, asOfDate);
  const grossCents = toCents(Math.max(0, grossTaxableGain));
  const allowanceCents = Math.min(grossCents, toCents(Math.max(0, incomeTaxAllowance)));
  const incomeTaxBaseCents = Math.max(0, grossCents - allowanceCents);
  const incomeTaxCents = applyRate(incomeTaxBaseCents, profile.incomeTaxRate);
  const socialLevyCents = applyRate(grossCents, profile.socialLevyRate);
  const totalCents = incomeTaxCents + socialLevyCents;

  return {
    kind,
    regimeId: profile.regimeId,
    asOfDate: profile.asOfDate,
    lfss2026Applies: profile.lfss2026Applies,
    incomeTaxRate: profile.incomeTaxRate,
    socialLevyRate: profile.socialLevyRate,
    aggregateRate: profile.aggregateRate,
    needsReview: profile.needsReview,
    grossTaxableGain: fromCents(grossCents),
    incomeTaxBase: fromCents(incomeTaxBaseCents),
    incomeTax: fromCents(incomeTaxCents),
    socialLevyBase: fromCents(grossCents),
    socialLevies: fromCents(socialLevyCents),
    totalTax: fromCents(totalCents),
    effectiveRate: grossCents === 0 ? 0 : totalCents / grossCents,
  };
}
