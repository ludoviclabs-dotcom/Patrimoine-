/**
 * Helpers monétaires en centimes entiers.
 *
 * Les moteurs v3 (IR au barème, décote, PFU vs barème…) doivent reproduire des
 * exemples officiels au centime près (ex. IR 2026 célibataire 30 000 € → 2 103,99 €).
 * L'arithmétique flottante directe sur des euros introduit des écarts de centime ;
 * la convention v3 est donc : convertir en centimes entiers, calculer, puis arrondir.
 */

/** Convertit un montant en euros (potentiellement décimal) en centimes entiers. */
export function toCents(euros: number): number {
  return Math.round(euros * 100);
}

/** Convertit un montant en centimes entiers vers des euros décimaux exacts. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Arrondit un montant en euros à l'euro le plus proche (règle fiscale usuelle). */
export function roundEuros(euros: number): number {
  return Math.round(euros);
}

/** Arrondit un montant en euros au centime le plus proche. */
export function roundCents(euros: number): number {
  return Math.round(euros * 100) / 100;
}

/** Applique un taux à un montant en centimes, résultat en centimes entiers. */
export function applyRate(cents: number, rate: number): number {
  return Math.round(cents * rate);
}
