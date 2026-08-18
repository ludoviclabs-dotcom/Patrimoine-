/**
 * PATRIMOINE FISCAL — MOTEURS FISCAUX 2026
 * Gel réglementaire : 18 août 2026 (Europe/Paris)
 *
 * Objet : noyau déterministe, sans dépendance, destiné à servir de spécification
 * exécutable pour les moteurs patrimoniaux du produit.
 *
 * IMPORTANT
 * - Les calculs sont indicatifs et doivent être validés par un professionnel habilité.
 * - Les règles sont datées et ne doivent jamais être activées automatiquement après un diff.
 * - Les situations internationales, conventions fiscales, abus de droit, quasi-usufruit,
 *   démembrements atypiques, soultes complexes et régimes transitoires exigent une revue humaine.
 * - Montants en euros. Les calculs intermédiaires conservent les centimes ; le montant déclaratif
 *   est arrondi à l'euro le plus proche lorsque le formulaire fiscal l'impose.
 *
 * Sources légales principales :
 * - Loi n° 2026-103 du 19 février 2026 de finances pour 2026.
 * - Loi n° 2025-1403 du 30 décembre 2025 de financement de la sécurité sociale pour 2026.
 * - CGI : art. 13, 150-0 B ter, 150 U à 150 VH, 1609 nonies G, 197, 200 A,
 *   223 sexies, 224, 777, 779, 784, 787 B, 790, 796-0 bis, 796-0 ter, 964 à 983, 235 ter C.
 * - BOFiP : séries RPPM, RFPI, PAT-IFI, ENR-DMTG et BOI-IR-BASE-50-10-40 (CDHR),
 *   dans leurs versions contrôlées au 18 août 2026.
 */

export type ReviewSeverity = "info" | "review" | "blocking";

export interface ReviewFlag {
  code: string;
  severity: ReviewSeverity;
  message: string;
  legalRef?: string;
}

export interface RuleTrace {
  ruleId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceRefs: readonly string[];
  confidence: "verified" | "to-review";
  humanReviewRequired: boolean;
}

export interface MoneyBreakdown {
  label: string;
  amount: number;
  legalRef?: string;
}

export const RULE_TRACES = {
  ir2026: {
    ruleId: "fr-ir-2026-income-2025-v1",
    effectiveFrom: "2026-01-01",
    sourceRefs: ["CGI art. 197", "LF 2026, art. 2"],
    confidence: "verified",
    humanReviewRequired: true,
  },
  pfu2026: {
    ruleId: "fr-pfu-2026-v2",
    effectiveFrom: "2026-01-01",
    sourceRefs: ["CGI art. 200 A", "LFSS 2026, art. 12"],
    confidence: "verified",
    humanReviewRequired: true,
  },
  cdhr2026: {
    ruleId: "fr-cdhr-2026-v2",
    effectiveFrom: "2026-01-01",
    sourceRefs: ["CGI art. 224", "BOI-IR-BASE-50-10-40, 30 juin 2026"],
    confidence: "verified",
    humanReviewRequired: true,
  },
  ifi2026: {
    ruleId: "fr-ifi-2026-v2",
    effectiveFrom: "2026-01-01",
    sourceRefs: ["CGI art. 964 à 983", "BOFiP PAT-IFI"],
    confidence: "verified",
    humanReviewRequired: true,
  },
  pvImmo2026: {
    ruleId: "fr-pv-immo-2026-v3",
    effectiveFrom: "2026-01-01",
    sourceRefs: ["CGI art. 150 U à 150 VH", "CGI art. 1609 nonies G", "BOFiP RFPI-PVI"],
    confidence: "verified",
    humanReviewRequired: true,
  },
  dutreilPreLf2026: {
    ruleId: "fr-dutreil-2026-pre-lf-v1",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-02-20",
    sourceRefs: ["CGI art. 787 B, version antérieure au 21 février 2026", "CGI art. 790"],
    confidence: "verified",
    humanReviewRequired: true,
  },
  dutreil2026: {
    ruleId: "fr-dutreil-2026-v4",
    effectiveFrom: "2026-02-21",
    sourceRefs: ["CGI art. 787 B", "CGI art. 790", "LF 2026, art. 8"],
    confidence: "verified",
    humanReviewRequired: true,
  },
  apportCession2026: {
    ruleId: "fr-150-0-b-ter-2026-v3",
    effectiveFrom: "2026-02-21",
    sourceRefs: ["CGI art. 150-0 B ter", "LF 2026, art. 11"],
    confidence: "verified",
    humanReviewRequired: true,
  },
  holdingTax2026: {
    ruleId: "fr-holding-tax-2026-v1",
    effectiveFrom: "2026-12-31",
    sourceRefs: ["CGI art. 235 ter C", "LF 2026, art. 7"],
    confidence: "verified",
    humanReviewRequired: true,
  },
} as const satisfies Record<string, RuleTrace>;

export function roundEuro(value: number): number {
  return Math.round((value + Number.EPSILON) * 1) / 1;
}

export function roundCent(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundRate(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

function nonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} doit être un nombre fini positif ou nul.`);
  }
  return value;
}

function ratio(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} doit être compris entre 0 et 1.`);
  }
  return value;
}

