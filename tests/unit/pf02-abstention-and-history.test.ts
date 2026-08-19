import { describe, expect, it } from "vitest";
import { computeExitTaxSignal, EXIT_TAX_GAINS_THRESHOLD, EXIT_TAX_OWNERSHIP_THRESHOLD, EXIT_TAX_EXTENDED_RELIEF_THRESHOLD } from "../../lib/tax/engines/exit-tax";
import {
  computeIs,
  IS_REDUCED_CEILING,
  IS_REDUCED_TURNOVER_LIMIT,
  IS_SOCIAL_CONTRIBUTION_THRESHOLD,
} from "../../lib/tax/engines/is";
import {
  computePerCeiling2026,
  PASS_2025,
  PASS_2026,
  PER_DEDUCTION_AGE_LIMIT,
} from "../../lib/tax/engines/per";
import { computePvImmo } from "../../lib/tax/engines/pv-immo";
import { computePfuByCategory } from "../../lib/tax/investment-income-profiles";
import { resolveApportCessionRegime } from "../../lib/tax/apport-cession-regimes";
import { resolveEInvoicingTimeline } from "../../lib/simulations/e-invoicing";
import {
  simulateApportCessionV2,
  simulateHoldingTaxV2,
  simulatePerDeductionV2,
} from "../../lib/tax/v2-engines";

/**
 * PF-02 — invariants transversaux d'abstention et de reproductibilité
 * historique, plus la couverture golden P2 (exit tax, IS, PER).
 */

// --- Abstention -------------------------------------------------------------
// Une donnée opérative manquante, un fait de qualification absent ou un
// sous-régime non supporté ne doivent JAMAIS produire silencieusement une
// exonération, un taux par défaut, la règle courante ou un résultat confirmé.
describe("PF-02 — invariants d'abstention", () => {
  it("date opérative manquante (150-0 B ter) → aucun régime, aucun seuil, aucune exonération", () => {
    const run = simulateApportCessionV2();
    expect(run.computedResult?.regimeId).toBeNull();
    expect(run.computedResult?.reinvestmentMinimumRate).toBeNull();
    expect(run.computedResult?.requiredReinvestment).toBeNull();
    expect(run.computedResult?.undetermined).toBe(true);
    expect(run.computedResult?.compliant).toBe(false);
    // Surtout : le régime le plus récent n'est pas appliqué par défaut.
    expect(run.computedResult?.reinvestmentDeadlineMonths).not.toBe(36);
    expect(run.steps.every((step) => step.confidenceStatus === "needs_review")).toBe(true);
  });

  it("fait de qualification manquant (résidence principale) → jamais d'exonération", () => {
    const bare = computePvImmo({ isMainResidence: true });
    expect(bare.mainResidenceAssessment).toBe("needs_review");
    expect(bare.mainResidenceExempt).toBe(false);
    expect(bare.estimatedTax).toBeGreaterThan(0);
    // L'abattement n'est jamais porté à 100 % sans fait établi.
    expect(bare.incomeTaxAllowanceRate).toBeLessThan(1);
    expect(bare.socialAllowanceRate).toBeLessThan(1);
  });

  it("fraction d'affectation inconnue (taxe holding) → indéterminé, jamais présumée nulle", () => {
    const run = simulateHoldingTaxV2({
      assets: [
        {
          id: "asset-unknown-use",
          label: "Aéronef",
          kind: "aircraft",
          fairMarketValueAtClose: 1_000_000,
        },
      ],
    });
    expect(run.computedResult?.undetermined).toBe(true);
    expect(run.computedResult?.assetsNeedingReviewCount).toBe(1);
  });

  it("sous-régime non supporté (holding étrangère) → pas de calcul français généralisé", () => {
    const run = simulateHoldingTaxV2({ entitySeat: "foreign" });
    expect(run.computedResult?.foreignHoldingPathImplemented).toBe(false);
    expect(run.computedResult?.conditionsMet).toBe(false);
    expect(run.computedResult?.undetermined).toBe(true);
    expect(run.computedResult?.holdingTax).toBe(0);
  });

  it("taille d'entreprise inconnue (e-facturation) → qualification requise, pas de présomption", () => {
    const resolution = resolveEInvoicingTimeline({ companySize: "UNKNOWN", asOfDate: "2026-09-01" });
    expect(resolution.qualificationRequired).toBe(true);
    for (const event of resolution.events.filter((item) => item.companyCategory !== "ALL")) {
      expect(event.appliesToCompany).toBe(false);
      expect(event.qualificationRequired).toBe(true);
    }
  });

  it("aucun run fiscal ne se présente comme définitif sans revue professionnelle", () => {
    for (const run of [
      simulateApportCessionV2(),
      simulateHoldingTaxV2({ entitySeat: "foreign" }),
    ]) {
      expect(run.professionalValidationRequired).toBe(true);
      expect(run.status).toBe("needs_review");
    }
  });
});

