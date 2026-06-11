import { describe, expect, it } from "vitest";
import { getSimulationByParam } from "../../lib/cabinet-refonte/v2-6";
import { coverageLimits } from "../../lib/coverage/limits";
import { evidenceSources } from "../../lib/evidence/sources";
import { ruleVersions } from "../../lib/rules/rule-versions";
import { calculateIfi, calculateProgressiveIfi } from "../../lib/simulations/ifi";
import { computeExitTaxSignal, simulateExitTaxSignal } from "../../lib/tax/engines/exit-tax";
import { computeIs, simulateIs } from "../../lib/tax/engines/is";
import {
  computePerCeiling2026,
  PER_SALARIE_MAX_2026,
  PER_TNS_MAX_2026,
} from "../../lib/tax/engines/per";
import { computeSciIrVsIs, simulateSciIrVsIs } from "../../lib/tax/engines/sci-arbitrage";
import {
  simulateApportCessionV2,
  simulateHoldingTaxV2,
  simulatePerDeductionV2,
} from "../../lib/tax/v2-engines";
import { demoHousehold } from "../../lib/demo-data/household";
import { assertSimulationHasProof } from "../../lib/validation/golden-cases";

describe("V3.2 — impôt sur les sociétés", () => {
  it("reproduit le golden : bénéfice 120 000 € → 25 750 € (21,46 %)", () => {
    const result = computeIs({ profit: 120_000, turnover: 900_000, individualOwnershipPercent: 100 });
    expect(result.taxAtReducedRate).toBe(6_375);
    expect(result.taxAtStandardRate).toBe(19_375);
    expect(result.totalIs).toBe(25_750);
    expect(result.effectiveRatePercent).toBe(21.46);
  });

  it("refuse le taux réduit si CA > 10 M€ ou capital < 75 % personnes physiques", () => {
    expect(computeIs({ profit: 40_000, turnover: 11_000_000 }).reducedRateEligible).toBe(false);
    expect(computeIs({ profit: 40_000, individualOwnershipPercent: 60 }).reducedRateEligible).toBe(false);
    expect(computeIs({ profit: 40_000, turnover: 11_000_000 }).totalIs).toBe(10_000);
  });

  it("applique la contribution sociale 3,3 % au-delà de 763 000 € d'IS", () => {
    // bénéfice 4 M€ sans taux réduit → IS 1 000 000 → CS 3,3 % × 237 000 = 7 821
    const result = computeIs({ profit: 4_000_000, turnover: 50_000_000 });
    expect(result.grossIs).toBe(1_000_000);
    expect(result.socialContribution).toBe(7_821);
  });

  it("expose un TaxRun complet revu par expert-comptable", () => {
    const run = simulateIs();
    expect(assertSimulationHasProof(run)).toBe(true);
    expect(run.reviewerRequired).toBe("expert-comptable");
  });
});

describe("V3.2 — SCI IR vs IS", () => {
  it("calcule le cas dérivé : loyers 30 k€, charges 8 k€, TMI 30 %", () => {
    const result = computeSciIrVsIs();
    // IR : 22 000 × (30 % + 17,2 %) = 10 384 €
    expect(result.netRentalIncome).toBe(22_000);
    expect(result.annualTaxAtIr).toBe(10_384);
    // IS : 30 000 − 8 000 − 6 250 = 15 750 → 15 % = 2 363 €
    expect(result.annualDepreciation).toBe(6_250);
    expect(result.taxableProfitAtIs).toBe(15_750);
    expect(result.annualTaxAtIs).toBe(2_363);
    expect(result.annualAdvantageIs).toBe(8_021);
  });

  it("réintègre les amortissements dans la plus-value de cession à l'IS", () => {
    const result = computeSciIrVsIs();
    // VNC = 300 000 − 62 500 = 237 500 ; PV pro = 400 000 − 237 500 = 162 500
    expect(result.cumulatedDepreciation).toBe(62_500);
    expect(result.netBookValue).toBe(237_500);
    expect(result.professionalGain).toBe(162_500);
    expect(result.saleTaxAtIs).toBeGreaterThan(result.saleTaxAtIr);
  });

  it("marque l'étape de cession en revue professionnelle", () => {
    const run = simulateSciIrVsIs();
    const saleStep = run.steps.find((step) => step.id === "sci-step-sale-is");
    expect(saleStep?.confidenceStatus).toBe("needs_review");
    expect(run.reviewerRequired).toBe("expert-comptable");
  });
});

describe("V3.2 — PER plafonds 2026", () => {
  it("plafonne le salarié à 37 680 € et le TNS à 88 911 €", () => {
    expect(computePerCeiling2026({ status: "salarie", professionalIncome: 500_000 }).ceiling).toBe(
      PER_SALARIE_MAX_2026,
    );
    expect(computePerCeiling2026({ status: "tns", professionalIncome: 500_000 }).ceiling).toBe(
      PER_TNS_MAX_2026,
    );
    expect(PER_SALARIE_MAX_2026).toBe(37_680);
    expect(PER_TNS_MAX_2026).toBe(88_911);
  });

  it("calcule les plafonds intermédiaires et les planchers PASS", () => {
    expect(computePerCeiling2026({ status: "salarie", professionalIncome: 60_000 }).ceiling).toBe(6_000);
    expect(computePerCeiling2026({ status: "salarie", professionalIncome: 10_000 }).ceiling).toBe(4_710);
    // TNS 100 000 € : 10 % × 100 000 + 15 % × (100 000 − 48 060) = 10 000 + 7 791 = 17 791
    expect(computePerCeiling2026({ status: "tns", professionalIncome: 100_000 }).ceiling).toBe(17_791);
  });

  it("chiffre l'économie à TMI 41 % et bloque la déduction à 70 ans", () => {
    const run = simulatePerDeductionV2({
      voluntaryPayments: 20_000,
      status: "salarie",
      professionalIncome: 400_000,
      tmi: 0.41,
    });
    expect(run.computedResult?.annualCeiling).toBe(37_680);
    expect(run.computedResult?.deductionUsed).toBe(20_000);
    expect(run.computedResult?.taxSaving).toBe(8_200);

    const blocked = simulatePerDeductionV2({ voluntaryPayments: 20_000, age: 70 });
    expect(blocked.computedResult?.ageBlocked).toBe(true);
    expect(blocked.computedResult?.deductionUsed).toBe(0);
  });
});