function parseDate(value: string, label: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${label} doit être une date ISO YYYY-MM-DD valide.`);
  }
  return date;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addYearsIso(value: string, years: number): string {
  const date = parseDate(value, "date");
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return toIsoDate(date);
}

function fullYearsBetween(from: string, to: string): number {
  const start = parseDate(from, "date de départ");
  const end = parseDate(to, "date de fin");
  if (end < start) throw new RangeError("La date de fin ne peut pas précéder la date de départ.");
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  const anniversary = new Date(start);
  anniversary.setUTCFullYear(start.getUTCFullYear() + years);
  if (anniversary > end) years -= 1;
  return Math.max(0, years);
}

export interface ProgressiveBracket {
  upTo: number;
  rate: number;
}

export function applyProgressiveScale(base: number, brackets: readonly ProgressiveBracket[]): number {
  nonNegative(base, "base");
  let lower = 0;
  let tax = 0;
  for (const bracket of brackets) {
    const upper = bracket.upTo;
    const taxableInBracket = Math.max(0, Math.min(base, upper) - lower);
    tax += taxableInBracket * bracket.rate;
    if (base <= upper) break;
    lower = upper;
  }
  return tax;
}

// -----------------------------------------------------------------------------
// 1. IMPÔT SUR LE REVENU — BARÈME 2026 SUR REVENUS 2025
// CGI art. 197 ; tranches revalorisées de 0,9 % par la LF 2026.
// -----------------------------------------------------------------------------

export const IR_2026_BRACKETS = [
  { upTo: 11_600, rate: 0 },
  { upTo: 29_579, rate: 0.11 },
  { upTo: 84_577, rate: 0.30 },
  { upTo: 181_917, rate: 0.41 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45 },
] as const satisfies readonly ProgressiveBracket[];

export const IR_2026_QUOTIENT_CAP_PER_HALF_SHARE = 1_807;
export const IR_2026_DECOTE = {
  single: { constant: 897, rate: 0.4525 },
  joint: { constant: 1_483, rate: 0.4525 },
} as const;

export interface ProgressiveIncomeTaxInput {
  taxableIncome: number;
  parts: number;
  situation: "single" | "joint";
  /** 1 pour célibataire, 2 pour couple, avant majorations ordinaires. */
  baseParts?: number;
  /** Désactiver seulement si le plafonnement a été traité en amont. */
  applyOrdinaryQuotientCap?: boolean;
  /** Les plafonds spéciaux parent isolé, ancien combattant, invalidité, etc. ne sont pas automatisés. */
  hasSpecialHalfShare?: boolean;
}

export interface ProgressiveIncomeTaxResult {
  taxableIncome: number;
  parts: number;
  incomePerPart: number;
  marginalRate: number;
  taxBeforeQuotientCap: number;
  taxAtBaseParts: number;
  ordinaryQuotientAdvantage: number;
  ordinaryQuotientCap: number;
  grossTaxAfterQuotientCap: number;
  decote: number;
  netIncomeTax: number;
  flags: ReviewFlag[];
  trace: RuleTrace;
}

function marginalRateForPerPartIncome(income: number): number {
  const bracket = IR_2026_BRACKETS.find((item) => income <= item.upTo);
  return bracket?.rate ?? 0.45;
}

export function computeProgressiveIncomeTax2026(
  input: ProgressiveIncomeTaxInput,
): ProgressiveIncomeTaxResult {
  const taxableIncome = nonNegative(input.taxableIncome, "revenu imposable");
  if (!Number.isFinite(input.parts) || input.parts <= 0) {
    throw new RangeError("Le nombre de parts doit être strictement positif.");
  }
  const baseParts = input.baseParts ?? (input.situation === "joint" ? 2 : 1);
  if (baseParts <= 0 || input.parts < baseParts) {
    throw new RangeError("Les parts totales doivent être supérieures ou égales aux parts de base.");
  }

  const incomePerPart = taxableIncome / input.parts;
  const taxBeforeQuotientCap = applyProgressiveScale(incomePerPart, IR_2026_BRACKETS) * input.parts;
  const taxAtBaseParts = applyProgressiveScale(taxableIncome / baseParts, IR_2026_BRACKETS) * baseParts;
  const extraHalfShares = Math.max(0, (input.parts - baseParts) * 2);
  const ordinaryQuotientCap = extraHalfShares * IR_2026_QUOTIENT_CAP_PER_HALF_SHARE;
  const ordinaryQuotientAdvantage = Math.max(0, taxAtBaseParts - taxBeforeQuotientCap);
  const applyCap = input.applyOrdinaryQuotientCap ?? true;
  const grossTaxAfterQuotientCap = applyCap
    ? Math.max(taxBeforeQuotientCap, taxAtBaseParts - ordinaryQuotientCap)
    : taxBeforeQuotientCap;

  const decoteRule = IR_2026_DECOTE[input.situation];
  const decote = Math.max(0, decoteRule.constant - decoteRule.rate * grossTaxAfterQuotientCap);
  const netIncomeTax = Math.max(0, grossTaxAfterQuotientCap - decote);

  const flags: ReviewFlag[] = [];
  if (input.hasSpecialHalfShare) {
    flags.push({
      code: "IR_SPECIAL_HALF_SHARE",
      severity: "review",
      message:
        "Le plafonnement spécial des demi-parts (parent isolé, invalidité, ancien combattant, etc.) doit être liquidé séparément.",
      legalRef: "CGI art. 197",
    });
  }
  flags.push({
    code: "IR_SCOPE",
    severity: "info",
    message:
      "Le moteur calcule le barème, le plafonnement ordinaire du quotient familial et la décote ; réductions, crédits, CEHR et CDHR sont séparés.",
    legalRef: "CGI art. 197",
  });

  return {
    taxableIncome: roundCent(taxableIncome),
    parts: input.parts,
    incomePerPart: roundCent(incomePerPart),
    marginalRate: marginalRateForPerPartIncome(incomePerPart),
    taxBeforeQuotientCap: roundCent(taxBeforeQuotientCap),
    taxAtBaseParts: roundCent(taxAtBaseParts),
    ordinaryQuotientAdvantage: roundCent(ordinaryQuotientAdvantage),
    ordinaryQuotientCap: roundCent(ordinaryQuotientCap),
    grossTaxAfterQuotientCap: roundCent(grossTaxAfterQuotientCap),
    decote: roundCent(decote),
    netIncomeTax: roundEuro(netIncomeTax),
    flags,
    trace: RULE_TRACES.ir2026,
  };
}

// -----------------------------------------------------------------------------
// 2. PFU / PRÉLÈVEMENTS SOCIAUX 2026
// CGI art. 200 A ; LFSS 2026 art. 12.
// Le taux global de 31,4 % ne doit PAS être appliqué indistinctement.
// -----------------------------------------------------------------------------

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

export interface PfuRateProfile {
  incomeTaxRate: number;
  socialLevyRate: number;
  defaultReview: boolean;
  note: string;
}

export const PFU_2026_RATE_PROFILES: Readonly<Record<FinancialIncomeKind, PfuRateProfile>> = {
  dividend: {
    incomeTaxRate: 0.128,
    socialLevyRate: 0.186,
    defaultReview: false,
    note: "PFU 31,4 % ; l'abattement de 40 % n'est applicable qu'en cas d'option globale au barème.",
  },
  interest: {
    incomeTaxRate: 0.128,
    socialLevyRate: 0.186,
    defaultReview: false,
    note: "PFU 31,4 % pour les produits de placement ordinaires.",
  },
  "securities-capital-gain": {
    incomeTaxRate: 0.128,
    socialLevyRate: 0.186,
    defaultReview: false,
    note: "PFU 31,4 % sur le gain net taxable, sous réserve des régimes particuliers.",
  },
  "private-crypto-gain": {
    incomeTaxRate: 0.128,
    socialLevyRate: 0.186,
    defaultReview: true,
    note: "Taux 31,4 % pour l'activité occasionnelle privée ; activité professionnelle à requalifier.",
  },
  "pea-before-five-years": {
    incomeTaxRate: 0.128,
    socialLevyRate: 0.186,
    defaultReview: true,
    note: "Retrait avant cinq ans : clôture/exceptions et date d'acquisition à contrôler.",
  },
  "pea-after-five-years": {
    incomeTaxRate: 0,
    socialLevyRate: 0.186,
    defaultReview: true,
    note: "Exonération d'IR après cinq ans ; prélèvements sociaux 18,6 % selon les règles 2026.",
  },
  "life-insurance": {
    incomeTaxRate: 0.128,
    socialLevyRate: 0.172,
    defaultReview: true,
    note:
      "Assurance-vie : prélèvements sociaux maintenus à 17,2 % dans le cas général ; taux IR 7,5 % ou 12,8 % et abattement annuel à qualifier.",
  },
  "legacy-cel-pel-pep": {
    incomeTaxRate: 0.128,
    socialLevyRate: 0.172,
    defaultReview: true,
    note: "Certains produits historiques conservent 17,2 % de prélèvements sociaux ; vérifier la date d'ouverture.",
  },
  "disability-savings-annuity": {
    incomeTaxRate: 0,
    socialLevyRate: 0.186,
    defaultReview: true,
    note: "Rente-survie / épargne handicap : traitement spécial à valider contrat par contrat.",
  },
};

export interface PfuInput {
  kind: FinancialIncomeKind;
  grossTaxableGain: number;
  /** Abattement uniquement pour la composante IR (ex. assurance-vie > 8 ans). */
  incomeTaxAllowance?: number;
  /** À fournir lorsque le taux légal dépend de l'ancienneté ou de l'encours du contrat. */
  incomeTaxRateOverride?: 0 | 0.075 | 0.128;
  socialLevyRateOverride?: 0.172 | 0.186;
}

export interface PfuResult {
  kind: FinancialIncomeKind;
  grossTaxableGain: number;
  incomeTaxBase: number;
  incomeTaxRate: number;
  incomeTax: number;
  socialLevyBase: number;
  socialLevyRate: number;
  socialLevies: number;
  totalTax: number;
  effectiveRate: number;
  flags: ReviewFlag[];
  trace: RuleTrace;
}

export function computePfu2026(input: PfuInput): PfuResult {
  const grossTaxableGain = nonNegative(input.grossTaxableGain, "gain brut taxable");
  const allowance = Math.min(
    grossTaxableGain,
    nonNegative(input.incomeTaxAllowance ?? 0, "abattement IR"),
  );
  const profile = PFU_2026_RATE_PROFILES[input.kind];
  const incomeTaxRate = input.incomeTaxRateOverride ?? profile.incomeTaxRate;
  const socialLevyRate = input.socialLevyRateOverride ?? profile.socialLevyRate;
  ratio(incomeTaxRate, "taux d'impôt sur le revenu");
  ratio(socialLevyRate, "taux de prélèvements sociaux");

  const incomeTaxBase = Math.max(0, grossTaxableGain - allowance);
  const incomeTax = incomeTaxBase * incomeTaxRate;
  // En régime courant, l'abattement d'IR n'efface pas la base des prélèvements sociaux.
  const socialLevies = grossTaxableGain * socialLevyRate;
  const totalTax = incomeTax + socialLevies;
  const flags: ReviewFlag[] = [];

  if (profile.defaultReview) {
    flags.push({
      code: "PFU_CATEGORY_REVIEW",
      severity: "review",
      message: profile.note,
      legalRef: "CGI art. 200 A ; LFSS 2026 art. 12",
    });
  }
  if (input.kind === "life-insurance" && input.incomeTaxRateOverride === undefined) {
    flags.push({
      code: "LIFE_INSURANCE_RATE_UNCONFIRMED",
      severity: "blocking",
      message:
        "Le moteur a retenu 12,8 % par défaut. Qualifier l'âge du contrat, la date des primes, l'encours et l'abattement de 4 600/9 200 € avant validation.",
      legalRef: "CGI art. 125-0 A",
    });
  }

  return {
    kind: input.kind,
    grossTaxableGain: roundCent(grossTaxableGain),
    incomeTaxBase: roundCent(incomeTaxBase),
    incomeTaxRate,
    incomeTax: roundCent(incomeTax),
    socialLevyBase: roundCent(grossTaxableGain),
    socialLevyRate,
    socialLevies: roundCent(socialLevies),
    totalTax: roundCent(totalTax),
    effectiveRate: grossTaxableGain === 0 ? 0 : roundRate(totalTax / grossTaxableGain),
    flags,
    trace: RULE_TRACES.pfu2026,
  };
}

export interface PfuVsProgressiveInput {
  kind: "dividend" | "interest" | "securities-capital-gain";
  grossTaxableGain: number;
  otherTaxableIncome: number;
  parts: number;
  situation: "single" | "joint";
  baseParts?: number;
}

export interface PfuVsProgressiveResult {
  pfu: PfuResult;
  progressiveIncrementalIncomeTax: number;
  progressiveSocialLevies: number;
  progressiveTotal: number;
  differenceProgressiveMinusPfu: number;
  lowerCurrentYearMethod: "pfu" | "progressive" | "equal";
  flags: ReviewFlag[];
}

export function comparePfuWithProgressiveScale2026(
  input: PfuVsProgressiveInput,
): PfuVsProgressiveResult {
  const gain = nonNegative(input.grossTaxableGain, "gain");
  const otherIncome = nonNegative(input.otherTaxableIncome, "autres revenus imposables");
  const pfu = computePfu2026({ kind: input.kind, grossTaxableGain: gain });
  const progressiveTaxableGain = input.kind === "dividend" ? gain * 0.6 : gain;
  const withoutGain = computeProgressiveIncomeTax2026({
    taxableIncome: otherIncome,
    parts: input.parts,
    situation: input.situation,
    baseParts: input.baseParts,
  });
  const withGain = computeProgressiveIncomeTax2026({
    taxableIncome: otherIncome + progressiveTaxableGain,
    parts: input.parts,
    situation: input.situation,
    baseParts: input.baseParts,
  });
  const progressiveIncrementalIncomeTax = Math.max(0, withGain.netIncomeTax - withoutGain.netIncomeTax);
  const progressiveSocialLevies = gain * PFU_2026_RATE_PROFILES[input.kind].socialLevyRate;
  const progressiveTotal = progressiveIncrementalIncomeTax + progressiveSocialLevies;
  const difference = progressiveTotal - pfu.totalTax;

  return {
    pfu,
    progressiveIncrementalIncomeTax: roundCent(progressiveIncrementalIncomeTax),
    progressiveSocialLevies: roundCent(progressiveSocialLevies),
    progressiveTotal: roundCent(progressiveTotal),
    differenceProgressiveMinusPfu: roundCent(difference),
    lowerCurrentYearMethod: Math.abs(difference) < 0.01 ? "equal" : difference < 0 ? "progressive" : "pfu",
    flags: [
      {
        code: "GLOBAL_OPTION_REQUIRED",
        severity: "review",
        message:
          "L'option pour le barème est globale pour les revenus mobiliers éligibles du foyer ; la décision ne doit pas être prise ligne par ligne.",
        legalRef: "CGI art. 200 A",
      },
      {
        code: "DEDUCTIBLE_CSG_TIMING",
        severity: "review",
        message:
          "La comparaison n'intègre pas l'effet temporel de la CSG déductible de 6,8 % ni les abattements historiques sur titres acquis avant 2018.",
        legalRef: "CGI art. 154 quinquies",
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// 3. CEHR ET CDHR 2026
// CGI art. 223 sexies et 224 ; BOI-IR-BASE-50-10-40 du 30 juin 2026.
// -----------------------------------------------------------------------------

export interface CehrInput {
  referenceIncome: number;
  situation: "single" | "joint";
}

export interface CehrResult {
  referenceIncome: number;
  contribution: number;
  breakdown: MoneyBreakdown[];
  flags: ReviewFlag[];
}

export function computeCehr(input: CehrInput): CehrResult {
  const rfr = nonNegative(input.referenceIncome, "revenu fiscal de référence CEHR");
  const first = input.situation === "joint" ? 500_000 : 250_000;
  const second = input.situation === "joint" ? 1_000_000 : 500_000;
  const base3 = Math.max(0, Math.min(rfr, second) - first);
  const base4 = Math.max(0, rfr - second);
  const tax3 = base3 * 0.03;
  const tax4 = base4 * 0.04;
  return {
    referenceIncome: roundCent(rfr),
    contribution: roundEuro(tax3 + tax4),
    breakdown: [
      { label: "Tranche à 3 %", amount: roundCent(tax3), legalRef: "CGI art. 223 sexies" },
      { label: "Tranche à 4 %", amount: roundCent(tax4), legalRef: "CGI art. 223 sexies" },
    ],
    flags: [
      {
        code: "CEHR_SMOOTHING_REVIEW",
        severity: "review",
        message: "Le mécanisme de lissage des revenus exceptionnels doit être contrôlé hors moteur simplifié.",
        legalRef: "CGI art. 223 sexies",
      },
    ],
  };
}

export interface CdhrInput {
  /** RREF CDHR déjà retraité selon CGI art. 224, et non le RFR brut copié de l'avis. */
  referenceIncome: number;
  situation: "single" | "joint";
  adjustedIncomeTax: number;
  cehr: number;
  otherInScopeIncomeLevies?: number;
  numberOfDependants?: number;
  /** Cocher seulement après traitement des revenus exceptionnels/non récurrents et des revenus hors champ. */
  referenceIncomeLegallyValidated: boolean;
}

export interface CdhrResult {
  applicable: boolean;
  threshold: number;
  phaseInUpperBound: number;
  minimumTaxTargetBeforeCredits: number;
  householdAllowance: number;
  dependantAllowance: number;
  inScopeTaxes: number;
  contribution: number;
  advanceDueDecember2026: number;
  flags: ReviewFlag[];
  trace: RuleTrace;
}

export function computeCdhr2026(input: CdhrInput): CdhrResult {
  const referenceIncome = nonNegative(input.referenceIncome, "RREF CDHR");
  const threshold = input.situation === "joint" ? 500_000 : 250_000;
  const phaseInUpperBound = input.situation === "joint" ? 660_000 : 330_000;
  const dependants = Math.max(0, Math.trunc(input.numberOfDependants ?? 0));
  const householdAllowance = input.situation === "joint" ? 12_500 : 0;
  const dependantAllowance = dependants * 1_500;
  const adjustedIncomeTax = nonNegative(input.adjustedIncomeTax, "IR ajusté");
  const cehr = nonNegative(input.cehr, "CEHR");
  const otherInScope = nonNegative(input.otherInScopeIncomeLevies ?? 0, "autres prélèvements dans le champ");
  const inScopeTaxes = adjustedIncomeTax + cehr + otherInScope;

  let minimumTaxTargetBeforeCredits = 0;
  if (referenceIncome > threshold) {
    const fullTarget = referenceIncome * 0.2;
    minimumTaxTargetBeforeCredits =
      referenceIncome <= phaseInUpperBound
        ? Math.min(fullTarget, (referenceIncome - threshold) * 0.825)
        : fullTarget;
  }

  const contribution = Math.max(
    0,
    minimumTaxTargetBeforeCredits - inScopeTaxes - householdAllowance - dependantAllowance,
  );
  const flags: ReviewFlag[] = [];
  if (!input.referenceIncomeLegallyValidated) {
    flags.push({
      code: "CDHR_RREF_NOT_VALIDATED",
      severity: "blocking",
      message:
        "Le RREF CDHR doit être reconstitué selon l'article 224 (revenus exceptionnels, abattements et prélèvements retenus) avant validation.",
      legalRef: "CGI art. 224 ; BOI-IR-BASE-50-10-40",
    });
  }
  flags.push({
    code: "CDHR_ADVANCE",
    severity: "review",
    message:
      "Pour 2026, un acompte de 95 % est à verser entre le 1er et le 15 décembre ; une insuffisance supérieure à la marge légale expose à majoration.",
    legalRef: "CGI art. 224 ; LF 2026",
  });

  return {
    applicable: referenceIncome > threshold,
    threshold,
    phaseInUpperBound,
    minimumTaxTargetBeforeCredits: roundCent(minimumTaxTargetBeforeCredits),
    householdAllowance,
    dependantAllowance,
    inScopeTaxes: roundCent(inScopeTaxes),
    contribution: roundEuro(contribution),
    advanceDueDecember2026: roundEuro(contribution * 0.95),
    flags,
    trace: RULE_TRACES.cdhr2026,
  };
}

// -----------------------------------------------------------------------------
// 4. IFI 2026
// CGI art. 964 à 983 : seuil, assiette, démembrement, dettes, barème, décote.
// -----------------------------------------------------------------------------

export const IFI_2026_ENTRY_THRESHOLD = 1_300_000;
export const IFI_2026_BRACKETS = [
  { upTo: 800_000, rate: 0 },
  { upTo: 1_300_000, rate: 0.005 },
  { upTo: 2_570_000, rate: 0.007 },
  { upTo: 5_000_000, rate: 0.01 },
  { upTo: 10_000_000, rate: 0.0125 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.015 },
] as const satisfies readonly ProgressiveBracket[];

export type IfiDismembermentRule =
  | "none"
  | "usufructuary-full-value"
  | "article-968-split";

export type IfiTaxpayerRight = "full-owner" | "usufructuary" | "bare-owner";

export interface IfiAsset {
  id: string;
  label: string;
  fairMarketValueAtJanuary1: number;
  ownershipFraction?: number;
  taxableRealEstateFraction?: number;
  directlyHeldPrincipalResidence?: boolean;
  heldThroughCompanyOrSci?: boolean;
  professionalAssetExempt?: boolean;
  taxpayerRight?: IfiTaxpayerRight;
  dismembermentRule?: IfiDismembermentRule;
  usufructuaryAgeAtJanuary1?: number;
}

export type IfiDebtRepaymentKind = "amortising" | "bullet-or-nonconstant" | "no-term";

export interface IfiDebt {
  id: string;
  label: string;
  linkedAssetId?: string;
  originalPrincipal: number;
  outstandingPrincipalAtJanuary1: number;
  repaymentKind: IfiDebtRepaymentKind;
  disbursementDate: string;
  contractualEndDate?: string;
  eligiblePurpose: boolean;
  borneByTaxpayer: boolean;
  documented: boolean;
  relatedPartyDebt?: boolean;
  nonTaxPurposeProven?: boolean;
}

export interface Article669Split {
  usufructRate: number;
  bareOwnershipRate: number;
}

export function getArticle669LifeUsufructSplit(age: number): Article669Split {
  if (!Number.isFinite(age) || age < 0) throw new RangeError("L'âge doit être positif ou nul.");
  const usufructRate =
    age < 21
      ? 0.9
      : age < 31
        ? 0.8
        : age < 41
          ? 0.7
          : age < 51
            ? 0.6
            : age < 61
              ? 0.5
              : age < 71
                ? 0.4
                : age < 81
                  ? 0.3
                  : age < 91
                    ? 0.2
                    : 0.1;
  return { usufructRate, bareOwnershipRate: 1 - usufructRate };
}

export interface IfiAssetComputation {
  id: string;
  label: string;
  grossOwnedValue: number;
  realEstateValue: number;
  rightAllocationRate: number;
  principalResidenceAbatement: number;
  taxableValue: number;
  flags: ReviewFlag[];
}

function computeIfiAsset(asset: IfiAsset): IfiAssetComputation {
  const value = nonNegative(asset.fairMarketValueAtJanuary1, `valeur de ${asset.label}`);
  const ownershipFraction = ratio(asset.ownershipFraction ?? 1, `quote-part de ${asset.label}`);
  const taxableRealEstateFraction = ratio(
    asset.taxableRealEstateFraction ?? 1,
    `fraction immobilière de ${asset.label}`,
  );
  const grossOwnedValue = value * ownershipFraction;
  let realEstateValue = grossOwnedValue * taxableRealEstateFraction;
  const flags: ReviewFlag[] = [];

  if (asset.professionalAssetExempt) {
    return {
      id: asset.id,
      label: asset.label,
      grossOwnedValue: roundCent(grossOwnedValue),
      realEstateValue: roundCent(realEstateValue),
      rightAllocationRate: 0,
      principalResidenceAbatement: 0,
      taxableValue: 0,
      flags: [
        {
          code: "IFI_PROFESSIONAL_EXEMPTION",
          severity: "review",
          message: "L'exonération d'actif professionnel doit être documentée chaque année.",
          legalRef: "CGI art. 975",
        },
      ],
    };
  }

  const taxpayerRight = asset.taxpayerRight ?? "full-owner";
  const dismembermentRule = asset.dismembermentRule ?? "none";
  let rightAllocationRate = 1;
  if (dismembermentRule === "usufructuary-full-value") {
    rightAllocationRate = taxpayerRight === "usufructuary" ? 1 : 0;
    flags.push({
      code: "IFI_USUFRUCT_FULL_VALUE",
      severity: "review",
      message:
        "Règle générale : l'usufruitier déclare la pleine valeur. Vérifier qu'aucune exception de l'article 968 ne s'applique.",
      legalRef: "CGI art. 968",
    });
  } else if (dismembermentRule === "article-968-split") {
    if (asset.usufructuaryAgeAtJanuary1 === undefined) {
      throw new RangeError(`L'âge de l'usufruitier est requis pour ${asset.label}.`);
    }
    const split = getArticle669LifeUsufructSplit(asset.usufructuaryAgeAtJanuary1);
    rightAllocationRate =
      taxpayerRight === "usufructuary"
        ? split.usufructRate
        : taxpayerRight === "bare-owner"
          ? split.bareOwnershipRate
          : 1;
    flags.push({
      code: "IFI_ARTICLE_968_EXCEPTION",
      severity: "blocking",
      message:
        "La ventilation article 669 n'est admise à l'IFI que dans les exceptions limitatives de l'article 968 ; conserver l'acte et le fondement légal.",
      legalRef: "CGI art. 968 et 669",
    });
  }
  realEstateValue *= rightAllocationRate;

  let principalResidenceAbatement = 0;
  if (asset.directlyHeldPrincipalResidence) {
    if (asset.heldThroughCompanyOrSci) {
      flags.push({
        code: "IFI_MAIN_RESIDENCE_SCI",
        severity: "blocking",
        message:
          "L'abattement de 30 % n'est pas appliqué automatiquement aux titres de SCI ; qualifier la détention et la jurisprudence applicable.",
        legalRef: "CGI art. 973",
      });
    } else {
      principalResidenceAbatement = realEstateValue * 0.3;
    }
  }

  return {
    id: asset.id,
    label: asset.label,
    grossOwnedValue: roundCent(grossOwnedValue),
    realEstateValue: roundCent(realEstateValue),
    rightAllocationRate,
    principalResidenceAbatement: roundCent(principalResidenceAbatement),
    taxableValue: roundCent(Math.max(0, realEstateValue - principalResidenceAbatement)),
    flags,
  };
}

export interface IfiDebtComputation {
  id: string;
  label: string;
  statutoryAmountBeforeAssetCap: number;
  deductibleAmount: number;
  flags: ReviewFlag[];
}

function statutoryIfiDebtAmount(debt: IfiDebt, valuationDate: string): number {
  const original = nonNegative(debt.originalPrincipal, `capital initial de ${debt.label}`);
  const outstanding = nonNegative(
    debt.outstandingPrincipalAtJanuary1,
    `capital restant dû de ${debt.label}`,
  );
  if (debt.repaymentKind === "amortising") return Math.min(original, outstanding);

  const elapsedYears = fullYearsBetween(debt.disbursementDate, valuationDate);
  if (debt.repaymentKind === "no-term") {
    return Math.max(0, original * (1 - elapsedYears / 20));
  }

  if (!debt.contractualEndDate) {
    throw new RangeError(`La date d'échéance est requise pour le prêt ${debt.label}.`);
  }
  const totalYears = Math.max(1, fullYearsBetween(debt.disbursementDate, debt.contractualEndDate));
  return Math.max(0, original * (1 - elapsedYears / totalYears));
}

