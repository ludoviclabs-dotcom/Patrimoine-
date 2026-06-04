import { describe, expect, it } from "vitest";
import { evidenceSources } from "../../lib/evidence/sources";
import {
  cabinetActionPlanSteps,
  calculatePerDeduction,
  complianceSignals,
  demoConnectorImport,
  manualReviewFlags,
  patrimonialTerms,
  reportMethodItems,
  wealthStructures,
} from "../../lib/patrimonial-model/model";
import {
  simulateBankImportV2,
  simulatePeaWithdrawalV2,
  simulatePerDeductionV2,
} from "../../lib/tax/v2-engines";

const sourceIds = new Set(evidenceSources.map((source) => source.id));

const fixtureGroups = [
  patrimonialTerms,
  wealthStructures,
  complianceSignals,
  manualReviewFlags,
  cabinetActionPlanSteps,
  [demoConnectorImport],
];

describe("V2.3 patrimonial model", () => {
  it("keeps every displayed fixture sourced and user-facing", () => {
    for (const group of fixtureGroups) {
      for (const item of group) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.status).toBeTruthy();
        expect(item.certainty).toBeTruthy();
        expect(item.userFacingExplanation.length).toBeGreaterThan(20);
        expect(item.sourceIds.length).toBeGreaterThan(0);

        for (const sourceId of item.sourceIds) {
          expect(sourceIds.has(sourceId), sourceId).toBe(true);
        }
      }
    }
  });

  it("forces complex structures and review flags into manual review", () => {
    const complexStructures = wealthStructures.filter((structure) =>
      ["structure-sci", "structure-holding", "structure-trust"].includes(structure.id),
    );

    expect(complexStructures.length).toBe(3);
    expect(complexStructures.every((structure) => structure.reviewRequired)).toBe(true);
    expect(manualReviewFlags.every((flag) => flag.reviewRequired)).toBe(true);
    expect(manualReviewFlags.some((flag) => flag.riskLevel === "critique")).toBe(true);
  });

  it("models the five-step cabinet action plan with targeted CTAs", () => {
    expect(cabinetActionPlanSteps.map((step) => step.verb)).toEqual([
      "Collecter",
      "Qualifier",
      "Simuler",
      "Contrôler",
      "Restituer",
    ]);
    expect(cabinetActionPlanSteps.every((step) => step.href.startsWith("/"))).toBe(true);
  });

  it("keeps PEA after five years as IR-exempt but social-contribution controlled", () => {
    const run = simulatePeaWithdrawalV2({
      yearsHeld: 7,
      withdrawnGains: 40_000,
      socialContributionRate: 0.172,
      partialWithdrawal: true,
    });

    expect(run.computedResult?.incomeTax).toBe(0);
    expect(run.computedResult?.socialContributions).toBe(6_880);
    expect(run.computedResult?.closesPlan).toBe(false);
    expect(run.steps.some((step) => step.confidenceStatus === "needs_review")).toBe(true);
  });

  it("applies PER deduction as min(payment, available ceiling)", () => {
    const calculation = calculatePerDeduction({
      voluntaryPayments: 30_000,
      annualCeiling: 10_000,
      unusedCeilings: [3_000, 2_000, 1_000],
      spouseMutualization: 4_000,
    });
    const run = simulatePerDeductionV2({
      voluntaryPayments: 30_000,
      annualCeiling: 10_000,
      unusedCeilings: [3_000, 2_000, 1_000],
      spouseMutualization: 4_000,
    });

    expect(calculation.availableCeiling).toBe(20_000);
    expect(calculation.deductionUsed).toBe(20_000);
    expect(calculation.excessPayment).toBe(10_000);
    expect(run.resultAmount).toBe(20_000);
  });

  it("keeps the bank import scenario demo-only and review-gated", () => {
    const run = simulateBankImportV2();

    expect(run.module).toBe("bank-import");
    expect(run.computedResult?.storesBankSecret).toBe(false);
    expect(run.coverageLimitIds).toContain("coverage-bank-import-demo");
    expect(run.steps.some((step) => step.confidenceStatus === "needs_review")).toBe(true);
  });

  it("keeps report method and simulation cards audit-ready", () => {
    const runs = [simulatePeaWithdrawalV2(), simulatePerDeductionV2(), simulateBankImportV2()];

    expect(reportMethodItems.map((item) => item.label)).toEqual([
      "Fait importé ou déclaré",
      "Hypothèse",
      "Règle",
      "Recommandation",
    ]);

    for (const run of runs) {
      expect(run.evidenceSourceIds.length).toBeGreaterThan(0);
      expect(run.coverageLimitIds?.length).toBeGreaterThan(0);
      expect(run.steps[0]?.nextAction.length).toBeGreaterThan(10);
      expect(run.steps.every((step) => step.ruleVersionId && step.evidenceSourceId)).toBe(true);
    }
  });
});
