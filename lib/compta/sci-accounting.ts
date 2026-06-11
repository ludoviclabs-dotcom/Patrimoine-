import { computeIs } from "../tax/engines/is";
import type { SciAccountingSnapshot, TrialBalanceLine } from "../types";

/**
 * Classification comptable SCI → liasses indicatives.
 *
 * - comptes 70x : loyers ; 6x : charges (661 intérêts, 6811 dotations) ;
 *   28x : amortissements cumulés ; 455 : comptes courants d'associés ;
 * - 2072 (SCI à l'IR) : résultat foncier SANS amortissements ;
 * - 2065 (SCI à l'IS) : résultat APRÈS amortissements → barème is.ts ;
 * - flags à qualifier par l'expert-comptable : TVA (location nue exonérée sauf
 *   option), CRL 2,5 % (personnes morales IS, immeubles achevés ≥ 15 ans),
 *   CFE (location nue imposable au-delà de 100 000 € de recettes).
 * Sortie indicative : revue expert-comptable obligatoire avant tout dépôt.
 */

function sumWhere(
  lines: TrialBalanceLine[],
  predicate: (account: string) => boolean,
  side: "debit" | "credit" | "net-debit" | "net-credit",
) {
  return lines
    .filter((line) => predicate(line.account))
    .reduce((total, line) => {
      if (side === "debit") return total + line.debit;
      if (side === "credit") return total + line.credit;
      if (side === "net-debit") return total + line.debit - line.credit;
      return total + line.credit - line.debit;
    }, 0);
}

export function buildSciSnapshot(
  lines: TrialBalanceLine[],
  {
    caseId = "case-claire-marc-2026",
    fiscalYear = "2025",
    source = "pennylane-fixture" as SciAccountingSnapshot["source"],
    vatOptionExercised = false,
    buildingOlderThan15Years = true,
  } = {},
): SciAccountingSnapshot {
  const rentalIncome = sumWhere(lines, (account) => account.startsWith("70"), "net-credit");
  const depreciation = sumWhere(lines, (account) => account.startsWith("6811"), "net-debit");
  const loanInterest = sumWhere(lines, (account) => account.startsWith("661"), "net-debit");
  const deductibleCharges =
    sumWhere(lines, (account) => account.startsWith("6") && !account.startsWith("6811"), "net-debit");
  const partnerCurrentAccounts = sumWhere(
    lines,
    (account) => account.startsWith("455"),
    "net-credit",
  );

  // 2072 : résultat foncier IR (amortissements non déductibles).
  const rentalResultAtIr = Math.round(rentalIncome - deductibleCharges);
  // 2065 : résultat comptable/fiscal IS (amortissements déduits).
  const accountingResult = Math.round(rentalIncome - deductibleCharges - depreciation);
  const isResult = computeIs({ profit: accountingResult, turnover: rentalIncome });

  return {
    caseId,
    fiscalYear,
    source,
    rentalIncome: Math.round(rentalIncome),
    deductibleCharges: Math.round(deductibleCharges),
    loanInterest: Math.round(loanInterest),
    depreciation: Math.round(depreciation),
    partnerCurrentAccounts: Math.round(partnerCurrentAccounts),
    accountingResult,
    rentalResultAtIr,
    form2072Lines: [
      { code: "R1", label: "Recettes brutes (loyers)", amount: Math.round(rentalIncome) },
      {
        code: "R2",
        label: "Charges déductibles (hors intérêts)",
        amount: Math.round(deductibleCharges - loanInterest),
      },
      { code: "R3", label: "Intérêts d'emprunt", amount: Math.round(loanInterest) },
      { code: "R4", label: "Résultat foncier à répartir entre associés", amount: rentalResultAtIr },
    ],
    form2065: {
      taxableProfit: accountingResult,
      isAmount: isResult.totalIs,
      effectiveRatePercent: isResult.effectiveRatePercent,
    },
    flags: {
      vatOnRents: vatOptionExercised,
      crlDue: buildingOlderThan15Years,
      cfeDue: rentalIncome >= 100_000,
    },
    reviewRequired: true,
  };
}