export interface IfiCap75Input {
  priorYearWorldwideIncome: number;
  priorYearIncomeTaxesAndSocialContributions: number;
}

export interface IfiInput {
  valuationDate: string;
  assets: readonly IfiAsset[];
  debts: readonly IfiDebt[];
  /** Permet d'écarter le plafonnement dettes > 60 % si le motif non principalement fiscal est prouvé. */
  excessiveDebtNonTaxPurposeProven?: boolean;
  cap75?: IfiCap75Input;
}

export interface IfiResult {
  valuationDate: string;
  assets: IfiAssetComputation[];
  debts: IfiDebtComputation[];
  grossTaxableRealEstate: number;
  debtBeforeGlobalCap: number;
  debtAfterGlobalCap: number;
  debtCapReduction: number;
  netTaxableEstate: number;
  grossIfi: number;
  decote: number;
  ifiBefore75Cap: number;
  cap75Reduction: number;
  ifiDue: number;
  flags: ReviewFlag[];
  trace: RuleTrace;
}

export function computeIfi2026(input: IfiInput): IfiResult {
  parseDate(input.valuationDate, "date d'évaluation");
  const assetComputations = input.assets.map(computeIfiAsset);
  const grossTaxableRealEstate = assetComputations.reduce((sum, asset) => sum + asset.taxableValue, 0);
  const assetById = new Map(assetComputations.map((asset) => [asset.id, asset]));
  const flags: ReviewFlag[] = assetComputations.flatMap((asset) => asset.flags);

  const preliminaryDebtComputations = input.debts.map((debt): IfiDebtComputation => {
    const debtFlags: ReviewFlag[] = [];
    if (!debt.eligiblePurpose || !debt.borneByTaxpayer || !debt.documented) {
      debtFlags.push({
        code: "IFI_DEBT_INELIGIBLE",
        severity: "blocking",
        message: `${debt.label} n'est pas déduit : objet, charge effective ou justificatif insuffisant.`,
        legalRef: "CGI art. 974",
      });
      return {
        id: debt.id,
        label: debt.label,
        statutoryAmountBeforeAssetCap: 0,
        deductibleAmount: 0,
        flags: debtFlags,
      };
    }
    if (debt.relatedPartyDebt && !debt.nonTaxPurposeProven) {
      debtFlags.push({
        code: "IFI_RELATED_PARTY_DEBT",
        severity: "blocking",
        message: `${debt.label} est une dette liée non déduite faute de preuve du caractère normal/non principalement fiscal.`,
        legalRef: "CGI art. 974",
      });
      return {
        id: debt.id,
        label: debt.label,
        statutoryAmountBeforeAssetCap: 0,
        deductibleAmount: 0,
        flags: debtFlags,
      };
    }

    const statutory = statutoryIfiDebtAmount(debt, input.valuationDate);
    let deductible = statutory;
    if (debt.linkedAssetId) {
      const linkedAsset = assetById.get(debt.linkedAssetId);
      if (!linkedAsset) {
        debtFlags.push({
          code: "IFI_DEBT_ASSET_NOT_FOUND",
          severity: "blocking",
          message: `Actif lié introuvable pour ${debt.label}.`,
          legalRef: "CGI art. 974",
        });
        deductible = 0;
      } else if (linkedAsset.principalResidenceAbatement > 0) {
        // La dette de résidence principale ne peut produire une base négative au-delà de sa valeur taxable à 70 %.
        deductible = Math.min(deductible, linkedAsset.taxableValue);
        debtFlags.push({
          code: "IFI_MAIN_RESIDENCE_DEBT_CAP",
          severity: "info",
          message: "Dette plafonnée à la valeur taxable de la résidence principale après abattement de 30 %.",
          legalRef: "CGI art. 973 et 974",
        });
      }
    }

    return {
      id: debt.id,
      label: debt.label,
      statutoryAmountBeforeAssetCap: roundCent(statutory),
      deductibleAmount: roundCent(Math.max(0, deductible)),
      flags: debtFlags,
    };
  });
  flags.push(...preliminaryDebtComputations.flatMap((debt) => debt.flags));

  const debtBeforeGlobalCap = preliminaryDebtComputations.reduce(
    (sum, debt) => sum + debt.deductibleAmount,
    0,
  );
  const sixtyPercent = grossTaxableRealEstate * 0.6;
  let debtAfterGlobalCap = debtBeforeGlobalCap;
  if (
    grossTaxableRealEstate > 5_000_000 &&
    debtBeforeGlobalCap > sixtyPercent &&
    !input.excessiveDebtNonTaxPurposeProven
  ) {
    debtAfterGlobalCap = sixtyPercent + (debtBeforeGlobalCap - sixtyPercent) * 0.5;
    flags.push({
      code: "IFI_EXCESSIVE_DEBT_CAP",
      severity: "review",
      message:
        "Patrimoine taxable > 5 M€ et dettes > 60 % : seule la moitié de l'excédent est déduite, sauf preuve du caractère non principalement fiscal.",
      legalRef: "CGI art. 974, IV",
    });
  }
  debtAfterGlobalCap = Math.min(grossTaxableRealEstate, debtAfterGlobalCap);
  const netTaxableEstate = Math.max(0, grossTaxableRealEstate - debtAfterGlobalCap);

  let grossIfi = 0;
  let decote = 0;
  if (netTaxableEstate > IFI_2026_ENTRY_THRESHOLD) {
    grossIfi = applyProgressiveScale(netTaxableEstate, IFI_2026_BRACKETS);
    if (netTaxableEstate < 1_400_000) {
      decote = Math.max(0, 17_500 - netTaxableEstate * 0.0125);
    }
  }
  const ifiBefore75Cap = Math.max(0, grossIfi - decote);

  let cap75Reduction = 0;
  let ifiDue = ifiBefore75Cap;
  if (input.cap75) {
    const income = nonNegative(input.cap75.priorYearWorldwideIncome, "revenu mondial du plafonnement IFI");
    const otherTaxes = nonNegative(
      input.cap75.priorYearIncomeTaxesAndSocialContributions,
      "impôts du plafonnement IFI",
    );
    const maximumCombinedTaxes = income * 0.75;
    ifiDue = Math.max(0, Math.min(ifiBefore75Cap, maximumCombinedTaxes - otherTaxes));
    cap75Reduction = Math.max(0, ifiBefore75Cap - ifiDue);
    flags.push({
      code: "IFI_CAP_75_REVIEW",
      severity: "blocking",
      message:
        "Le plafonnement à 75 % dépend d'une définition légale précise des revenus et impôts mondiaux et de clauses anti-abus ; contrôler la liasse complète.",
      legalRef: "CGI art. 979",
    });
  }

  flags.push({
    code: "IFI_VALUATION",
    severity: "review",
    message:
      "La valeur vénale au 1er janvier, les décotes de minorité/illiquidité, la fraction immobilière des sociétés et les actifs professionnels doivent être justifiés.",
    legalRef: "CGI art. 965 à 975",
  });

  return {
    valuationDate: input.valuationDate,
    assets: assetComputations,
    debts: preliminaryDebtComputations,
    grossTaxableRealEstate: roundCent(grossTaxableRealEstate),
    debtBeforeGlobalCap: roundCent(debtBeforeGlobalCap),
    debtAfterGlobalCap: roundCent(debtAfterGlobalCap),
    debtCapReduction: roundCent(Math.max(0, debtBeforeGlobalCap - debtAfterGlobalCap)),
    netTaxableEstate: roundCent(netTaxableEstate),
    grossIfi: roundCent(grossIfi),
    decote: roundCent(decote),
    ifiBefore75Cap: roundEuro(ifiBefore75Cap),
    cap75Reduction: roundEuro(cap75Reduction),
    ifiDue: roundEuro(ifiDue),
    flags,
    trace: RULE_TRACES.ifi2026,
  };
}

// -----------------------------------------------------------------------------
// 5. PLUS-VALUE IMMOBILIÈRE DES PARTICULIERS 2026
// CGI art. 150 U à 150 VH ; surtaxe CGI art. 1609 nonies G.
// -----------------------------------------------------------------------------

export interface RealEstateHoldingAllowance {
  fullYearsHeld: number;
  incomeTaxAllowanceRate: number;
  socialLevyAllowanceRate: number;
}

