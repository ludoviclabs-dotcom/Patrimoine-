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
import { resolveApportCessionRegime } from "../../lib/tax/apport-cession-regimes";
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
    // TAX-P0-003 : date de cession explicite (régime LF 2026), plus de régime présumé.
    const run = simulateApportCessionV2({ disposalDate: "2026-06-11" });
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

// --- GOLDEN CASES versionnement 150-0 B ter par date de cession (TAX-P0-003) --
// Sources : REGLEMENTATION_AOUT_2026.md § 8.1 et § 8.2 ; CGI art. 150-0 B ter,
// versions consolidées contrôlées sur legifrance.gouv.fr ; LF 2026
// n° 2026-103 du 19/02/2026, art. 11 (application aux cessions réalisées à
// compter du 21/02/2026).
// Le régime est sélectionné par la DATE DE CESSION des titres apportés, jamais
// par la date d'apport ni par l'année d'exécution du moteur.
describe("V3.7 — régime 150-0 B ter versionné par date de cession (TAX-P0-003)", () => {
  const PROCEEDS = 1_000_000;

  it("golden A — seuil PRÉ-réforme : 60 % requis au 20/02/2026", () => {
    const base = {
      saleProceeds: PROCEEDS,
      reinvestmentMonths: 12,
      conservationYears: 1,
      disposalDate: "2026-02-20",
    };
    const under = simulateApportCessionV2({ ...base, reinvestedAmount: 599_900 });
    expect(under.computedResult?.requiredReinvestment).toBe(600_000);
    expect(under.computedResult?.meetsThreshold).toBe(false);
    expect(under.computedResult?.compliant).toBe(false);

    const at = simulateApportCessionV2({ ...base, reinvestedAmount: 600_000 });
    expect(at.computedResult?.meetsThreshold).toBe(true);
    expect(at.computedResult?.compliant).toBe(true);
  });

  it("golden B — seuil POST-réforme : 70 % requis au 21/02/2026", () => {
    const base = {
      saleProceeds: PROCEEDS,
      reinvestmentMonths: 12,
      conservationYears: 5,
      disposalDate: "2026-02-21",
    };
    const under = simulateApportCessionV2({ ...base, reinvestedAmount: 699_900 });
    expect(under.computedResult?.requiredReinvestment).toBe(700_000);
    expect(under.computedResult?.meetsThreshold).toBe(false);

    const at = simulateApportCessionV2({ ...base, reinvestedAmount: 700_000 });
    expect(at.computedResult?.meetsThreshold).toBe(true);
    expect(at.computedResult?.compliant).toBe(true);
  });

  it("golden C — délai PRÉ-réforme : deux ans (24 mois)", () => {
    const base = {
      saleProceeds: PROCEEDS,
      reinvestedAmount: 600_000,
      conservationYears: 1,
      disposalDate: "2026-02-20",
    };
    expect(
      simulateApportCessionV2({ ...base, reinvestmentMonths: 24 }).computedResult?.meetsDeadline,
    ).toBe(true);
    expect(
      simulateApportCessionV2({ ...base, reinvestmentMonths: 25 }).computedResult?.meetsDeadline,
    ).toBe(false);
  });

  it("golden D — délai POST-réforme : trois ans (36 mois)", () => {
    const base = {
      saleProceeds: PROCEEDS,
      reinvestedAmount: 700_000,
      conservationYears: 5,
      disposalDate: "2026-02-21",
    };
    expect(
      simulateApportCessionV2({ ...base, reinvestmentMonths: 36 }).computedResult?.meetsDeadline,
    ).toBe(true);
    expect(
      simulateApportCessionV2({ ...base, reinvestmentMonths: 37 }).computedResult?.meetsDeadline,
    ).toBe(false);
  });

  it("golden E — date opérative : apport antérieur, la CESSION commande le régime", () => {
    // Apport bien antérieur à la réforme dans les deux cas : seule la date de
    // cession déplace le régime. C'est le cœur de TAX-P0-003.
    const before = simulateApportCessionV2({
      saleProceeds: PROCEEDS,
      reinvestedAmount: 650_000,
      reinvestmentMonths: 12,
      conservationYears: 1,
      disposalDate: "2026-02-20",
    });
    expect(before.computedResult?.regimeId).toBe("2019-to-2026-02-20");
    expect(before.computedResult?.reinvestmentMinimumRate).toBe(0.6);
    expect(before.computedResult?.reinvestmentDeadlineMonths).toBe(24);
    expect(before.computedResult?.minimumHoldingPeriodMonths).toBe(12);
    expect(before.steps.every((s) => s.ruleVersionId === "rule-apport-cession-2019-v1")).toBe(true);

    const after = simulateApportCessionV2({
      saleProceeds: PROCEEDS,
      reinvestedAmount: 650_000,
      reinvestmentMonths: 12,
      conservationYears: 5,
      disposalDate: "2026-02-21",
    });
    expect(after.computedResult?.regimeId).toBe("from-2026-02-21");
    expect(after.computedResult?.reinvestmentMinimumRate).toBe(0.7);
    expect(after.computedResult?.reinvestmentDeadlineMonths).toBe(36);
    expect(after.computedResult?.minimumHoldingPeriodMonths).toBe(60);
    expect(after.steps.every((s) => s.ruleVersionId === "rule-apport-cession-2026-v3")).toBe(true);

    // Même remploi de 650 000 € : conforme avant la réforme, insuffisant après.
    expect(before.computedResult?.meetsThreshold).toBe(true);
    expect(after.computedResult?.meetsThreshold).toBe(false);
  });

  it("golden E bis — la bascule se joue au jour près, pas à l'année", () => {
    expect(resolveApportCessionRegime("2026-02-20").regimeId).toBe("2019-to-2026-02-20");
    expect(resolveApportCessionRegime("2026-02-21").regimeId).toBe("from-2026-02-21");
    // Une cession de janvier 2026 relève encore du régime antérieur : une
    // sélection fondée sur la seule année serait fausse.
    expect(resolveApportCessionRegime("2026-01-15").regimeId).toBe("2019-to-2026-02-20");
    expect(resolveApportCessionRegime("2018-12-31").regimeId).toBe("pre-2019");
    expect(resolveApportCessionRegime("2019-01-01").regimeId).toBe("2019-to-2026-02-20");
  });

  it("golden F — conservation : douze mois avant la réforme, cinq ans après", () => {
    // Un an de conservation suffit sous l'ancien texte...
    expect(
      simulateApportCessionV2({
        saleProceeds: PROCEEDS,
        reinvestedAmount: 600_000,
        reinvestmentMonths: 12,
        conservationYears: 1,
        disposalDate: "2026-02-20",
      }).computedResult?.meetsHoldingPeriod,
    ).toBe(true);
    // ...mais pas sous le régime LF 2026, qui exige cinq ans.
    expect(
      simulateApportCessionV2({
        saleProceeds: PROCEEDS,
        reinvestedAmount: 700_000,
        reinvestmentMonths: 12,
        conservationYears: 1,
        disposalDate: "2026-02-21",
      }).computedResult?.meetsHoldingPeriod,
    ).toBe(false);
  });

  it("golden G — date de cession manquante : abstention, jamais le régime 2026 par défaut", () => {
    const run = simulateApportCessionV2();
    expect(run.computedResult?.regimeId).toBeNull();
    expect(run.computedResult?.requiredReinvestment).toBeNull();
    expect(run.computedResult?.reinvestmentMinimumRate).toBeNull();
    expect(run.computedResult?.reinvestmentDeadlineMonths).toBeNull();
    expect(run.computedResult?.undetermined).toBe(true);
    expect(run.computedResult?.compliant).toBe(false);
    expect(run.resultAmount).toBeUndefined();
    expect(run.resultLabel).toMatch(/indéterminé/i);
    expect(run.steps.every((step) => step.confidenceStatus === "needs_review")).toBe(true);
  });

  it("golden H — cessions antérieures à 2019 : conservation non documentée, revue exigée", () => {
    const run = simulateApportCessionV2({
      saleProceeds: PROCEEDS,
      reinvestedAmount: 500_000,
      reinvestmentMonths: 12,
      conservationYears: 5,
      disposalDate: "2018-12-31",
    });
    expect(run.computedResult?.regimeId).toBe("pre-2019");
    expect(run.computedResult?.reinvestmentMinimumRate).toBe(0.5);
    // Durée de conservation non documentée pour cette période : abstention.
    expect(run.computedResult?.minimumHoldingPeriodMonths).toBeNull();
    expect(run.computedResult?.meetsHoldingPeriod).toBeNull();
    expect(run.computedResult?.undetermined).toBe(true);
    expect(run.computedResult?.compliant).toBe(false);
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

describe("V3.2 — diffs de règles", () => {
  it("documente les montées de version PER et SCI avec dossiers à recalculer", async () => {
    const { getPerRegulatoryDiff, getSciRegulatoryDiff } = await import(
      "../../lib/evidence/v3-2-rule-diffs"
    );
    const perDiff = getPerRegulatoryDiff();
    expect(perDiff.amountAfter).toBe(37_680);
    expect(perDiff.status).toBe("review_required");
    const sciDiff = getSciRegulatoryDiff();
    expect(sciDiff.amountAfter).toBe(8_021);
    expect(sciDiff.impactedRuns[0].recalculationRequired).toBe(true);
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