// --- Reproductibilité historique -------------------------------------------
// Le but n'est pas de recalculer l'historique utilisateur, mais de garantir que
// le code sait sélectionner un régime antérieur à partir d'une date explicite.
describe("PF-02 — reproductibilité historique par date explicite", () => {
  it("PFU — pivot LFSS 2026 au 01/01/2026", () => {
    const before = computePfuByCategory({
      kind: "dividend",
      grossTaxableGain: 10_000,
      asOfDate: "2025-12-31",
    });
    const after = computePfuByCategory({
      kind: "dividend",
      grossTaxableGain: 10_000,
      asOfDate: "2026-01-01",
    });
    expect(before.socialLevyRate).toBe(0.172);
    expect(before.totalTax).toBe(3_000);
    expect(after.socialLevyRate).toBe(0.186);
    expect(after.totalTax).toBe(3_140);
  });

  it("150-0 B ter — pivot LF 2026 au 21/02/2026", () => {
    expect(resolveApportCessionRegime("2026-02-20").reinvestmentMinimumRate).toBe(0.6);
    expect(resolveApportCessionRegime("2026-02-20").reinvestmentDeadlineMonths).toBe(24);
    expect(resolveApportCessionRegime("2026-02-21").reinvestmentMinimumRate).toBe(0.7);
    expect(resolveApportCessionRegime("2026-02-21").reinvestmentDeadlineMonths).toBe(36);
  });

  it("taxe holding — première clôture taxable au 31/12/2026", () => {
    expect(
      simulateHoldingTaxV2({ exerciseCloseDate: "2026-12-30" }).computedResult
        ?.effectiveForExercise,
    ).toBe(false);
    expect(
      simulateHoldingTaxV2({ exerciseCloseDate: "2026-12-31" }).computedResult
        ?.effectiveForExercise,
    ).toBe(true);
  });

  it("facturation électronique — jalons 2026 et 2027 résolus par date", () => {
    const before = resolveEInvoicingTimeline({ companySize: "ETI", asOfDate: "2026-08-31" });
    expect(before.inForceEvents).toHaveLength(0);
    const after = resolveEInvoicingTimeline({ companySize: "ETI", asOfDate: "2026-09-01" });
    expect(after.upcomingEvents).toHaveLength(0);
    // Le jalon PME reste à venir en 2026 et bascule en 2027.
    expect(
      resolveEInvoicingTimeline({ companySize: "SME", asOfDate: "2026-09-01" }).upcomingEvents.length,
    ).toBe(2);
    expect(
      resolveEInvoicingTimeline({ companySize: "SME", asOfDate: "2027-09-01" }).upcomingEvents,
    ).toHaveLength(0);
  });
});

// --- Couverture golden P2 : exit tax, IS, PER ------------------------------
describe("PF-02 — couverture golden exit tax (frontières légales)", () => {
  const base = {
    ownershipPercent: 10,
    shareValue: 1_000_000,
    destinationInEea: true,
    yearsResidentInLastTen: 8,
  };

  it("seuil de plus-values latentes de 800 000 €", () => {
    expect(
      computeExitTaxSignal({ ...base, latentGains: EXIT_TAX_GAINS_THRESHOLD - 1 }).inScope,
    ).toBe(false);
    expect(computeExitTaxSignal({ ...base, latentGains: EXIT_TAX_GAINS_THRESHOLD }).inScope).toBe(
      true,
    );
  });

  it("seuil de détention de 50 % (critère alternatif)", () => {
    const lowGains = { ...base, latentGains: 100_000 };
    expect(
      computeExitTaxSignal({ ...lowGains, ownershipPercent: EXIT_TAX_OWNERSHIP_THRESHOLD - 0.01 })
        .inScope,
    ).toBe(false);
    expect(
      computeExitTaxSignal({ ...lowGains, ownershipPercent: EXIT_TAX_OWNERSHIP_THRESHOLD }).inScope,
    ).toBe(true);
  });

  it("condition de résidence : six des dix dernières années", () => {
    const inScopeGains = { ...base, latentGains: 900_000 };
    expect(computeExitTaxSignal({ ...inScopeGains, yearsResidentInLastTen: 5 }).inScope).toBe(false);
    expect(computeExitTaxSignal({ ...inScopeGains, yearsResidentInLastTen: 6 }).inScope).toBe(true);
  });

  it("dégrèvement : 2 ans, porté à 5 ans au-delà de 2,57 M€ de titres", () => {
    const inScopeGains = { ...base, latentGains: 900_000 };
    expect(
      computeExitTaxSignal({ ...inScopeGains, shareValue: EXIT_TAX_EXTENDED_RELIEF_THRESHOLD })
        .reliefYears,
    ).toBe(2);
    expect(
      computeExitTaxSignal({ ...inScopeGains, shareValue: EXIT_TAX_EXTENDED_RELIEF_THRESHOLD + 1 })
        .reliefYears,
    ).toBe(5);
  });

  it("hors champ → aucune taxe indicative chiffrée", () => {
    expect(
      computeExitTaxSignal({ ...base, latentGains: 100_000, ownershipPercent: 10 })
        .indicativeTaxAtPfu,
    ).toBe(0);
  });
});

