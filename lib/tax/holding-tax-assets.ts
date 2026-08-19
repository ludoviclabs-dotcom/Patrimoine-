/**
 * Taxe sur les actifs non professionnels des holdings patrimoniales.
 * CGI art. 235 ter C — correction P0 TAX-P0-004.
 *
 * Le point central : l'assiette est une **liste fermée**. Un actif n'entre dans
 * la base que s'il relève d'une des catégories énumérées au II A de l'article.
 * La trésorerie, les titres financiers, les participations actives et les
 * œuvres d'art comme catégorie générale n'y entrent PAS — même lorsqu'ils
 * génèrent des revenus passifs et participent, à ce titre, au test
 * d'assujettissement. Revenu passif et actif taxable sont deux notions
 * distinctes qui ne doivent jamais être confondues.
 *
 * Sources :
 * - `REGLEMENTATION_AOUT_2026.md` § 9.1 à § 9.5 (date, conditions cumulatives,
 *   liste fermée, assiette, taux, règles de dette) ;
 * - CGI art. 235 ter C, II-A ; LF 2026 n° 2026-103 du 19/02/2026, art. 7 ;
 * - implémentation de référence `MOTEURS_FISCAUX_2026.ts` § 8.
 */

/** Première clôture d'exercice taxable (LF 2026 art. 7, II). */
export const HOLDING_TAX_FIRST_CLOSING_DATE = "2026-12-31";
/** Seuil de valeur vénale de l'ensemble des actifs (CGI art. 235 ter C, I). */
export const HOLDING_TAX_ASSET_THRESHOLD = 5_000_000;
/** Seuil de contrôle par une personne physique. */
export const HOLDING_TAX_CONTROL_THRESHOLD = 0.5;
/** Taux de la taxe (CGI art. 235 ter C, IV). */
export const HOLDING_TAX_RATE = 0.2;
/** Réduction annuelle légale des prêts sans terme : un vingtième par an. */
export const HOLDING_TAX_NO_TERM_DEBT_YEARS = 20;

/**
 * Catégories d'actifs. Les dix premières relèvent de la liste fermée du II A ;
 * les suivantes sont explicitement NON taxables et ne figurent ici que pour
 * permettre de les inventorier sans jamais les agréger à l'assiette.
 */
export type HoldingTaxAssetKind =
  // --- Liste fermée, II A 1° à 7° ---
  | "hunting"
  | "fishing"
  | "non-professional-vehicle"
  | "tourism-vehicle"
  | "yacht-or-pleasure-boat"
  | "aircraft"
  | "jewelry-or-precious-metal"
  | "race-or-competition-horse"
  | "wine-or-alcohol"
  | "owner-use-housing"
  // --- Hors liste fermée : jamais taxables par analogie ---
  | "cash"
  | "financial-security"
  | "active-participation"
  | "work-of-art"
  | "other";

/**
 * Liste fermée du II A. Toute catégorie absente de cet ensemble est exclue de
 * l'assiette, quelle que soit sa nature patrimoniale ou passive.
 */
const HOLDING_TAX_CLOSED_LIST: ReadonlySet<HoldingTaxAssetKind> = new Set([
  "hunting",
  "fishing",
  "non-professional-vehicle",
  "tourism-vehicle",
  "yacht-or-pleasure-boat",
  "aircraft",
  "jewelry-or-precious-metal",
  "race-or-competition-horse",
  "wine-or-alcohol",
  "owner-use-housing",
]);

export function isListedByArticle235TerC(kind: HoldingTaxAssetKind) {
  return HOLDING_TAX_CLOSED_LIST.has(kind);
}

export function listClosedListKinds(): readonly HoldingTaxAssetKind[] {
  return [...HOLDING_TAX_CLOSED_LIST];
}

/** Mode de remboursement retenu pour les dettes d'acquisition des logements. */
export type HoldingTaxDebtRepaymentKind = "amortising" | "bullet-or-nonconstant" | "no-term";

export type HoldingTaxAsset = {
  id: string;
  label: string;
  kind: HoldingTaxAssetKind;
  fairMarketValueAtClose: number;
  /**
   * Proportion affectée à une activité opérationnelle éligible au cours de
   * l'exercice, donc hors assiette (II A). `undefined` ne vaut PAS 0 : la
   * fraction est alors inconnue et l'actif est signalé pour revue.
   */
  operationalUseFraction?: number;
  /**
   * Bijoux et métaux précieux affectés à un musée / monument historique ou
   * exposés au public : hors assiette (II A 4°).
   */
  statutoryDisplayException?: boolean;
  /**
   * Logements (II A 7°) : la jouissance est-elle réservée à la personne
   * physique contrôlante (gratuité, loyer sous le marché, location fictive) ?
   * Un logement réellement loué aux conditions de marché n'est pas visé.
   */
  reservedForControllingPersonUse?: boolean;
};

export type HoldingTaxHousingDebt = {
  id: string;
  linkedHousingAssetId: string;
  originalPrincipal: number;
  outstandingPrincipalAtClose: number;
  repaymentKind: HoldingTaxDebtRepaymentKind;
  disbursementDate: string;
  /** Requis pour un prêt in fine / à échéances non constantes. */
  contractualEndDate?: string;
  /** Dette contractée auprès de la personne physique ou de sociétés liées. */
  relatedPartyDebt?: boolean;
  /** Preuve d'un objectif non principalement fiscal (exception au II A 7° d). */
  nonTaxPurposeProven?: boolean;
};

/** Nombre d'années révolues entre deux dates ISO `YYYY-MM-DD`. */
export function fullYearsBetweenIso(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let years = ty - fy;
  if (tm < fm || (tm === fm && td < fd)) years -= 1;
  return Math.max(0, years);
}

/**
 * Montant de dette déductible selon le mode de remboursement (§ 9.5) :
 * - échéances constantes : capital restant dû ;
 * - in fine / échéances non constantes : amortissement linéaire légal ;
 * - prêt sans terme : réduction d'un vingtième par an.
 * Retourne `null` lorsque la donnée requise manque : la dette n'est alors pas
 * déduite et le cas est signalé, jamais estimé.
 */
export function statutoryHousingDebtAmount(
  debt: HoldingTaxHousingDebt,
  exerciseCloseDate: string,
): number | null {
  const original = Math.max(0, debt.originalPrincipal);
  const outstanding = Math.max(0, debt.outstandingPrincipalAtClose);

  if (debt.repaymentKind === "amortising") {
    return Math.min(original, outstanding);
  }

  const elapsedYears = fullYearsBetweenIso(debt.disbursementDate, exerciseCloseDate);

  if (debt.repaymentKind === "no-term") {
    return Math.max(0, original * (1 - elapsedYears / HOLDING_TAX_NO_TERM_DEBT_YEARS));
  }

  // in fine / échéances non constantes : amortissement linéaire sur la durée.
  if (!debt.contractualEndDate) return null;
  const totalYears = Math.max(
    1,
    fullYearsBetweenIso(debt.disbursementDate, debt.contractualEndDate),
  );
  return Math.max(0, original * (1 - elapsedYears / totalYears));
}