export const REAL_ESTATE_HOLDING_ALLOWANCES_2026: readonly RealEstateHoldingAllowance[] =
  Array.from({ length: 31 }, (_, fullYearsHeld) => {
    let incomeTaxAllowanceRate = 0;
    let socialLevyAllowanceRate = 0;
    if (fullYearsHeld >= 6) {
      incomeTaxAllowanceRate =
        fullYearsHeld <= 21 ? (fullYearsHeld - 5) * 0.06 : 0.96 + (fullYearsHeld >= 22 ? 0.04 : 0);
      if (fullYearsHeld <= 21) {
        socialLevyAllowanceRate = (fullYearsHeld - 5) * 0.0165;
      } else if (fullYearsHeld === 22) {
        socialLevyAllowanceRate = 0.264 + 0.016;
      } else {
        socialLevyAllowanceRate = 0.28 + (fullYearsHeld - 22) * 0.09;
      }
    }
    return {
      fullYearsHeld,
      incomeTaxAllowanceRate: Math.min(1, roundRate(incomeTaxAllowanceRate)),
      socialLevyAllowanceRate: Math.min(1, roundRate(socialLevyAllowanceRate)),
    };
  });

export function getRealEstateHoldingAllowance(fullYearsHeld: number): RealEstateHoldingAllowance {
  if (!Number.isInteger(fullYearsHeld) || fullYearsHeld < 0) {
    throw new RangeError("La durée de détention doit être un nombre entier d'années révolues.");
  }
  if (fullYearsHeld >= 30) {
    return { fullYearsHeld, incomeTaxAllowanceRate: 1, socialLevyAllowanceRate: 1 };
  }
  return REAL_ESTATE_HOLDING_ALLOWANCES_2026[fullYearsHeld];
}

export interface MainResidenceExemptionInput {
  occupiedAsActualHabitualPrincipalResidenceAtSale: boolean;
  vacatedBeforeSale?: boolean;
  occupiedUntilPropertyWasPutOnMarket?: boolean;
  remainedVacantUntilSale?: boolean;
  notRentedAndNotLent?: boolean;
  activeAndNormalSaleEfforts?: boolean;
  monthsBetweenVacatingAndSale?: number;
  isImmediateAndNecessaryDependency?: boolean;
  dependencySoldAtSameTime?: boolean;
}

export type ExemptionAssessment = "eligible" | "not-eligible" | "professional-review";

export interface MainResidenceExemptionResult {
  assessment: ExemptionAssessment;
  reason: string;
  flags: ReviewFlag[];
}

export function assessMainResidenceExemption(
  input: MainResidenceExemptionInput,
): MainResidenceExemptionResult {
  if (input.isImmediateAndNecessaryDependency) {
    if (input.dependencySoldAtSameTime) {
      return {
        assessment: "eligible",
        reason: "Dépendance immédiate et nécessaire cédée simultanément avec la résidence principale.",
        flags: [
          {
            code: "MAIN_RESIDENCE_DEPENDENCY",
            severity: "review",
            message: "Vérifier le caractère immédiat et nécessaire ; un terrain à bâtir est en principe exclu.",
            legalRef: "CGI art. 150 U, II-3°",
          },
        ],
      };
    }
    return {
      assessment: "not-eligible",
      reason: "La dépendance n'est pas cédée simultanément avec la résidence principale.",
      flags: [],
    };
  }

  if (input.occupiedAsActualHabitualPrincipalResidenceAtSale) {
    return {
      assessment: "eligible",
      reason: "Le logement constitue la résidence principale effective et habituelle au jour de la cession.",
      flags: [],
    };
  }

  if (!input.vacatedBeforeSale) {
    return {
      assessment: "not-eligible",
      reason: "Le logement n'est pas la résidence principale au jour de la cession et aucune tolérance de délai n'est documentée.",
      flags: [],
    };
  }

  const protectiveConditions =
    input.occupiedUntilPropertyWasPutOnMarket === true &&
    input.remainedVacantUntilSale === true &&
    input.notRentedAndNotLent === true &&
    input.activeAndNormalSaleEfforts === true;
  if (!protectiveConditions) {
    return {
      assessment: "not-eligible",
      reason: "Une ou plusieurs conditions de la tolérance après déménagement ne sont pas établies.",
      flags: [],
    };
  }

  const months = nonNegative(input.monthsBetweenVacatingAndSale ?? 999, "délai de vente");
  if (months <= 12) {
    return {
      assessment: "eligible",
      reason: "Ancienne résidence principale restée vacante et vendue dans un délai normal n'excédant pas un an.",
      flags: [],
    };
  }
  return {
    assessment: "professional-review",
    reason:
      "Le délai excède un an. L'exonération peut rester défendable selon le marché, le prix, les diligences et les circonstances, mais ne doit pas être automatisée.",
    flags: [
      {
        code: "MAIN_RESIDENCE_DELAY_OVER_ONE_YEAR",
        severity: "blocking",
        message: "Constituer le dossier de commercialisation et faire valider la tolérance par le notaire/fiscaliste.",
        legalRef: "CGI art. 150 U, II-1° ; BOFiP RFPI-PVI-10-40-10",
      },
    ],
  };
}

export type CostMode = "actual" | "statutory-flat" | "none";

export interface RealEstateCapitalGainInput {
  salePrice: number;
  deductibleSellerCosts?: number;
  acquisitionPrice: number;
  acquisitionCostsMode?: CostMode;
  actualAcquisitionCosts?: number;
  worksCostsMode?: CostMode;
  actualEligibleWorks?: number;
  builtProperty: boolean;
  acquisitionDate: string;
  saleDate: string;
  isBuildingLand?: boolean;
  /** Le seuil de 15 000 € s'apprécie notamment par cédant et par quote-part : revue obligatoire. */
  salePricePerSellerShare?: number;
  mainResidence?: MainResidenceExemptionInput;
}

export interface RealEstateCapitalGainResult {
  fullYearsHeld: number;
  salePriceNet: number;
  acquisitionCostsIncrease: number;
  worksIncrease: number;
  adjustedAcquisitionPrice: number;
  grossCapitalGain: number;
  exemptionAssessment: ExemptionAssessment | "not-requested";
  incomeTaxAllowanceRate: number;
  socialLevyAllowanceRate: number;
  incomeTaxBase: number;
  socialLevyBase: number;
  incomeTax: number;
  socialLevies: number;
  highGainSurtax: number;
  totalTax: number;
  netAfterTaxGain: number;
  flags: ReviewFlag[];
  trace: RuleTrace;
}

export function computeHighRealEstateGainSurtax(
  taxableGainForIncomeTax: number,
  isBuildingLand = false,
): number {
  const gain = nonNegative(taxableGainForIncomeTax, "plus-value taxable à l'IR");
  if (isBuildingLand || gain <= 50_000) return 0;
  if (gain <= 60_000) return gain * 0.02 - (60_000 - gain) / 20;
  if (gain <= 100_000) return gain * 0.02;
  if (gain <= 110_000) return gain * 0.03 - (110_000 - gain) / 10;
  if (gain <= 150_000) return gain * 0.03;
  if (gain <= 160_000) return gain * 0.04 - (160_000 - gain) * 0.15;
  if (gain <= 200_000) return gain * 0.04;
  if (gain <= 210_000) return gain * 0.05 - (210_000 - gain) * 0.2;
  if (gain <= 250_000) return gain * 0.05;
  if (gain <= 260_000) return gain * 0.06 - (260_000 - gain) * 0.25;
  return gain * 0.06;
}

export function computeRealEstateCapitalGain2026(
  input: RealEstateCapitalGainInput,
): RealEstateCapitalGainResult {
  const salePrice = nonNegative(input.salePrice, "prix de cession");
  const sellerCosts = nonNegative(input.deductibleSellerCosts ?? 0, "frais de cession déductibles");
  const acquisitionPrice = nonNegative(input.acquisitionPrice, "prix d'acquisition");
  const fullYearsHeld = fullYearsBetween(input.acquisitionDate, input.saleDate);
  const flags: ReviewFlag[] = [];

  const acquisitionCostsMode = input.acquisitionCostsMode ?? "none";
  let acquisitionCostsIncrease = 0;
  if (acquisitionCostsMode === "statutory-flat") {
    acquisitionCostsIncrease = acquisitionPrice * 0.075;
  } else if (acquisitionCostsMode === "actual") {
    acquisitionCostsIncrease = nonNegative(input.actualAcquisitionCosts ?? 0, "frais d'acquisition réels");
  }

  const worksCostsMode = input.worksCostsMode ?? "none";
  let worksIncrease = 0;
  if (worksCostsMode === "statutory-flat") {
    if (!input.builtProperty || fullYearsHeld <= 5) {
      throw new RangeError("Le forfait travaux de 15 % exige un immeuble bâti détenu depuis plus de cinq ans.");
    }
    worksIncrease = acquisitionPrice * 0.15;
  } else if (worksCostsMode === "actual") {
    worksIncrease = nonNegative(input.actualEligibleWorks ?? 0, "travaux réels éligibles");
    flags.push({
      code: "PV_WORKS_EVIDENCE",
      severity: "review",
      message:
        "Vérifier factures d'entreprises, absence de double déduction et nature des travaux d'amélioration/construction/reconstruction/agrandissement.",
      legalRef: "CGI art. 150 VB",
    });
  }

  const salePriceNet = Math.max(0, salePrice - sellerCosts);
  const adjustedAcquisitionPrice = acquisitionPrice + acquisitionCostsIncrease + worksIncrease;
  const grossCapitalGain = Math.max(0, salePriceNet - adjustedAcquisitionPrice);

  let exemptionAssessment: ExemptionAssessment | "not-requested" = "not-requested";
  if (input.mainResidence) {
    const assessment = assessMainResidenceExemption(input.mainResidence);
    exemptionAssessment = assessment.assessment;
    flags.push(...assessment.flags);
    if (assessment.assessment === "eligible") {
      return {
        fullYearsHeld,
        salePriceNet: roundCent(salePriceNet),
        acquisitionCostsIncrease: roundCent(acquisitionCostsIncrease),
        worksIncrease: roundCent(worksIncrease),
        adjustedAcquisitionPrice: roundCent(adjustedAcquisitionPrice),
        grossCapitalGain: roundCent(grossCapitalGain),
        exemptionAssessment,
        incomeTaxAllowanceRate: 1,
        socialLevyAllowanceRate: 1,
        incomeTaxBase: 0,
        socialLevyBase: 0,
        incomeTax: 0,
        socialLevies: 0,
        highGainSurtax: 0,
        totalTax: 0,
        netAfterTaxGain: roundCent(grossCapitalGain),
        flags,
        trace: RULE_TRACES.pvImmo2026,
      };
    }
  }

  const sellerSharePrice = input.salePricePerSellerShare ?? salePrice;
  if (sellerSharePrice <= 15_000) {
    flags.push({
      code: "PV_SMALL_SALE_EXEMPTION",
      severity: "blocking",
      message:
        "Une exonération pour prix de cession n'excédant pas 15 000 € peut s'appliquer ; vérifier l'appréciation par cédant, quote-part et nature du droit.",
      legalRef: "CGI art. 150 U, II-6°",
    });
  }

  const allowance = getRealEstateHoldingAllowance(fullYearsHeld);
  const incomeTaxBase = grossCapitalGain * (1 - allowance.incomeTaxAllowanceRate);
  const socialLevyBase = grossCapitalGain * (1 - allowance.socialLevyAllowanceRate);
  const incomeTax = incomeTaxBase * 0.19;
  const socialLevies = socialLevyBase * 0.172;
  const highGainSurtax = computeHighRealEstateGainSurtax(
    incomeTaxBase,
    input.isBuildingLand ?? false,
  );
  const totalTax = incomeTax + socialLevies + highGainSurtax;

  flags.push(
    {
      code: "PV_OTHER_EXEMPTIONS",
      severity: "review",
      message:
        "Contrôler les autres exonérations possibles : première cession hors résidence principale avec remploi, non-résident, retraite/handicap, expropriation et durée de détention.",
      legalRef: "CGI art. 150 U",
    },
    {
      code: "TEMPORARY_USUFRUCT",
      severity: "blocking",
      message:
        "La première cession à titre onéreux d'un usufruit temporaire relève en principe du CGI art. 13, 5 et non de ce moteur de plus-value immobilière.",
      legalRef: "CGI art. 13, 5 ; CE 30 mars 2026, n° 502243",
    },
  );

  return {
    fullYearsHeld,
    salePriceNet: roundCent(salePriceNet),
    acquisitionCostsIncrease: roundCent(acquisitionCostsIncrease),
    worksIncrease: roundCent(worksIncrease),
    adjustedAcquisitionPrice: roundCent(adjustedAcquisitionPrice),
    grossCapitalGain: roundCent(grossCapitalGain),
    exemptionAssessment,
    incomeTaxAllowanceRate: allowance.incomeTaxAllowanceRate,
    socialLevyAllowanceRate: allowance.socialLevyAllowanceRate,
    incomeTaxBase: roundCent(incomeTaxBase),
    socialLevyBase: roundCent(socialLevyBase),
    incomeTax: roundCent(incomeTax),
    socialLevies: roundCent(socialLevies),
    highGainSurtax: roundCent(highGainSurtax),
    totalTax: roundEuro(totalTax),
    netAfterTaxGain: roundCent(grossCapitalGain - totalTax),
    flags,
    trace: RULE_TRACES.pvImmo2026,
  };
}

// -----------------------------------------------------------------------------
// 6. TRANSMISSION MULTI-LIENS ET PACTE DUTREIL 2026
// CGI art. 777, 779, 784, 787 B, 790, 796-0 bis et 796-0 ter ; LF 2026 art. 8.
// -----------------------------------------------------------------------------

export const DMTG_DIRECT_LINE_BRACKETS = [
  { upTo: 8_072, rate: 0.05 },
  { upTo: 12_109, rate: 0.1 },
  { upTo: 15_932, rate: 0.15 },
  { upTo: 552_324, rate: 0.2 },
  { upTo: 902_838, rate: 0.3 },
  { upTo: 1_805_677, rate: 0.4 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45 },
] as const satisfies readonly ProgressiveBracket[];

export const DMTG_2026_ALLOWANCES = {
  parentChild: 100_000,
  disabledBeneficiaryAdditional: 159_325,
  spouseOrPacsGift: 80_724,
  sibling: 15_932,
  nephewOrNiece: 7_967,
  genericInheritanceWhenNoOtherAllowance: 1_594,
  familyCashGift: 31_865,
} as const;