describe("PF-02 — couverture golden IS (frontières légales)", () => {
  it("plafond du taux réduit à 42 500 € de bénéfice", () => {
    const atCeiling = computeIs({ profit: IS_REDUCED_CEILING, turnover: 1_000_000 });
    expect(atCeiling.taxAtStandardRate).toBe(0);
    const overCeiling = computeIs({ profit: IS_REDUCED_CEILING + 1_000, turnover: 1_000_000 });
    expect(overCeiling.taxAtStandardRate).toBeGreaterThan(0);
  });

  it("limite de chiffre d'affaires de 10 M€ pour le taux réduit", () => {
    expect(
      computeIs({ profit: 40_000, turnover: IS_REDUCED_TURNOVER_LIMIT }).reducedRateEligible,
    ).toBe(true);
    expect(
      computeIs({ profit: 40_000, turnover: IS_REDUCED_TURNOVER_LIMIT + 1 }).reducedRateEligible,
    ).toBe(false);
  });

  it("contribution sociale 3,3 % au-delà de 763 000 € d'IS", () => {
    const below = computeIs({ profit: 3_000_000, turnover: 50_000_000 });
    expect(below.grossIs).toBeLessThanOrEqual(IS_SOCIAL_CONTRIBUTION_THRESHOLD);
    expect(below.socialContribution).toBe(0);

    const above = computeIs({ profit: 4_000_000, turnover: 50_000_000 });
    expect(above.grossIs).toBeGreaterThan(IS_SOCIAL_CONTRIBUTION_THRESHOLD);
    expect(above.socialContribution).toBeGreaterThan(0);
  });
});

describe("PF-02 — couverture golden PER (frontières légales)", () => {
  it("plancher salarié : 10 % du PASS 2025", () => {
    const floor = Math.round(0.1 * PASS_2025);
    expect(computePerCeiling2026({ status: "salarie", professionalIncome: 0 }).ceiling).toBe(floor);
    // Un revenu très faible ne descend jamais sous le plancher.
    expect(
      computePerCeiling2026({ status: "salarie", professionalIncome: 1_000 }).ceiling,
    ).toBe(floor);
  });

  it("plancher TNS : 10 % du PASS 2026", () => {
    const floor = Math.round(0.1 * PASS_2026);
    expect(computePerCeiling2026({ status: "tns", professionalIncome: 0 }).ceiling).toBe(floor);
  });

  it("plafonds maximaux salarié et TNS", () => {
    // Au-delà du plafond, le montant ne progresse plus.
    const salarie = computePerCeiling2026({ status: "salarie", professionalIncome: 10_000_000 });
    expect(salarie.ceiling).toBe(37_680);
    const tns = computePerCeiling2026({ status: "tns", professionalIncome: 10_000_000 });
    expect(tns.ceiling).toBe(88_911);
  });

  it("blocage de la déduction à 70 ans", () => {
    const before = simulatePerDeductionV2({ age: PER_DEDUCTION_AGE_LIMIT - 1 });
    const atLimit = simulatePerDeductionV2({ age: PER_DEDUCTION_AGE_LIMIT });
    expect(before.computedResult?.ageBlocked).toBe(false);
    expect(atLimit.computedResult?.ageBlocked).toBe(true);
    // Le blocage annule effectivement la déduction retenue et l'économie d'impôt.
    expect(Number(atLimit.computedResult?.taxSaving)).toBe(0);
    expect(Number(before.computedResult?.taxSaving)).toBeGreaterThan(0);
  });
});
