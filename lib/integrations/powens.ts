import type { AggregatedAccount } from "../types";

/**
 * Agrégation bancaire Powens (DSP2) — SIMULÉE, prête à brancher.
 *
 * La démo fonctionne sans variable d'environnement : `getPowensClient()`
 * renvoie toujours la fixture. Câblage réel documenté :
 * - Powens (ex-Budget Insight) : webview de consentement DSP2/SCA, puis
 *   `GET /users/me/connections` et `/accounts` avec token utilisateur ;
 * - exigences : agrément AISP (ACPR), SCA (règlement délégué UE 2018/389),
 *   conservation du consentement 180 jours ;
 * - implémenter `HttpPowensClient implements PowensClient` et basculer dans
 *   `getPowensClient()` sur présence de `POWENS_CLIENT_ID` (jamais lu en démo).
 */

export type PowensConsent = {
  id: string;
  status: "active" | "expired";
  createdAt: string;
  expiresAt: string;
  scaMethod: "app-to-app" | "redirect";
};

export interface PowensClient {
  createConsent(caseId: string): Promise<PowensConsent>;
  listAccounts(consentId: string): Promise<AggregatedAccount[]>;
  syncBalances(consentId: string): Promise<{ syncedAt: string; accounts: number }>;
}

/** Comptes agrégés démo, alignés sur les liquidités et enveloppes du dossier. */
export const demoAggregatedAccounts: AggregatedAccount[] = [
  {
    id: "agg-compte-courant",
    provider: "powens-fixture",
    label: "Compte courant principal",
    type: "checking",
    iban: "FR76 3000 4000 0500 0001 2345 678",
    balance: 70_000,
    currency: "EUR",
    lastSyncedAt: "2026-06-10T22:00:00.000Z",
    consentStatus: "active",
  },
  {
    id: "agg-livret",
    provider: "powens-fixture",
    label: "Livrets et épargne de précaution",
    type: "savings",
    balance: 150_000,
    currency: "EUR",
    lastSyncedAt: "2026-06-10T22:00:00.000Z",
    consentStatus: "active",
  },
  {
    id: "agg-cto",
    provider: "powens-fixture",
    label: "Compte-titres ordinaire",
    type: "securities",
    balance: 480_000,
    currency: "EUR",
    lastSyncedAt: "2026-06-10T22:00:00.000Z",
    consentStatus: "active",
  },
  {
    id: "agg-assurance-vie",
    provider: "powens-fixture",
    label: "Assurance-vie multisupport",
    type: "life-insurance",
    balance: 350_000,
    currency: "EUR",
    lastSyncedAt: "2026-06-08T22:00:00.000Z",
    consentStatus: "expired",
  },
];

export class FixturePowensClient implements PowensClient {
  async createConsent(caseId: string): Promise<PowensConsent> {
    return {
      id: `consent-${caseId}-demo`,
      status: "active",
      createdAt: "2026-06-10T21:55:00.000Z",
      expiresAt: "2026-12-07T21:55:00.000Z",
      scaMethod: "redirect",
    };
  }

  async listAccounts(): Promise<AggregatedAccount[]> {
    return demoAggregatedAccounts;
  }

  async syncBalances() {
    return { syncedAt: "2026-06-10T22:00:00.000Z", accounts: demoAggregatedAccounts.length };
  }
}

export function getPowensClient(): PowensClient {
  // Démo : fixture systématique, aucun secret requis.
  return new FixturePowensClient();
}
