/**
 * Plafonds de déduction PER 2026 — vérifiés le 11/06/2026 (presse spécialisée
 * concordante : Generali, AGIPI, Groupama ES) :
 * - PASS 2025 : 47 100 € · PASS 2026 : 48 060 € ;
 * - salarié : 10 % des revenus professionnels N-1 (plafonnés à 8 PASS 2025),
 *   soit un maximum de 37 680 €, plancher 10 % du PASS 2025 (4 710 €) ;
 * - TNS : 10 % du bénéfice plafonné à 8 PASS 2026 + 15 % de la fraction
 *   comprise entre 1 et 8 PASS 2026, soit un maximum de 88 911 €, plancher
 *   10 % du PASS 2026 (4 806 €) ;
 * - report des plafonds non utilisés porté de 3 à 5 ans (LF 2026) ;
 * - les versements effectués à partir de 70 ans ne sont plus déductibles.
 */

export const PASS_2025 = 47_100;
export const PASS_2026 = 48_060;
export const PER_SALARIE_MAX_2026 = 37_680;
export const PER_TNS_MAX_2026 = 88_911;
export const PER_DEDUCTION_AGE_LIMIT = 70;
export const PER_CARRY_FORWARD_YEARS = 5;

export type PerStatus = "salarie" | "tns";

export function computePerCeiling2026({
  status,
  professionalIncome,
}: {
  status: PerStatus;
  professionalIncome: number;
}) {
  const income = Math.max(0, professionalIncome);

  if (status === "salarie") {
    const floor = Math.round(0.1 * PASS_2025);
    const ceiling = Math.max(floor, Math.min(Math.round(0.1 * income), PER_SALARIE_MAX_2026));
    return { status, ceiling, floor, max: PER_SALARIE_MAX_2026, cappedAtMax: ceiling === PER_SALARIE_MAX_2026 };
  }

  const floor = Math.round(0.1 * PASS_2026);
  const cappedIncome = Math.min(income, 8 * PASS_2026);
  const raw = Math.round(0.1 * cappedIncome + 0.15 * Math.max(0, cappedIncome - PASS_2026));
  const ceiling = Math.max(floor, Math.min(raw, PER_TNS_MAX_2026));
  return { status, ceiling, floor, max: PER_TNS_MAX_2026, cappedAtMax: ceiling === PER_TNS_MAX_2026 };
}