export const DMTG_SPOUSE_PACS_GIFT_BRACKETS = [
  { upTo: 8_072, rate: 0.05 },
  { upTo: 15_932, rate: 0.1 },
  { upTo: 31_865, rate: 0.15 },
  { upTo: 552_324, rate: 0.2 },
  { upTo: 902_838, rate: 0.3 },
  { upTo: 1_805_677, rate: 0.4 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45 },
] as const satisfies readonly ProgressiveBracket[];

export const DMTG_SIBLING_BRACKETS = [
  { upTo: 24_430, rate: 0.35 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.45 },
] as const satisfies readonly ProgressiveBracket[];

export type DmtgRelationship2026 =
  | "parent-child"
  | "spouse-or-pacs"
  | "sibling"
  | "nephew-or-niece"
  | "other-up-to-fourth-degree"
  | "beyond-fourth-or-non-relative";

export interface DmtgMultiRelationshipInput {
  transferKind: "gift" | "inheritance";
  relationship: DmtgRelationship2026;
  grossShare: number;
  priorAllowanceConsumedWithin15Years?: number;
  priorNetTaxableTransfersWithin15Years?: number;
  disabledBeneficiary?: boolean;
  /** Permet de traiter un abattement spécifique non couvert par la relation simplifiée. */
  allowanceOverride?: number;
  /** CGI art. 796-0 ter : exonération successorale entre frère/sœur, après validation de toutes les conditions. */
  siblingInheritanceExemptionValidated?: boolean;
}

export interface DmtgMultiRelationshipResult {
  transferKind: "gift" | "inheritance";
  relationship: DmtgRelationship2026;
  exempt: boolean;
  grossShare: number;
  statutoryAllowanceBeforePriorUse: number;
  availableAllowance: number;
  currentTaxableShare: number;
  taxBeforeSpecialReductions: number;
  flags: ReviewFlag[];
}

function dmtgDefaultAllowance2026(
  relationship: DmtgRelationship2026,
  transferKind: "gift" | "inheritance",
): number {
  if (relationship === "parent-child") return DMTG_2026_ALLOWANCES.parentChild;
  if (relationship === "spouse-or-pacs") {
    return transferKind === "gift" ? DMTG_2026_ALLOWANCES.spouseOrPacsGift : 0;
  }
  if (relationship === "sibling") return DMTG_2026_ALLOWANCES.sibling;
  if (relationship === "nephew-or-niece") return DMTG_2026_ALLOWANCES.nephewOrNiece;
  if (transferKind === "inheritance") {
    return DMTG_2026_ALLOWANCES.genericInheritanceWhenNoOtherAllowance;
  }
  return 0;
}

function dmtgTaxForRelationship2026(
  relationship: DmtgRelationship2026,
  taxableBase: number,
): number {
  if (relationship === "parent-child") {
    return applyProgressiveScale(taxableBase, DMTG_DIRECT_LINE_BRACKETS);
  }
  if (relationship === "spouse-or-pacs") {
    return applyProgressiveScale(taxableBase, DMTG_SPOUSE_PACS_GIFT_BRACKETS);
  }
  if (relationship === "sibling") {
    return applyProgressiveScale(taxableBase, DMTG_SIBLING_BRACKETS);
  }
  if (relationship === "nephew-or-niece" || relationship === "other-up-to-fourth-degree") {
    return taxableBase * 0.55;
  }
  return taxableBase * 0.6;
}

/**
 * Liquidation DMTG multi-liens volontairement prudente.
 * Les représentations, adoptions, successions internationales, legs particuliers
 * et exonérations conditionnelles doivent rester documentés.
 */
export function computeDmtgMultiRelationship2026(
  input: DmtgMultiRelationshipInput,
): DmtgMultiRelationshipResult {
  const grossShare = nonNegative(input.grossShare, "part brute transmise");
  const priorAllowanceConsumed = nonNegative(
    input.priorAllowanceConsumedWithin15Years ?? 0,
    "abattement antérieurement consommé",
  );
  const priorTaxable = nonNegative(
    input.priorNetTaxableTransfersWithin15Years ?? 0,
    "donations antérieures taxables",
  );
  const flags: ReviewFlag[] = [];

  if (input.relationship === "spouse-or-pacs" && input.transferKind === "inheritance") {
    return {
      transferKind: input.transferKind,
      relationship: input.relationship,
      exempt: true,
      grossShare: roundCent(grossShare),
      statutoryAllowanceBeforePriorUse: 0,
      availableAllowance: 0,
      currentTaxableShare: 0,
      taxBeforeSpecialReductions: 0,
      flags: [
        {
          code: "DMTG_SPOUSE_SUCCESSION_EXEMPT",
          severity: "info",
          message: "Le conjoint survivant et le partenaire de PACS sont exonérés de droits de succession.",
          legalRef: "CGI art. 796-0 bis",
        },
      ],
    };
  }

  if (
    input.relationship === "sibling" &&
    input.transferKind === "inheritance" &&
    input.siblingInheritanceExemptionValidated
  ) {
    return {
      transferKind: input.transferKind,
      relationship: input.relationship,
      exempt: true,
      grossShare: roundCent(grossShare),
      statutoryAllowanceBeforePriorUse: 0,
      availableAllowance: 0,
      currentTaxableShare: 0,
      taxBeforeSpecialReductions: 0,
      flags: [
        {
          code: "DMTG_SIBLING_SUCCESSION_EXEMPT",
          severity: "review",
          message:
            "Exonération entre frère et sœur appliquée après validation des conditions d'âge/invalidité, de situation familiale et de cohabitation continue.",
          legalRef: "CGI art. 796-0 ter",
        },
      ],
    };
  }

  const defaultAllowance = dmtgDefaultAllowance2026(input.relationship, input.transferKind);
  const statutoryAllowanceBeforePriorUse =
    (input.allowanceOverride ?? defaultAllowance) +
    (input.disabledBeneficiary ? DMTG_2026_ALLOWANCES.disabledBeneficiaryAdditional : 0);
  const availableAllowance = Math.max(0, statutoryAllowanceBeforePriorUse - priorAllowanceConsumed);
  const currentTaxableShare = Math.max(0, grossShare - availableAllowance);
  const cumulativeTax = dmtgTaxForRelationship2026(
    input.relationship,
    priorTaxable + currentTaxableShare,
  );
  const priorTax = dmtgTaxForRelationship2026(input.relationship, priorTaxable);
  const currentTax = Math.max(0, cumulativeTax - priorTax);

  if (input.relationship === "sibling" && input.transferKind === "inheritance") {
    flags.push({
      code: "DMTG_SIBLING_EXEMPTION_TO_CHECK",
      severity: "review",
      message:
        "Vérifier séparément l'exonération conditionnelle de l'article 796-0 ter avant de liquider le barème 35 %/45 %.",
      legalRef: "CGI art. 796-0 ter",
    });
  }
  if (
    input.relationship === "nephew-or-niece" ||
    input.relationship === "other-up-to-fourth-degree" ||
    input.relationship === "beyond-fourth-or-non-relative"
  ) {
    flags.push({
      code: "DMTG_RELATIONSHIP_PROOF",
      severity: "review",
      message:
        "Contrôler le degré de parenté, la représentation éventuelle, l'adoption et l'abattement réellement disponible avant validation.",
      legalRef: "CGI art. 777, 779 et 788",
    });
  }
  flags.push({
    code: "DMTG_PRIOR_TRANSFERS_MULTI_RELATIONSHIP",
    severity: "review",
    message:
      "Le rappel fiscal de quinze ans doit être reconstitué avec les actes antérieurs, l'abattement consommé et les tranches déjà utilisées.",
    legalRef: "CGI art. 784",
  });

  return {
    transferKind: input.transferKind,
    relationship: input.relationship,
    exempt: false,
    grossShare: roundCent(grossShare),
    statutoryAllowanceBeforePriorUse: roundCent(statutoryAllowanceBeforePriorUse),
    availableAllowance: roundCent(availableAllowance),
    currentTaxableShare: roundCent(currentTaxableShare),
    taxBeforeSpecialReductions: roundCent(currentTax),
    flags,
  };
}

export interface DirectLineDmtgInput {
  grossShare: number;
  priorAllowanceConsumedWithin15Years?: number;
  priorNetTaxableTransfersWithin15Years?: number;
  disabledBeneficiary?: boolean;
}

export interface DirectLineDmtgResult {
  grossShare: number;
  availableAllowance: number;
  currentTaxableShare: number;
  priorNetTaxableTransfersWithin15Years: number;
  taxBeforeAnySpecialReduction: number;
  flags: ReviewFlag[];
}

export function computeDirectLineDmtg2026(input: DirectLineDmtgInput): DirectLineDmtgResult {
  const grossShare = nonNegative(input.grossShare, "part brute transmise");
  const priorAllowanceConsumed = nonNegative(
    input.priorAllowanceConsumedWithin15Years ?? 0,
    "abattement antérieurement consommé",
  );
  const priorTaxable = nonNegative(
    input.priorNetTaxableTransfersWithin15Years ?? 0,
    "donations antérieures taxables",
  );
  const baseAllowance =
    DMTG_2026_ALLOWANCES.parentChild +
    (input.disabledBeneficiary ? DMTG_2026_ALLOWANCES.disabledBeneficiaryAdditional : 0);
  const availableAllowance = Math.max(0, baseAllowance - priorAllowanceConsumed);
  const currentTaxableShare = Math.max(0, grossShare - availableAllowance);

  // Le rappel fiscal consomme aussi les tranches du barème : impôt cumulé moins impôt déjà attaché
  // à la base taxable antérieure, et pas seulement réduction de l'abattement.
  const cumulativeTax = applyProgressiveScale(
    priorTaxable + currentTaxableShare,
    DMTG_DIRECT_LINE_BRACKETS,
  );
  const priorTax = applyProgressiveScale(priorTaxable, DMTG_DIRECT_LINE_BRACKETS);
  const currentTax = Math.max(0, cumulativeTax - priorTax);

  return {
    grossShare: roundCent(grossShare),
    availableAllowance: roundCent(availableAllowance),
    currentTaxableShare: roundCent(currentTaxableShare),
    priorNetTaxableTransfersWithin15Years: roundCent(priorTaxable),
    taxBeforeAnySpecialReduction: roundCent(currentTax),
    flags: [
      {
        code: "DMTG_PRIOR_GIFTS",
        severity: "review",
        message:
          "Le rappel fiscal sur quinze ans doit être rapproché des actes antérieurs, de l'abattement consommé et des tranches déjà utilisées.",
        legalRef: "CGI art. 784",
      },
    ],
  };
}

export interface HoldingAnimatriceEvidence {
  isHoldingCompany: boolean;
  groupPolicyActivelyLed?: boolean;
  subsidiariesControlled?: boolean;
  operationalSubsidiariesActivityProvenAtTaxableEvent?: boolean;
  internalServicesProvided?: boolean;
  contemporaneousEvidenceAvailable?: boolean;
  professionalValidationConfirmed?: boolean;
}

export interface DutreilInput {
  transmissionDate: string;
  transmissionKind: "gift" | "inheritance";
  companyFairMarketValue: number;
  /** Fraction de valeur liée à l'activité avant les exclusions LF 2026. */
  operatingValueBeforeLf2026Exclusions: number;
  /** Actifs listés à l'art. 787 B non exclusivement affectés pendant la période exigée. */
  excludedLuxuryAndResidentialValue: number;
  otherNonEligibleValue?: number;
  activityEligible: boolean;
  collectiveOrUnilateralCommitmentSatisfied: boolean;
  collectiveCommitmentYears?: number;
  ownershipThresholdSatisfied: boolean;
  managementConditionSatisfied: boolean;
  individualCommitmentYears: number;
  holdingAnimatrice: HoldingAnimatriceEvidence;
  numberOfBeneficiaries: number;
  donorAge?: number;
  fullOwnershipGift?: boolean;
  priorAllowanceConsumedPerBeneficiaryWithin15Years?: number;
  priorNetTaxableTransfersPerBeneficiaryWithin15Years?: number;
  disabledBeneficiary?: boolean;
}

export interface DutreilResult {
  eligibility: "eligible" | "not-eligible" | "professional-review";
  lf2026RegimeApplied: boolean;
  requiredIndividualCommitmentYears: 4 | 6;
  eligibleOperatingBase: number;
  exemptValueAt75Percent: number;
  taxableValueAfterDutreil: number;
  grossSharePerBeneficiary: number;
  dmtgBeforeArticle790PerBeneficiary: number;
  article790ReductionRate: number;
  dmtgDuePerBeneficiary: number;
  totalDmtgDue: number;
  taxWithoutDutreil: number;
  indicativeSavings: number;
  flags: ReviewFlag[];
  trace: RuleTrace;
}

function assessHoldingAnimatriceEvidence(evidence: HoldingAnimatriceEvidence): ExemptionAssessment {
  if (!evidence.isHoldingCompany) return "eligible";
  const materiallySupported =
    evidence.groupPolicyActivelyLed === true &&
    evidence.subsidiariesControlled === true &&
    evidence.operationalSubsidiariesActivityProvenAtTaxableEvent === true &&
    evidence.contemporaneousEvidenceAvailable === true;
  if (!materiallySupported) return "professional-review";
  return evidence.professionalValidationConfirmed ? "eligible" : "professional-review";
}

