import {
  calculateProgressiveTax,
  directLineDonationBrackets,
  type ProgressiveBracket,
} from "../engine-kit";

/**
 * Droits de mutation à titre gratuit (DMTG) — barèmes multi-liens art. 777 CGI.
 *
 * Barèmes et abattements vérifiés le 11/06/2026 sur service-public.gouv.fr
 * (fiche F14203) :
 * - ligne directe : tableau I (5 → 45 %), abattement 100 000 € (art. 779 I) ;
 * - petits-enfants : tableau I, abattement 31 865 € (art. 790 B) ;
 * - frères/sœurs : 35 % jusqu'à 24 430 €, 45 % au-delà (tableau III),
 *   abattement 15 932 € ;
 * - neveux/nièces : 55 %, abattement 7 967 € ;
 * - non-parents : 60 %, abattement 1 594 € ;
 * - conjoint/PACS : exonération en succession (loi TEPA) — la donation entre
 *   époux (tableau II, abattement 80 724 €) n'est pas automatisée (coverage).
 * - rappel fiscal des donations de moins de 15 ans (art. 784).
 *
 * Arrondi par tranche (perSliceRounding) : reproduit l'exemple officiel
 * 50 000 € en ligne directe → 404 + 404 + 573 + 6 814 = 8 195 €.
 */

export type DmtgRelationship =
  | "direct-line"
  | "grandchild"
  | "sibling"
  | "nephew-niece"
  | "spouse-pacs"
  | "non-relative";

export const DMTG_RELATIONSHIP_LABELS: Record<DmtgRelationship, string> = {
  "direct-line": "Ligne directe (enfant)",
  grandchild: "Petit-enfant",
  sibling: "Frère / sœur",
  "nephew-niece": "Neveu / nièce",
  "spouse-pacs": "Conjoint / PACS (succession)",
  "non-relative": "Non-parent",
};

const siblingBrackets: ProgressiveBracket[] = [
  { ceiling: 24_430, rate: 0.35 },
  { ceiling: Number.POSITIVE_INFINITY, rate: 0.45 },
];

const nephewBrackets: ProgressiveBracket[] = [{ ceiling: Number.POSITIVE_INFINITY, rate: 0.55 }];

const nonRelativeBrackets: ProgressiveBracket[] = [
  { ceiling: Number.POSITIVE_INFINITY, rate: 0.6 },
];

export const DMTG_BRACKETS: Record<DmtgRelationship, ProgressiveBracket[] | null> = {
  "direct-line": directLineDonationBrackets,
  grandchild: directLineDonationBrackets,
  sibling: siblingBrackets,
  "nephew-niece": nephewBrackets,
  "spouse-pacs": null, // exonération en succession
  "non-relative": nonRelativeBrackets,
};

export const DMTG_ALLOWANCES: Record<DmtgRelationship, number> = {
  "direct-line": 100_000,
  grandchild: 31_865,
  sibling: 15_932,
  "nephew-niece": 7_967,
  "spouse-pacs": Number.POSITIVE_INFINITY,
  "non-relative": 1_594,
};

/** Abattement disponible après rappel fiscal des donations < 15 ans (art. 784). */
export function getAvailableAllowance(
  relationship: DmtgRelationship,
  priorDonationsWithin15Years = 0,
) {
  const allowance = DMTG_ALLOWANCES[relationship];
  if (!Number.isFinite(allowance)) return allowance;
  return Math.max(0, allowance - Math.max(0, priorDonationsWithin15Years));
}

/** Droits sur une part taxable (après abattement), arrondi par tranche. */
export function computeDmtg({
  taxableAfterAllowance,
  relationship = "direct-line" as DmtgRelationship,
}: {
  taxableAfterAllowance: number;
  relationship?: DmtgRelationship;
}) {
  const brackets = DMTG_BRACKETS[relationship];
  if (!brackets || taxableAfterAllowance <= 0) {
    return { tax: 0, marginalRate: 0, exempt: brackets === null };
  }

  const tax = calculateProgressiveTax(taxableAfterAllowance, brackets, { perSliceRounding: true });
  const marginalRate =
    brackets.find((bracket) => taxableAfterAllowance <= bracket.ceiling)?.rate ??
    brackets[brackets.length - 1].rate;

  return { tax, marginalRate, exempt: false };
}

/** Chaîne complète : part brute → abattement disponible → droits. */
export function computeDmtgForShare({
  grossShare,
  relationship = "direct-line" as DmtgRelationship,
  priorDonationsWithin15Years = 0,
}: {
  grossShare: number;
  relationship?: DmtgRelationship;
  priorDonationsWithin15Years?: number;
}) {
  const availableAllowance = getAvailableAllowance(relationship, priorDonationsWithin15Years);
  const taxableShare = Number.isFinite(availableAllowance)
    ? Math.max(0, grossShare - availableAllowance)
    : 0;
  const { tax, marginalRate, exempt } = computeDmtg({
    taxableAfterAllowance: taxableShare,
    relationship,
  });

  return {
    grossShare,
    relationship,
    availableAllowance: Number.isFinite(availableAllowance) ? availableAllowance : -1,
    taxableShare,
    tax,
    marginalRate,
    exempt,
  };
}