describe("V3.2 — exit tax (signal)", () => {
  it("détecte le champ par seuil de PV latentes ou de participation", () => {
    expect(computeExitTaxSignal({ latentGains: 900_000, ownershipPercent: 10 }).inScope).toBe(true);
    expect(computeExitTaxSignal({ latentGains: 100_000, ownershipPercent: 60 }).inScope).toBe(true);
    expect(computeExitTaxSignal({ latentGains: 100_000, ownershipPercent: 10 }).inScope).toBe(false);
    expect(
      computeExitTaxSignal({ latentGains: 900_000, yearsResidentInLastTen: 4 }).inScope,
    ).toBe(false);
  });

  it("documente sursis et dégrèvement (2 ans / 5 ans au-delà de 2,57 M€)", () => {
    expect(computeExitTaxSignal({ destinationInEea: false }).automaticDeferral).toBe(false);
    expect(computeExitTaxSignal({ shareValue: 3_000_000 }).reliefYears).toBe(5);
    expect(computeExitTaxSignal({ shareValue: 1_000_000 }).reliefYears).toBe(2);
  });

  it("reste un signal : toutes les étapes exigent une revue avocat", () => {
    const run = simulateExitTaxSignal();
    expect(run.steps.every((step) => step.confidenceStatus === "needs_review")).toBe(true);
    expect(run.reviewerRequired).toBe("avocat");
  });
});

describe("V3.2 — polish apport-cession et taxe holding", () => {
  it("conserve le golden 840 000 € et ajoute la comparaison cession directe", () => {
    const run = simulateApportCessionV2();
    expect(run.computedResult?.requiredReinvestment).toBe(840_000);
    expect(run.computedResult?.directSaleTaxAtPfu).toBe(188_400);
    expect(run.steps.some((step) => step.id === "apport-step-direct-sale")).toBe(true);
  });

  it("conserve le golden 84 000 € et documente IFI 975 VII + échéance 2027", () => {
    const run = simulateHoldingTaxV2();
    expect(run.computedResult?.holdingTax).toBe(84_000);
    expect(run.steps.some((step) => step.id === "holding-step-ifi-exoneration")).toBe(true);
    const deadline = run.steps.find((step) => step.id === "holding-step-deadline");
    expect(deadline?.outputValue).toBe("Printemps 2027");
  });
});

describe("V3.2 — goldens IFI (barème exact)", () => {
  it("calcule le barème : base 1,5 M€ → 3 900 €", () => {
    expect(calculateProgressiveIfi(1_500_000)).toBe(3_900);
    expect(calculateProgressiveIfi(1_300_000)).toBe(2_500);
    expect(calculateProgressiveIfi(2_570_000)).toBe(11_390);
  });

  it("applique la décote entre 1,3 et 1,4 M€", () => {
    // Base 1 350 000 : IFI brut 2 850 ; décote 17 500 − 1,25 % × 1 350 000 = 625 → 2 225
    const household = {
      ...demoHousehold,
      assets: demoHousehold.assets.map((asset) =>
        asset.id === "asset-rental" ? { ...asset, value: 940_000 } : asset,
      ),
      liabilities: [],
    };
    const run = calculateIfi(household);
    expect(run.result.taxableBase).toBe(1_870_000);
    // base > 1,4 M€ → pas de décote sur ce cas
    expect(run.result.discount).toBe(0);

    const discounted = calculateIfi({
      ...demoHousehold,
      assets: demoHousehold.assets.map((asset) =>
        asset.id === "asset-rental" ? { ...asset, value: 840_000 } : asset,
      ),
      liabilities: demoHousehold.liabilities.map((liability) => ({
        ...liability,
        value: 420_000,
      })),
    });
    expect(discounted.result.taxableBase).toBe(1_350_000);
    expect(discounted.result.grossIfi).toBe(2_850);
    expect(discounted.result.discount).toBe(625);
    expect(discounted.result.netIfi).toBe(2_225);
  });
});

describe("V3.2 — intégration produit", () => {
  it("déclare règles, sources, limites et catalogue", () => {
    expect(ruleVersions.some((rule) => rule.id === "rule-is-bareme-2026-v1" && rule.status === "active")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-sci-arbitrage-2026-v2")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-per-deduction-2026-v2")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-exit-tax-2026-v1" && rule.status === "active")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-service-public-is-taux-2026")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-legifrance-pass-2026")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-legifrance-cgi-167-bis-2026")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-is-bareme-2026")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-exit-tax-signal")).toBe(true);
    expect(getSimulationByParam("is")?.scenarioParam).toBe("is");
    expect(getSimulationByParam("sci")?.scenarioParam).toBe("sci-arbitrage");
    expect(getSimulationByParam("exit-tax")?.scenarioParam).toBe("exit-tax");
  });
});