export function computeDutreilTransmission2026(input: DutreilInput): DutreilResult {
  const transmissionDate = parseDate(input.transmissionDate, "date de transmission");
  const lf2026RegimeApplied =
    transmissionDate >= parseDate("2026-02-21", "date d'entrée en vigueur LF 2026");
  const requiredIndividualCommitmentYears: 4 | 6 = lf2026RegimeApplied ? 6 : 4;
  const companyValue = nonNegative(input.companyFairMarketValue, "valeur de société");
  const operatingBeforeExclusions = Math.min(
    companyValue,
    nonNegative(
      input.operatingValueBeforeLf2026Exclusions,
      "valeur opérationnelle avant exclusions",
    ),
  );
  const excludedLuxury = nonNegative(
    input.excludedLuxuryAndResidentialValue,
    "actifs exclus LF 2026",
  );
  const otherNonEligible = nonNegative(input.otherNonEligibleValue ?? 0, "autres actifs non éligibles");
  const beneficiaries = Math.max(1, Math.trunc(input.numberOfBeneficiaries));
  const flags: ReviewFlag[] = [];

  const hardConditionsMet =
    input.activityEligible &&
    input.collectiveOrUnilateralCommitmentSatisfied &&
    (input.collectiveCommitmentYears ?? 2) >= 2 &&
    input.ownershipThresholdSatisfied &&
    input.managementConditionSatisfied &&
    input.individualCommitmentYears >= requiredIndividualCommitmentYears;
  const holdingAssessment = assessHoldingAnimatriceEvidence(input.holdingAnimatrice);

  let eligibility: DutreilResult["eligibility"] = "eligible";
  if (!hardConditionsMet) eligibility = "not-eligible";
  else if (holdingAssessment !== "eligible") eligibility = "professional-review";

  const lf2026ExcludedValue = lf2026RegimeApplied ? excludedLuxury : 0;
  const eligibleOperatingBaseCandidate = Math.max(
    0,
    Math.min(companyValue, operatingBeforeExclusions - lf2026ExcludedValue - otherNonEligible),
  );
  const eligibleOperatingBase = eligibility === "eligible" ? eligibleOperatingBaseCandidate : 0;
  const exemptValueAt75Percent = eligibleOperatingBase * 0.75;
  const taxableValueAfterDutreil = Math.max(0, companyValue - exemptValueAt75Percent);
  const grossSharePerBeneficiary = taxableValueAfterDutreil / beneficiaries;

  const dmtgPerBeneficiary = computeDirectLineDmtg2026({
    grossShare: grossSharePerBeneficiary,
    priorAllowanceConsumedWithin15Years:
      input.priorAllowanceConsumedPerBeneficiaryWithin15Years ?? 0,
    priorNetTaxableTransfersWithin15Years:
      input.priorNetTaxableTransfersPerBeneficiaryWithin15Years ?? 0,
    disabledBeneficiary: input.disabledBeneficiary,
  });

  // CORRECTION P0 DU DÉPÔT EXISTANT : il s'agit de l'article 790 (sans « I »).
  // Cette réduction est toujours en vigueur au 18/08/2026 et n'a pas été abrogée par la LF 2026.
  const article790Applicable =
    input.transmissionKind === "gift" &&
    input.fullOwnershipGift === true &&
    (input.donorAge ?? Number.POSITIVE_INFINITY) < 70 &&
    eligibility === "eligible";
  const article790ReductionRate = article790Applicable ? 0.5 : 0;
  const dmtgDuePerBeneficiary =
    dmtgPerBeneficiary.taxBeforeAnySpecialReduction * (1 - article790ReductionRate);
  const totalDmtgDue = dmtgDuePerBeneficiary * beneficiaries;

  const withoutDutreilPerBeneficiary = computeDirectLineDmtg2026({
    grossShare: companyValue / beneficiaries,
    priorAllowanceConsumedWithin15Years:
      input.priorAllowanceConsumedPerBeneficiaryWithin15Years ?? 0,
    priorNetTaxableTransfersWithin15Years:
      input.priorNetTaxableTransfersPerBeneficiaryWithin15Years ?? 0,
    disabledBeneficiary: input.disabledBeneficiary,
  }).taxBeforeAnySpecialReduction;
  const taxWithoutDutreil = withoutDutreilPerBeneficiary * beneficiaries;

  if (input.individualCommitmentYears < requiredIndividualCommitmentYears) {
    flags.push({
      code: lf2026RegimeApplied
        ? "DUTREIL_SIX_YEAR_COMMITMENT"
        : "DUTREIL_PRE_LF2026_FOUR_YEAR_COMMITMENT",
      severity: "blocking",
      message: lf2026RegimeApplied
        ? "Depuis le 21 février 2026, l'engagement individuel de conservation est de six ans."
        : "Pour une transmission antérieure au 21 février 2026, la version alors applicable exige quatre ans.",
      legalRef: lf2026RegimeApplied
        ? "CGI art. 787 B, c ; LF 2026 art. 8"
        : "CGI art. 787 B, c, version antérieure au 21 février 2026",
    });
  }
  if (excludedLuxury > 0) {
    flags.push({
      code: lf2026RegimeApplied
        ? "DUTREIL_LF2026_EXCLUDED_ASSETS"
        : "DUTREIL_PRE_LF2026_ASSET_QUALIFICATION",
      severity: "review",
      message: lf2026RegimeApplied
        ? "La fraction représentative d'actifs somptuaires/résidentiels non exclusivement opérationnels est exclue ; vérifier aussi les filiales contrôlées et la condition d'affectation sur trois ans."
        : "La liste d'exclusion LF 2026 n'est pas appliquée rétroactivement ; ces actifs restent à qualifier dans l'analyse de l'activité et de la valeur éligible selon le droit antérieur.",
      legalRef: lf2026RegimeApplied
        ? "CGI art. 787 B ; LF 2026 art. 8"
        : "CGI art. 787 B, version antérieure au 21 février 2026",
    });
  }
  if (input.holdingAnimatrice.isHoldingCompany) {
    flags.push({
      code: "DUTREIL_HOLDING_ANIMATRICE",
      severity: holdingAssessment === "eligible" ? "review" : "blocking",
      message:
        "Prouver l'animation effective, le contrôle et l'activité opérationnelle des filiales à la date du fait générateur ; une SCI non qualifiée opérationnelle fragilise le régime.",
      legalRef: "CGI art. 787 B ; Cass. com., 17 déc. 2025, n° 24-17.415",
    });
  }
  if (input.transmissionKind === "gift" && input.fullOwnershipGift && (input.donorAge ?? 100) < 70) {
    flags.push({
      code: "DUTREIL_ARTICLE_790_STILL_ACTIVE",
      severity: "info",
      message:
        "Réduction de 50 % des droits appliquée au titre de l'article 790 CGI ; ne pas la confondre avec l'ancien article 790 I.",
      legalRef: "CGI art. 790",
    });
  }
  if (eligibility !== "eligible") {
    flags.push({
      code: "DUTREIL_NOT_AUTO_APPLIED",
      severity: "blocking",
      message:
        "Par prudence, l'exonération de 75 % n'est pas appliquée tant que toutes les conditions et preuves ne sont pas validées.",
      legalRef: "CGI art. 787 B",
    });
  }

  return {
    eligibility,
    lf2026RegimeApplied,
    requiredIndividualCommitmentYears,
    eligibleOperatingBase: roundCent(eligibleOperatingBase),
    exemptValueAt75Percent: roundCent(exemptValueAt75Percent),
    taxableValueAfterDutreil: roundCent(taxableValueAfterDutreil),
    grossSharePerBeneficiary: roundCent(grossSharePerBeneficiary),
    dmtgBeforeArticle790PerBeneficiary: roundCent(
      dmtgPerBeneficiary.taxBeforeAnySpecialReduction,
    ),
    article790ReductionRate,
    dmtgDuePerBeneficiary: roundEuro(dmtgDuePerBeneficiary),
    totalDmtgDue: roundEuro(totalDmtgDue),
    taxWithoutDutreil: roundEuro(taxWithoutDutreil),
    indicativeSavings: roundEuro(Math.max(0, taxWithoutDutreil - totalDmtgDue)),
    flags: [...dmtgPerBeneficiary.flags, ...flags],
    trace: lf2026RegimeApplied ? RULE_TRACES.dutreil2026 : RULE_TRACES.dutreilPreLf2026,
  };
}

// -----------------------------------------------------------------------------
// 7. APPORT-CESSION — CGI ART. 150-0 B TER
// LF 2026 art. 11 : 70 % du produit dans les trois ans pour cessions depuis 21/02/2026.
// -----------------------------------------------------------------------------

export type ReinvestmentKind =
  | "operating-assets"
  | "eligible-operating-company-securities"
  | "eligible-fund-units"
  | "other";

export interface ApportCessionReinvestment {
  id: string;
  amount: number;
  investedOn: string;
  kind: ReinvestmentKind;
  statutoryEligibilityValidated: boolean;
  fiveYearHoldingStatus: "satisfied" | "pending" | "breached" | "not-applicable";
}

export interface ApportCessionInput {
  contributionDate: string;
  contributedSecuritiesDisposalDate: string;
  disposalProceeds: number;
  reinvestments: readonly ApportCessionReinvestment[];
  asOfDate: string;
  /** Le contrôle de la société bénéficiaire par l'apporteur est une condition de l'art. 150-0 B ter. */
  contributionControlConditionsValidated: boolean;
}

export interface ApportCessionResult {
  disposalWithinThreeYearsOfContribution: boolean;
  regime: "pre-2019" | "2019-to-2026-02-20" | "from-2026-02-21";
  requiredReinvestmentRate: number;
  reinvestmentDeadlineYears: number;
  reinvestmentDeadline: string;
  requiredReinvestmentAmount: number;
  eligibleReinvestedAmount: number;
  eligibleReinvestmentRate: number;
  status:
    | "outside-three-year-window"
    | "maintained"
    | "maintained-under-review"
    | "pending"
    | "broken";
  flags: ReviewFlag[];
  trace: RuleTrace;
}

function getApportCessionRegime(disposalDate: string): {
  regime: ApportCessionResult["regime"];
  requiredRate: number;
  deadlineYears: number;
} {
  const disposal = parseDate(disposalDate, "date de cession");
  const start2019 = parseDate("2019-01-01", "date pivot");
  const start2026 = parseDate("2026-02-21", "date pivot");
  if (disposal >= start2026) {
    return { regime: "from-2026-02-21", requiredRate: 0.7, deadlineYears: 3 };
  }
  if (disposal >= start2019) {
    return { regime: "2019-to-2026-02-20", requiredRate: 0.6, deadlineYears: 2 };
  }
  // [À VÉRIFIER BOFIP] pour les très anciens faits générateurs et dispositions transitoires.
  return { regime: "pre-2019", requiredRate: 0.5, deadlineYears: 2 };
}

export function assessApportCession150OBTer2026(
  input: ApportCessionInput,
): ApportCessionResult {
  const contribution = parseDate(input.contributionDate, "date d'apport");
  const disposal = parseDate(input.contributedSecuritiesDisposalDate, "date de cession");
  const asOf = parseDate(input.asOfDate, "date d'analyse");
  if (disposal < contribution) throw new RangeError("La cession ne peut pas précéder l'apport.");
  const proceeds = nonNegative(input.disposalProceeds, "produit de cession");
  const contributionThirdAnniversary = parseDate(
    addYearsIso(input.contributionDate, 3),
    "troisième anniversaire",
  );
  const disposalWithinThreeYearsOfContribution = disposal <= contributionThirdAnniversary;
  const regime = getApportCessionRegime(input.contributedSecuritiesDisposalDate);
  const reinvestmentDeadline = addYearsIso(
    input.contributedSecuritiesDisposalDate,
    regime.deadlineYears,
  );
  const deadlineDate = parseDate(reinvestmentDeadline, "échéance de remploi");
  const requiredReinvestmentAmount = proceeds * regime.requiredRate;
  const flags: ReviewFlag[] = [];

  if (!disposalWithinThreeYearsOfContribution) {
    return {
      disposalWithinThreeYearsOfContribution,
      regime: regime.regime,
      requiredReinvestmentRate: regime.requiredRate,
      reinvestmentDeadlineYears: regime.deadlineYears,
      reinvestmentDeadline,
      requiredReinvestmentAmount: roundCent(requiredReinvestmentAmount),
      eligibleReinvestedAmount: 0,
      eligibleReinvestmentRate: 0,
      status: "outside-three-year-window",
      flags: [
        {
          code: "APPORT_CESSION_OTHER_END_EVENTS",
          severity: "review",
          message:
            "L'absence d'obligation de remploi liée à la cession après trois ans ne neutralise pas les autres événements mettant fin au report.",
          legalRef: "CGI art. 150-0 B ter",
        },
      ],
      trace: RULE_TRACES.apportCession2026,
    };
  }

  let eligibleReinvestedAmount = 0;
  let hasPendingHoldingCondition = false;
  for (const reinvestment of input.reinvestments) {
    const amount = nonNegative(reinvestment.amount, `remploi ${reinvestment.id}`);
    const investedOn = parseDate(reinvestment.investedOn, `date du remploi ${reinvestment.id}`);
    const withinDeadline = investedOn <= deadlineDate;
    const eligibleKind = reinvestment.kind !== "other" && reinvestment.statutoryEligibilityValidated;
    const holdingNotBreached = reinvestment.fiveYearHoldingStatus !== "breached";
    if (withinDeadline && eligibleKind && holdingNotBreached) {
      eligibleReinvestedAmount += amount;
      if (reinvestment.fiveYearHoldingStatus === "pending") hasPendingHoldingCondition = true;
    } else {
      flags.push({
        code: "APPORT_CESSION_REINVESTMENT_EXCLUDED",
        severity: "review",
        message: `Le remploi ${reinvestment.id} est exclu du montant validé : délai, activité, quota ou conservation à contrôler.`,
        legalRef: "CGI art. 150-0 B ter, I-2°",
      });
    }
  }

  const eligibleReinvestmentRate = proceeds === 0 ? 0 : eligibleReinvestedAmount / proceeds;
  const requiredReached = eligibleReinvestedAmount + 0.005 >= requiredReinvestmentAmount;
  let status: ApportCessionResult["status"];
  if (requiredReached) {
    status = hasPendingHoldingCondition ? "maintained-under-review" : "maintained";
  } else {
    status = asOf <= deadlineDate ? "pending" : "broken";
  }

  if (!input.contributionControlConditionsValidated) {
    flags.push({
      code: "APPORT_CESSION_CONTROL_NOT_VALIDATED",
      severity: "blocking",
      message:
        "Les conditions de contrôle de la société bénéficiaire et les autres conditions initiales du report ne sont pas validées.",
      legalRef: "CGI art. 150-0 B ter, III",
    });
  }
  if (regime.regime === "from-2026-02-21") {
    flags.push({
      code: "APPORT_CESSION_LF2026",
      severity: "info",
      message: "Régime LF 2026 appliqué : remploi d'au moins 70 % dans les trois ans de la cession.",
      legalRef: "CGI art. 150-0 B ter ; LF 2026 art. 11",
    });
  } else if (regime.regime === "pre-2019") {
    flags.push({
      code: "APPORT_CESSION_OLD_REGIME",
      severity: "blocking",
      message:
        "[À VÉRIFIER BOFIP] Les cessions antérieures à 2019 exigent une reconstitution des versions historiques et mesures transitoires.",
      legalRef: "CGI art. 150-0 B ter, versions historiques",
    });
  }
  flags.push({
    code: "APPORT_CESSION_ACTIVITY_MATRIX",
    severity: "blocking",
    message:
      "La qualification des activités éligibles, des souscriptions via fonds, des quotas et de la conservation cinq ans doit être validée sur pièces.",
    legalRef: "CGI art. 150-0 B ter ; CGI art. 199 terdecies-0 A",
  });

  return {
    disposalWithinThreeYearsOfContribution,
    regime: regime.regime,
    requiredReinvestmentRate: regime.requiredRate,
    reinvestmentDeadlineYears: regime.deadlineYears,
    reinvestmentDeadline,
    requiredReinvestmentAmount: roundCent(requiredReinvestmentAmount),
    eligibleReinvestedAmount: roundCent(eligibleReinvestedAmount),
    eligibleReinvestmentRate: roundRate(eligibleReinvestmentRate),
    status,
    flags,
    trace: RULE_TRACES.apportCession2026,
  };
}

