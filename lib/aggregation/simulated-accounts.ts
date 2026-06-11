import { demoAggregatedAccounts } from "../integrations/powens";
import type { AggregatedAccount, Asset } from "../types";

/**
 * Pont agrégation → patrimoine : transforme les comptes agrégés (simulés) en
 * actifs candidats du dossier, marqués `external_source` et jamais validés
 * automatiquement — le conseiller rapproche avec les actifs déclarés.
 */

const categoryByType: Record<AggregatedAccount["type"], Asset["category"]> = {
  checking: "liquidity",
  savings: "liquidity",
  securities: "financial",
  "life-insurance": "insurance",
};

const envelopeByType: Record<AggregatedAccount["type"], NonNullable<Asset["envelope"]>> = {
  checking: "liquidites",
  savings: "liquidites",
  securities: "cto",
  "life-insurance": "assurance-vie",
};

export function getSimulatedAccounts(): AggregatedAccount[] {
  return demoAggregatedAccounts;
}

export function mapToAssets(accounts: AggregatedAccount[] = demoAggregatedAccounts): Asset[] {
  return accounts.map((account) => ({
    id: `asset-${account.id}`,
    label: `${account.label} (agrégé)`,
    category: categoryByType[account.type],
    envelope: envelopeByType[account.type],
    value: account.balance,
    dataQuality: {
      status: "external_source",
      expectedAction:
        account.consentStatus === "expired"
          ? "Renouveler le consentement DSP2 avant de rapprocher ce solde."
          : "Rapprocher ce solde agrégé avec l'actif déclaré du dossier.",
      validationStatus: "not_started",
    },
  }));
}

/** Total agrégé par grande catégorie, pour le rapprochement conseiller. */
export function getAggregatedTotals(accounts: AggregatedAccount[] = demoAggregatedAccounts) {
  return accounts.reduce(
    (totals, account) => {
      const category = categoryByType[account.type];
      return { ...totals, [category]: (totals[category] ?? 0) + account.balance };
    },
    {} as Partial<Record<Asset["category"], number>>,
  );
}
