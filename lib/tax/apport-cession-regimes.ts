/**
 * Régimes successifs de l'apport-cession — CGI art. 150-0 B ter.
 * Correction P0 TAX-P0-003.
 *
 * Le régime applicable se détermine par la **date de cession des titres
 * apportés**, et non par la date de l'apport ni par l'année d'exécution du
 * logiciel. La LF 2026 (loi n° 2026-103 du 19 février 2026, art. 11) s'applique
 * aux cessions réalisées à compter du lendemain de la publication de la loi,
 * soit le **21 février 2026**.
 *
 * Sources :
 * - référentiel approuvé `REGLEMENTATION_AOUT_2026.md` § 8.1 et § 8.2
 *   (versionnement historique : 50 %/2 ans avant 2019, 60 %/2 ans du
 *   01/01/2019 au 20/02/2026, 70 %/3 ans à compter du 21/02/2026) ;
 * - CGI art. 150-0 B ter, version consolidée au 21 février 2026, contrôlée sur
 *   legifrance.gouv.fr : remploi d'au moins 70 % du produit dans les trois ans
 *   de la cession, conservation des biens ou titres pendant au moins cinq ans
 *   à compter de leur inscription à l'actif ;
 * - CGI art. 150-0 B ter, version antérieure, contrôlée sur legifrance.gouv.fr :
 *   remploi d'au moins 60 % dans les deux ans de la cession, conservation des
 *   biens ou titres pendant au moins douze mois à compter de leur inscription
 *   à l'actif.
 *
 * Le régime antérieur au 01/01/2019 reste marqué comme nécessitant une
 * vérification de source : le référentiel le signale `[À VÉRIFIER BOFIP]` et la
 * durée de conservation alors applicable n'est pas documentée. Le moteur ne
 * l'invente pas : il abstient le contrôle de conservation et exige une revue.
 */

/** Entrée en vigueur du régime LF 2026 (cessions réalisées à compter de cette date). */
export const APPORT_CESSION_LF2026_PIVOT_DATE = "2026-02-21";
/** Entrée en vigueur du régime 60 %/deux ans. */
export const APPORT_CESSION_2019_PIVOT_DATE = "2019-01-01";

export type ApportCessionRegimeId = "pre-2019" | "2019-to-2026-02-20" | "from-2026-02-21";

export type ApportCessionRegime = {
  regimeId: ApportCessionRegimeId;
  label: string;
  ruleVersionId: string;
  effectiveFrom: string;
  /** `null` pour le régime en vigueur. */
  effectiveTo: string | null;
  reinvestmentMinimumRate: number;
  reinvestmentDeadlineMonths: number;
  /**
   * Durée de conservation des biens/titres remployés.
   * `null` lorsque la version applicable n'est pas documentée par une source
   * officielle : le moteur s'abstient alors au lieu de supposer une durée.
   */
  minimumHoldingPeriodMonths: number | null;
  /** Le régime exige une vérification de source avant toute conclusion. */
  requiresSourceVerification: boolean;
  sourceRefs: string[];
};

const REGIMES: readonly ApportCessionRegime[] = [
  {
    regimeId: "from-2026-02-21",
    label: "Régime LF 2026 (cessions à compter du 21/02/2026)",
    ruleVersionId: "rule-apport-cession-2026-v3",
    effectiveFrom: APPORT_CESSION_LF2026_PIVOT_DATE,
    effectiveTo: null,
    reinvestmentMinimumRate: 0.7,
    reinvestmentDeadlineMonths: 36,
    minimumHoldingPeriodMonths: 60,
    requiresSourceVerification: false,
    sourceRefs: ["CGI art. 150-0 B ter, I-2°", "LF 2026 n° 2026-103 du 19/02/2026, art. 11"],
  },
  {
    regimeId: "2019-to-2026-02-20",
    label: "Régime antérieur (cessions du 01/01/2019 au 20/02/2026)",
    ruleVersionId: "rule-apport-cession-2019-v1",
    effectiveFrom: APPORT_CESSION_2019_PIVOT_DATE,
    effectiveTo: "2026-02-20",
    reinvestmentMinimumRate: 0.6,
    reinvestmentDeadlineMonths: 24,
    minimumHoldingPeriodMonths: 12,
    requiresSourceVerification: false,
    sourceRefs: ["CGI art. 150-0 B ter, I-2°, version antérieure au 21/02/2026"],
  },
  {
    regimeId: "pre-2019",
    label: "Régime historique (cessions antérieures au 01/01/2019)",
    ruleVersionId: "rule-apport-cession-pre-2019-v1",
    effectiveFrom: "1970-01-01",
    effectiveTo: "2018-12-31",
    reinvestmentMinimumRate: 0.5,
    reinvestmentDeadlineMonths: 24,
    // Durée de conservation non documentée par le référentiel pour cette période.
    minimumHoldingPeriodMonths: null,
    requiresSourceVerification: true,
    sourceRefs: ["CGI art. 150-0 B ter, versions historiques — [À VÉRIFIER BOFIP]"],
  },
];

/**
 * Résout le régime applicable à une cession donnée.
 * Comparaison lexicographique valide entre dates ISO `YYYY-MM-DD` de même
 * format : elle est ordonnée au jour près, contrairement à une comparaison
 * fondée sur la seule année.
 */
export function resolveApportCessionRegime(disposalDate: string): ApportCessionRegime {
  const regime = REGIMES.find(
    (candidate) =>
      disposalDate >= candidate.effectiveFrom &&
      (candidate.effectiveTo === null || disposalDate <= candidate.effectiveTo),
  );
  // Le dernier régime borne toute date antérieure ; le fallback ne sert qu'à
  // satisfaire le typage.
  return regime ?? REGIMES[REGIMES.length - 1];
}

export function listApportCessionRegimes(): readonly ApportCessionRegime[] {
  return REGIMES;
}