// -----------------------------------------------------------------------------
// 8. TAXE SUR LES ACTIFS NON PROFESSIONNELS DES HOLDINGS PATRIMONIALES
// CGI art. 235 ter C ; due pour les exercices clos à compter du 31/12/2026.
// -----------------------------------------------------------------------------

export type HoldingTaxAssetKind =
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
  | "cash"
  | "financial-security"
  | "active-participation"
  | "work-of-art"
  | "other";

const HOLDING_TAX_CLOSED_LIST = new Set<HoldingTaxAssetKind>([
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

export interface HoldingTaxAsset {
  id: string;
  label: string;
  kind: HoldingTaxAssetKind;
  fairMarketValueAtClose: number;
  /** Proportion affectée à une activité opérationnelle pendant l'exercice, donc hors assiette. */
  operationalUseFraction?: number;
  /** Bijoux/métaux affectés à musée/monument ou exposés au public/salariés : hors assiette. */
  statutoryDisplayException?: boolean;
}

export interface HoldingTaxHousingDebt {
  id: string;
  linkedHousingAssetId: string;
  originalPrincipal: number;
  outstandingPrincipalAtClose: number;
  repaymentKind: IfiDebtRepaymentKind;
  disbursementDate: string;
  contractualEndDate?: string;
  relatedPartyDebt?: boolean;
  nonTaxPurposeProven?: boolean;
}

export interface HoldingTaxInput {
  exerciseCloseDate: string;
  entitySeat: "france" | "foreign";
  totalAssetsFairMarketValue: number;
  controlledAtLeast50PercentByNaturalPersonOrDeFacto: boolean;
  passiveIncome: number;
  operatingAndFinancialProducts: number;
  assets: readonly HoldingTaxAsset[];
  housingDebts?: readonly HoldingTaxHousingDebt[];
  /** Pour une société étrangère : fraction de participation du redevable français. */
  frenchIndividualParticipationFraction?: number;
  /** Justification que siège/détention étrangers n'ont pas pour but principal de contourner la taxe. */
  foreignStructureNonAvoidanceProven?: boolean;
}

export interface HoldingTaxAssetComputation {
  id: string;
  label: string;
  kind: HoldingTaxAssetKind;
  listedByArticle235TerC: boolean;
  valueAfterOperationalUseExclusion: number;
  deductibleHousingDebt: number;
  taxableValue: number;
  flags: ReviewFlag[];
}

export interface HoldingTaxResult {
  effectiveForExercise: boolean;
  assetThresholdMet: boolean;
  naturalPersonControlConditionMet: boolean;
  passiveIncomeRatio: number;
  passiveIncomeConditionMet: boolean;
  liable: boolean;
  domesticOrForeignBaseFraction: number;
  assets: HoldingTaxAssetComputation[];
  taxableBase: number;
  taxRate: number;
  taxDue: number;
  flags: ReviewFlag[];
  trace: RuleTrace;
}

function statutoryHoldingHousingDebtAmount(
  debt: HoldingTaxHousingDebt,
  exerciseCloseDate: string,
): number {
  const original = nonNegative(debt.originalPrincipal, `capital initial de ${debt.id}`);
  const outstanding = nonNegative(
    debt.outstandingPrincipalAtClose,
    `capital restant dû de ${debt.id}`,
  );
  if (debt.repaymentKind === "amortising") return Math.min(original, outstanding);
  const elapsedYears = fullYearsBetween(debt.disbursementDate, exerciseCloseDate);
  if (debt.repaymentKind === "no-term") {
    return Math.max(0, original * (1 - elapsedYears / 20));
  }
  if (!debt.contractualEndDate) throw new RangeError(`Échéance manquante pour ${debt.id}.`);
  const totalYears = Math.max(1, fullYearsBetween(debt.disbursementDate, debt.contractualEndDate));
  return Math.max(0, original * (1 - elapsedYears / totalYears));
}

export function computeHoldingPatrimonialTax2026(input: HoldingTaxInput): HoldingTaxResult {
  const closeDate = parseDate(input.exerciseCloseDate, "date de clôture");
  const firstEffectiveClose = parseDate("2026-12-31", "première clôture taxable");
  const effectiveForExercise = closeDate >= firstEffectiveClose;
  const totalAssets = nonNegative(input.totalAssetsFairMarketValue, "valeur totale des actifs");
  const assetThresholdMet = totalAssets >= 5_000_000;
  const passiveIncome = nonNegative(input.passiveIncome, "revenus passifs");
  const products = nonNegative(
    input.operatingAndFinancialProducts,
    "produits d'exploitation et financiers",
  );
  const passiveIncomeRatio = products === 0 ? (passiveIncome > 0 ? Number.POSITIVE_INFINITY : 0) : passiveIncome / products;
  const passiveIncomeConditionMet = passiveIncomeRatio > 0.5;
  const controlMet = input.controlledAtLeast50PercentByNaturalPersonOrDeFacto;
  const liable = effectiveForExercise && assetThresholdMet && controlMet && passiveIncomeConditionMet;
  const flags: ReviewFlag[] = [];

  const domesticOrForeignBaseFraction =
    input.entitySeat === "france"
      ? 1
      : ratio(
          input.frenchIndividualParticipationFraction ?? 0,
          "fraction de participation française",
        );

  const rawAssetComputations = input.assets.map((asset): HoldingTaxAssetComputation => {
    const assetFlags: ReviewFlag[] = [];
    const value = nonNegative(asset.fairMarketValueAtClose, `valeur de ${asset.label}`);
    const operationalUseFraction = ratio(
      asset.operationalUseFraction ?? 0,
      `fraction opérationnelle de ${asset.label}`,
    );
    let listedByArticle235TerC = HOLDING_TAX_CLOSED_LIST.has(asset.kind);
    if (asset.kind === "jewelry-or-precious-metal" && asset.statutoryDisplayException) {
      listedByArticle235TerC = false;
      assetFlags.push({
        code: "HOLDING_TAX_JEWELRY_DISPLAY_EXCEPTION",
        severity: "review",
        message: "Exception musée/monument/exposition à documenter.",
        legalRef: "CGI art. 235 ter C, II-A-4°",
      });
    }
    if (!listedByArticle235TerC) {
      return {
        id: asset.id,
        label: asset.label,
        kind: asset.kind,
        listedByArticle235TerC,
        valueAfterOperationalUseExclusion: 0,
        deductibleHousingDebt: 0,
        taxableValue: 0,
        flags: assetFlags,
      };
    }
    const valueAfterOperationalUseExclusion = value * (1 - operationalUseFraction);
    if (operationalUseFraction > 0) {
      assetFlags.push({
        code: "HOLDING_TAX_OPERATIONAL_USE",
        severity: "review",
        message: "Conserver les preuves d'affectation opérationnelle pendant l'exercice.",
        legalRef: "CGI art. 235 ter C, II-A",
      });
    }
    return {
      id: asset.id,
      label: asset.label,
      kind: asset.kind,
      listedByArticle235TerC,
      valueAfterOperationalUseExclusion: roundCent(valueAfterOperationalUseExclusion),
      deductibleHousingDebt: 0,
      taxableValue: roundCent(valueAfterOperationalUseExclusion),
      flags: assetFlags,
    };
  });

  const housingDebtByAsset = new Map<string, number>();
  for (const debt of input.housingDebts ?? []) {
    const linkedAsset = rawAssetComputations.find(
      (asset) => asset.id === debt.linkedHousingAssetId && asset.kind === "owner-use-housing",
    );
    if (!linkedAsset) {
      flags.push({
        code: "HOLDING_TAX_DEBT_NO_HOUSING",
        severity: "blocking",
        message: `La dette ${debt.id} n'est pas liée à un logement taxable identifié.`,
        legalRef: "CGI art. 235 ter C, II-A-7°",
      });
      continue;
    }
    if (debt.relatedPartyDebt && !debt.nonTaxPurposeProven) {
      flags.push({
        code: "HOLDING_TAX_RELATED_DEBT",
        severity: "blocking",
        message: `La dette liée ${debt.id} est exclue faute de preuve d'un objectif non principalement fiscal.`,
        legalRef: "CGI art. 235 ter C, II-A-7° d",
      });
      continue;
    }
    const statutory = statutoryHoldingHousingDebtAmount(debt, input.exerciseCloseDate);
    housingDebtByAsset.set(
      debt.linkedHousingAssetId,
      (housingDebtByAsset.get(debt.linkedHousingAssetId) ?? 0) + statutory,
    );
  }

  const assets = rawAssetComputations.map((asset) => {
    if (asset.kind !== "owner-use-housing" || asset.taxableValue <= 0) return asset;
    const debt = Math.min(asset.taxableValue, housingDebtByAsset.get(asset.id) ?? 0);
    return {
      ...asset,
      deductibleHousingDebt: roundCent(debt),
      taxableValue: roundCent(Math.max(0, asset.taxableValue - debt)),
    };
  });
  flags.push(...assets.flatMap((asset) => asset.flags));

  const fullBase = assets.reduce((sum, asset) => sum + asset.taxableValue, 0);
  const taxableBase = liable ? fullBase * domesticOrForeignBaseFraction : 0;
  const taxDue = taxableBase * 0.2;

  if (input.entitySeat === "foreign") {
    flags.push({
      code: "HOLDING_TAX_FOREIGN_ENTITY",
      severity: "blocking",
      message:
        "Pour une société étrangère, reconstituer la fraction des participations représentative des actifs taxables, le démembrement et la clause anti-contournement.",
      legalRef: "CGI art. 235 ter C, III-2 et X",
    });
    if (!input.foreignStructureNonAvoidanceProven) {
      flags.push({
        code: "HOLDING_TAX_FOREIGN_NON_AVOIDANCE",
        severity: "blocking",
        message: "La preuve d'absence de but principalement fiscal n'est pas fournie.",
        legalRef: "CGI art. 235 ter C, III-2",
      });
    }
  }
  flags.push(
    {
      code: "HOLDING_TAX_CLOSED_LIST",
      severity: "info",
      message:
        "La trésorerie, les titres financiers, les participations actives et les œuvres d'art ne sont pas ajoutés à l'assiette par analogie : seule la liste légale est calculée.",
      legalRef: "CGI art. 235 ter C, II-A",
    },
    {
      code: "HOLDING_TAX_FIRST_CAMPAIGN",
      severity: "review",
      message:
        "Première exigibilité pour les exercices clos à compter du 31 décembre 2026 ; préparer l'annexe détaillée et surveiller la doctrine à venir.",
      legalRef: "LF 2026 art. 7, II ; CGI art. 235 ter C, V",
    },
  );

  return {
    effectiveForExercise,
    assetThresholdMet,
    naturalPersonControlConditionMet: controlMet,
    passiveIncomeRatio: Number.isFinite(passiveIncomeRatio)
      ? roundRate(passiveIncomeRatio)
      : passiveIncomeRatio,
    passiveIncomeConditionMet,
    liable,
    domesticOrForeignBaseFraction,
    assets,
    taxableBase: roundCent(taxableBase),
    taxRate: 0.2,
    taxDue: roundEuro(taxDue),
    flags,
    trace: RULE_TRACES.holdingTax2026,
  };
}

// -----------------------------------------------------------------------------
// 9. GOLDEN CASES — NON-RÉGRESSION FISCALE
// Ces cas sont simples, publiables et réconciliables manuellement. Les dossiers complexes
// doivent ajouter leurs propres fixtures signées par le réviseur fiscal.
// -----------------------------------------------------------------------------

export interface GoldenCaseResult {
  id: string;
  description: string;
  expected: number | string | boolean;
  actual: number | string | boolean;
  tolerance: number;
  passed: boolean;
  legalRef: string;
}

interface GoldenCaseDefinition {
  id: string;
  description: string;
  expected: number | string | boolean;
  tolerance?: number;
  legalRef: string;
  compute: () => number | string | boolean;
}

export const FISCAL_GOLDEN_CASES_2026: readonly GoldenCaseDefinition[] = [
  {
    id: "IR-2026-SINGLE-32000",
    description: "Célibataire, revenu imposable 32 000 €, une part.",
    expected: 2_704,
    legalRef: "CGI art. 197",
    compute: () =>
      computeProgressiveIncomeTax2026({
        taxableIncome: 32_000,
        parts: 1,
        situation: "single",
      }).netIncomeTax,
  },
  {
    id: "IR-2026-JOINT-50000",
    description: "Couple, revenu imposable 50 000 €, deux parts, décote incluse.",
    expected: 2_799,
    legalRef: "CGI art. 197",
    compute: () =>
      computeProgressiveIncomeTax2026({
        taxableIncome: 50_000,
        parts: 2,
        situation: "joint",
      }).netIncomeTax,
  },
  {
    id: "PFU-2026-DIVIDEND-10000",
    description: "Dividendes 10 000 € au PFU 12,8 % + prélèvements sociaux 18,6 %.",
    expected: 3_140,
    legalRef: "CGI art. 200 A ; LFSS 2026 art. 12",
    compute: () => computePfu2026({ kind: "dividend", grossTaxableGain: 10_000 }).totalTax,
  },
  {
    id: "CEHR-SINGLE-600000",
    description: "Célibataire, RFR CEHR 600 000 €.",
    expected: 11_500,
    legalRef: "CGI art. 223 sexies",
    compute: () => computeCehr({ referenceIncome: 600_000, situation: "single" }).contribution,
  },
  {
    id: "CDHR-SINGLE-PHASE-IN-300000",
    description: "Célibataire, RREF 300 000 €, impôts dans le champ 20 000 €.",
    expected: 21_250,
    legalRef: "CGI art. 224",
    compute: () =>
      computeCdhr2026({
        referenceIncome: 300_000,
        situation: "single",
        adjustedIncomeTax: 20_000,
        cehr: 0,
        referenceIncomeLegallyValidated: true,
      }).contribution,
  },
  {
    id: "IFI-ENTRY-THRESHOLD-1300000",
    description: "Patrimoine net exactement égal à 1,3 M€ : hors IFI.",
    expected: 0,
    legalRef: "CGI art. 964",
    compute: () =>
      computeIfi2026({
        valuationDate: "2026-01-01",
        assets: [
          { id: "a", label: "Immeubles", fairMarketValueAtJanuary1: 1_300_000 },
        ],
        debts: [],
      }).ifiDue,
  },
  {
    id: "IFI-DECOTE-1310000",
    description: "Patrimoine net 1,31 M€ : barème 2 570 €, décote 1 125 €, IFI 1 445 €.",
    expected: 1_445,
    legalRef: "CGI art. 977",
    compute: () =>
      computeIfi2026({
        valuationDate: "2026-01-01",
        assets: [
          { id: "a", label: "Immeubles", fairMarketValueAtJanuary1: 1_310_000 },
        ],
        debts: [],
      }).ifiDue,
  },
  {
    id: "IFI-DEBT-CAP-6M-5M5",
    description: "Actifs 6 M€, dettes 5,5 M€ : dette admise 4,55 M€ sans preuve contraire.",
    expected: 4_550_000,
    legalRef: "CGI art. 974, IV",
    compute: () =>
      computeIfi2026({
        valuationDate: "2026-01-01",
        assets: [{ id: "a", label: "Immobilier", fairMarketValueAtJanuary1: 6_000_000 }],
        debts: [
          {
            id: "d",
            label: "Dette acquisition",
            originalPrincipal: 5_500_000,
            outstandingPrincipalAtJanuary1: 5_500_000,
            repaymentKind: "amortising",
            disbursementDate: "2025-01-01",
            eligiblePurpose: true,
            borneByTaxpayer: true,
            documented: true,
          },
        ],
      }).debtAfterGlobalCap,
  },
  {
    id: "PV-IMMO-15-YEARS",
    description:
      "Cession 500 k€, acquisition 300 k€, forfaits 7,5 % et 15 %, détention 15 ans.",
    expected: 29_810,
    legalRef: "CGI art. 150 VC, 150 VH et 1609 nonies G",
    compute: () =>
      computeRealEstateCapitalGain2026({
        salePrice: 500_000,
        acquisitionPrice: 300_000,
        acquisitionCostsMode: "statutory-flat",
        worksCostsMode: "statutory-flat",
        builtProperty: true,
        acquisitionDate: "2011-06-01",
        saleDate: "2026-06-02",
      }).totalTax,
  },
  {
    id: "PV-IMMO-MAIN-RESIDENCE",
    description: "Résidence principale effective au jour de la cession : exonération totale.",
    expected: 0,
    legalRef: "CGI art. 150 U, II-1°",
    compute: () =>
      computeRealEstateCapitalGain2026({
        salePrice: 500_000,
        acquisitionPrice: 300_000,
        builtProperty: true,
        acquisitionDate: "2020-01-01",
        saleDate: "2026-06-01",
        mainResidence: { occupiedAsActualHabitualPrincipalResidenceAtSale: true },
      }).totalTax,
  },
  {
    id: "DMTG-DIRECT-150000",
    description: "Part taxable en ligne directe de 150 000 € après abattement.",
    expected: 28_194.35,
    tolerance: 0.01,
    legalRef: "CGI art. 777",
    compute: () =>
      computeDirectLineDmtg2026({ grossShare: 250_000 }).taxBeforeAnySpecialReduction,
  },
  {
    id: "DMTG-SIBLING-50000",
    description: "Transmission de 50 000 € entre frère et sœur, hors exonération conditionnelle.",
    expected: 12_887.6,
    tolerance: 0.01,
    legalRef: "CGI art. 777 et 779",
    compute: () =>
      computeDmtgMultiRelationship2026({
        transferKind: "inheritance",
        relationship: "sibling",
        grossShare: 50_000,
        siblingInheritanceExemptionValidated: false,
      }).taxBeforeSpecialReductions,
  },
  {
    id: "DMTG-SPOUSE-INHERITANCE-EXEMPT",
    description: "Succession au conjoint/PACS : exonération totale.",
    expected: 0,
    legalRef: "CGI art. 796-0 bis",
    compute: () =>
      computeDmtgMultiRelationship2026({
        transferKind: "inheritance",
        relationship: "spouse-or-pacs",
        grossShare: 1_000_000,
      }).taxBeforeSpecialReductions,
  },
  {
    id: "DUTREIL-PRE-LF2026-FOUR-YEARS",
    description:
      "Transmission du 10 janvier 2026 : l'engagement individuel de quatre ans reste applicable.",
    expected: "eligible",
    legalRef: "CGI art. 787 B, version antérieure au 21 février 2026",
    compute: () =>
      computeDutreilTransmission2026({
        transmissionDate: "2026-01-10",
        transmissionKind: "inheritance",
        companyFairMarketValue: 400_000,
        operatingValueBeforeLf2026Exclusions: 400_000,
        excludedLuxuryAndResidentialValue: 0,
        activityEligible: true,
        collectiveOrUnilateralCommitmentSatisfied: true,
        collectiveCommitmentYears: 2,
        ownershipThresholdSatisfied: true,
        managementConditionSatisfied: true,
        individualCommitmentYears: 4,
        holdingAnimatrice: { isHoldingCompany: false },
        numberOfBeneficiaries: 1,
      }).eligibility,
  },
  {
    id: "DUTREIL-2026-ARTICLE-790",
    description:
      "Donation postérieure au 21/02/2026, société 1 M€, Dutreil validé, donateur 65 ans : réduction art. 790 maintenue.",
    expected: 14_097,
    legalRef: "CGI art. 787 B et 790",
    compute: () =>
      computeDutreilTransmission2026({
        transmissionDate: "2026-06-01",
        transmissionKind: "gift",
        companyFairMarketValue: 1_000_000,
        operatingValueBeforeLf2026Exclusions: 1_000_000,
        excludedLuxuryAndResidentialValue: 0,
        activityEligible: true,
        collectiveOrUnilateralCommitmentSatisfied: true,
        collectiveCommitmentYears: 2,
        ownershipThresholdSatisfied: true,
        managementConditionSatisfied: true,
        individualCommitmentYears: 6,
        holdingAnimatrice: { isHoldingCompany: false },
        numberOfBeneficiaries: 1,
        donorAge: 65,
        fullOwnershipGift: true,
      }).totalDmtgDue,
  },
  {
    id: "DUTREIL-ARTICLE-790-RATE-NON-REGRESSION",
    description: "La réduction de 50 % de l'article 790 reste active après février 2026.",
    expected: 0.5,
    tolerance: 0,
    legalRef: "CGI art. 790",
    compute: () =>
      computeDutreilTransmission2026({
        transmissionDate: "2026-08-18",
        transmissionKind: "gift",
        companyFairMarketValue: 1_000_000,
        operatingValueBeforeLf2026Exclusions: 1_000_000,
        excludedLuxuryAndResidentialValue: 0,
        activityEligible: true,
        collectiveOrUnilateralCommitmentSatisfied: true,
        collectiveCommitmentYears: 2,
        ownershipThresholdSatisfied: true,
        managementConditionSatisfied: true,
        individualCommitmentYears: 6,
        holdingAnimatrice: { isHoldingCompany: false },
        numberOfBeneficiaries: 1,
        donorAge: 65,
        fullOwnershipGift: true,
      }).article790ReductionRate,
  },
  {
    id: "APPORT-CESSION-70-PERCENT-PASS",
    description: "Cession 2026, remploi de 70 % sous trois ans : report maintenu.",
    expected: "maintained",
    legalRef: "CGI art. 150-0 B ter",
    compute: () =>
      assessApportCession150OBTer2026({
        contributionDate: "2025-01-10",
        contributedSecuritiesDisposalDate: "2026-03-01",
        disposalProceeds: 1_000_000,
        asOfDate: "2027-01-01",
        contributionControlConditionsValidated: true,
        reinvestments: [
          {
            id: "r1",
            amount: 700_000,
            investedOn: "2027-01-01",
            kind: "eligible-operating-company-securities",
            statutoryEligibilityValidated: true,
            fiveYearHoldingStatus: "satisfied",
          },
        ],
      }).status,
  },
  {
    id: "APPORT-CESSION-70-PERCENT-FAIL",
    description: "Cession 2026, remploi 699 999 € après échéance : report rompu.",
    expected: "broken",
    legalRef: "CGI art. 150-0 B ter",
    compute: () =>
      assessApportCession150OBTer2026({
        contributionDate: "2025-01-10",
        contributedSecuritiesDisposalDate: "2026-03-01",
        disposalProceeds: 1_000_000,
        asOfDate: "2029-03-02",
        contributionControlConditionsValidated: true,
        reinvestments: [
          {
            id: "r1",
            amount: 699_999,
            investedOn: "2027-01-01",
            kind: "eligible-operating-company-securities",
            statutoryEligibilityValidated: true,
            fiveYearHoldingStatus: "satisfied",
          },
        ],
      }).status,
  },
  {
    id: "HOLDING-TAX-2026-80000",
    description: "Holding 5 M€, logement de jouissance 500 k€ et dette admise 100 k€ : taxe 80 k€.",
    expected: 80_000,
    legalRef: "CGI art. 235 ter C",
    compute: () =>
      computeHoldingPatrimonialTax2026({
        exerciseCloseDate: "2026-12-31",
        entitySeat: "france",
        totalAssetsFairMarketValue: 5_000_000,
        controlledAtLeast50PercentByNaturalPersonOrDeFacto: true,
        passiveIncome: 60,
        operatingAndFinancialProducts: 100,
        assets: [
          { id: "cash", label: "Trésorerie", kind: "cash", fairMarketValueAtClose: 4_500_000 },
          {
            id: "home",
            label: "Logement de jouissance",
            kind: "owner-use-housing",
            fairMarketValueAtClose: 500_000,
          },
        ],
        housingDebts: [
          {
            id: "loan",
            linkedHousingAssetId: "home",
            originalPrincipal: 100_000,
            outstandingPrincipalAtClose: 100_000,
            repaymentKind: "amortising",
            disbursementDate: "2026-01-01",
          },
        ],
      }).taxDue,
  },
  {
    id: "HOLDING-TAX-BEFORE-FIRST-CLOSE",
    description: "Clôture le 30 décembre 2026 : taxe non encore due.",
    expected: 0,
    legalRef: "LF 2026 art. 7, II",
    compute: () =>
      computeHoldingPatrimonialTax2026({
        exerciseCloseDate: "2026-12-30",
        entitySeat: "france",
        totalAssetsFairMarketValue: 10_000_000,
        controlledAtLeast50PercentByNaturalPersonOrDeFacto: true,
        passiveIncome: 100,
        operatingAndFinancialProducts: 100,
        assets: [
          {
            id: "yacht",
            label: "Yacht",
            kind: "yacht-or-pleasure-boat",
            fairMarketValueAtClose: 1_000_000,
          },
        ],
      }).taxDue,
  },
] as const;

export function runFiscalGoldenCases2026(): GoldenCaseResult[] {
  return FISCAL_GOLDEN_CASES_2026.map((test) => {
    const actual = test.compute();
    const tolerance = test.tolerance ?? (typeof test.expected === "number" ? 0.01 : 0);
    const passed =
      typeof test.expected === "number" && typeof actual === "number"
        ? Math.abs(actual - test.expected) <= tolerance
        : actual === test.expected;
    return {
      id: test.id,
      description: test.description,
      expected: test.expected,
      actual,
      tolerance,
      passed,
      legalRef: test.legalRef,
    };
  });
}

export function assertAllFiscalGoldenCases2026(): void {
  const failures = runFiscalGoldenCases2026().filter((test) => !test.passed);
  if (failures.length > 0) {
    const details = failures
      .map((test) => `${test.id}: attendu ${String(test.expected)}, obtenu ${String(test.actual)}`)
      .join("\n");
    throw new Error(`Golden cases fiscaux en échec :\n${details}`);
  }
}
