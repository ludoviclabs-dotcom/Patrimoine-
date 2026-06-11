import type { TrialBalanceLine } from "../types";

/**
 * Parseur FEC (fichier des écritures comptables, art. A47 A-1 LPF) — démo.
 * L'import est simulé : le contenu arrive sous forme de chaîne (fixture ou
 * collage), jamais d'upload réel. Séparateur tabulation ou pipe.
 */

export type FecEntry = {
  journalCode: string;
  ecritureDate: string;
  compteNum: string;
  compteLib: string;
  ecritureLib: string;
  debit: number;
  credit: number;
};

const FEC_COLUMNS = [
  "JournalCode",
  "EcritureDate",
  "CompteNum",
  "CompteLib",
  "EcritureLib",
  "Debit",
  "Credit",
] as const;

function parseAmount(raw: string | undefined) {
  if (!raw) return 0;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

export function parseFec(content: string): FecEntry[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const separator = lines[0].includes("\t") ? "\t" : "|";
  const header = lines[0].split(separator).map((cell) => cell.trim());
  const indexOf = Object.fromEntries(
    FEC_COLUMNS.map((column) => [column, header.indexOf(column)]),
  ) as Record<(typeof FEC_COLUMNS)[number], number>;

  if (indexOf.CompteNum < 0) return [];

  return lines.slice(1).map((line) => {
    const cells = line.split(separator).map((cell) => cell.trim());
    return {
      journalCode: cells[indexOf.JournalCode] ?? "",
      ecritureDate: cells[indexOf.EcritureDate] ?? "",
      compteNum: cells[indexOf.CompteNum] ?? "",
      compteLib: cells[indexOf.CompteLib] ?? "",
      ecritureLib: cells[indexOf.EcritureLib] ?? "",
      debit: parseAmount(cells[indexOf.Debit]),
      credit: parseAmount(cells[indexOf.Credit]),
    };
  });
}

export function trialBalanceFromFec(entries: FecEntry[]): TrialBalanceLine[] {
  const byAccount = new Map<string, TrialBalanceLine>();

  for (const entry of entries) {
    if (!entry.compteNum) continue;
    const existing = byAccount.get(entry.compteNum) ?? {
      account: entry.compteNum,
      label: entry.compteLib,
      debit: 0,
      credit: 0,
    };
    byAccount.set(entry.compteNum, {
      ...existing,
      label: existing.label || entry.compteLib,
      debit: existing.debit + entry.debit,
      credit: existing.credit + entry.credit,
    });
  }

  return Array.from(byAccount.values()).sort((a, b) => a.account.localeCompare(b.account));
}

/** Fixture FEC SCI, alignée sur la balance Pennylane démo. */
export const demoFecContent = [
  "JournalCode\tEcritureDate\tCompteNum\tCompteLib\tEcritureLib\tDebit\tCredit",
  "VE\t20251231\t706000\tLoyers (location nue)\tLoyers annuels\t0\t30000",
  "BQ\t20251231\t615200\tEntretien et réparations\tTravaux courants\t3000\t0",
  "BQ\t20251231\t616000\tPrimes d'assurance\tAssurance PNO\t1200\t0",
  "BQ\t20251231\t622600\tHonoraires\tGestion locative\t1800\t0",
  "BQ\t20251231\t635120\tTaxe foncière\tTaxe foncière 2025\t2000\t0",
  "BQ\t20251231\t661100\tIntérêts des emprunts\tÉchéances emprunt\t4500\t0",
  "OD\t20251231\t681100\tDotations aux amortissements\tDotation 2025\t6250\t0",
  "OD\t20251231\t281300\tAmortissements des constructions\tDotation 2025\t0\t6250",
  "OD\t20251231\t455000\tComptes courants d'associés\tApport associés\t0\t25000",
].join("\n");
