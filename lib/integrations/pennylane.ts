import type { TrialBalanceLine } from "../types";

/**
 * Intégration Pennylane — SIMULÉE, prête à brancher.
 *
 * La démo fonctionne sans variable d'environnement : `getPennylaneClient()`
 * renvoie toujours la fixture. Câblage réel documenté :
 * - API Pennylane v2 (https://pennylane.readme.io/) : OAuth2 client credentials,
 *   endpoints `GET /api/external/v2/trial_balance` et `/journal_entries` ;
 * - alternative : serveur MCP communautaire Pennylane ;
 * - implémenter `HttpPennylaneClient implements PennylaneClient` et basculer
 *   dans `getPennylaneClient()` sur présence de `PENNYLANE_API_TOKEN`
 *   (jamais lu en mode démo).
 */

export interface PennylaneClient {
  fetchTrialBalance(caseId: string): Promise<TrialBalanceLine[]>;
  fetchJournalSummary(
    caseId: string,
  ): Promise<Array<{ journal: string; entries: number; lastEntryDate: string }>>;
}

/** Balance SCI démo, cohérente avec les parts SCI du dossier Claire et Marc. */
export const demoSciTrialBalance: TrialBalanceLine[] = [
  { account: "213000", label: "Constructions", debit: 250_000, credit: 0 },
  { account: "281300", label: "Amortissements des constructions", debit: 0, credit: 31_250 },
  { account: "164000", label: "Emprunts auprès des établissements de crédit", debit: 0, credit: 180_000 },
  { account: "455000", label: "Comptes courants d'associés", debit: 0, credit: 25_000 },
  { account: "615200", label: "Entretien et réparations sur biens immobiliers", debit: 3_000, credit: 0 },
  { account: "616000", label: "Primes d'assurance", debit: 1_200, credit: 0 },
  { account: "622600", label: "Honoraires (gestion locative)", debit: 1_800, credit: 0 },
  { account: "635120", label: "Taxe foncière", debit: 2_000, credit: 0 },
  { account: "661100", label: "Intérêts des emprunts", debit: 4_500, credit: 0 },
  { account: "681100", label: "Dotations aux amortissements", debit: 6_250, credit: 0 },
  { account: "706000", label: "Loyers (location nue)", debit: 0, credit: 30_000 },
];

export class FixturePennylaneClient implements PennylaneClient {
  async fetchTrialBalance(): Promise<TrialBalanceLine[]> {
    return demoSciTrialBalance;
  }

  async fetchJournalSummary() {
    return [
      { journal: "VE (loyers)", entries: 12, lastEntryDate: "2025-12-31" },
      { journal: "BQ (banque)", entries: 48, lastEntryDate: "2025-12-31" },
      { journal: "OD (amortissements)", entries: 2, lastEntryDate: "2025-12-31" },
    ];
  }
}

export function getPennylaneClient(): PennylaneClient {
  // Démo : fixture systématique, aucun secret requis.
  return new FixturePennylaneClient();
}
