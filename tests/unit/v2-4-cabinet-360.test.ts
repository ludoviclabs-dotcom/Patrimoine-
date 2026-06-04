import { describe, expect, it } from "vitest";
import { evidenceSources } from "../../lib/evidence/sources";
import {
  clientAdvisorReportSections,
  documentChecklistItems,
  legalVehicleGraph,
  lifeEventPlaybooks,
  regulatoryRiskControls,
  roadmapMilestones,
  sourceCoverageMatrix,
  stressTestPlaybooks,
} from "../../lib/patrimonial-model/model";
import {
  getV2TaxRuns,
  simulatePerEarlyExitV24,
  simulateProductAdequacyV24,
  simulateSuccessionChecklistV24,
  simulateSuccessionLiquidityStressV24,
} from "../../lib/tax/v2-engines";

const sourceIds = new Set(evidenceSources.map((source) => source.id));

const v24FixtureGroups = [
  sourceCoverageMatrix,
  lifeEventPlaybooks,
  documentChecklistItems,
  regulatoryRiskControls,
  legalVehicleGraph,
  stressTestPlaybooks,
  roadmapMilestones,
  clientAdvisorReportSections,
];

describe("V2.4 cabinet 360 coverage", () => {
  it("keeps every V2.4 displayed fixture sourced, certain and user-facing", () => {
    for (const group of v24FixtureGroups) {
      for (const item of group) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.status).toBeTruthy();
        expect(item.certainty).toBeTruthy();
        expect(item.userFacingExplanation.length).toBeGreaterThan(25);
        expect(item.sourceIds.length).toBeGreaterThan(0);

        for (const sourceId of item.sourceIds) {
          expect(sourceIds.has(sourceId), sourceId).toBe(true);
        }
      }
    }
  });

  it("models six life events with checklist documents and cabinet next actions", () => {
    expect(lifeEventPlaybooks.map((event) => event.objective)).toEqual([
      "Préparer la retraite",
      "Transmettre",
      "Vendre un bien",
      "Protéger le conjoint",
      "Réduire risque IFI",
      "Mettre de l'ordre dans les enveloppes",
    ]);

    const documentIds = new Set(documentChecklistItems.map((document) => document.id));

    for (const event of lifeEventPlaybooks) {
      expect(event.questions.length).toBeGreaterThan(1);
      expect(event.documentIds.length).toBeGreaterThan(0);
      expect(event.nextAction.length).toBeGreaterThan(20);
      for (const documentId of event.documentIds) {
        expect(documentIds.has(documentId), documentId).toBe(true);
      }
    }
  });

  it("forces sensitive regulatory controls into manual review", () => {
    expect(regulatoryRiskControls.every((control) => control.reviewRequired)).toBe(true);
    expect(regulatoryRiskControls.some((control) => control.id === "control-ai-profiling")).toBe(true);
    expect(regulatoryRiskControls.some((control) => control.id === "control-dora-dsp2")).toBe(true);
  });

  it("does not produce definitive advice for V2.4 simulations", () => {
    const runs = [
      simulateSuccessionChecklistV24(),
      simulatePerEarlyExitV24(),
      simulateSuccessionLiquidityStressV24(),
      simulateProductAdequacyV24(),
    ];

    for (const run of runs) {
      expect(run.professionalValidationRequired).toBe(true);
      expect(run.status).toBe("needs_review");
      expect(run.computedResult?.definitiveRecommendation).toBe(false);
      expect(run.steps.some((step) => step.confidenceStatus === "needs_review")).toBe(true);
    }
  });

  it("attaches source, rule, limit and next action to every V2.4 simulation result", () => {
    const scenarios = new Set([
      "succession-checklist",
      "per-early-exit",
      "succession-liquidity-stress",
      "product-adequacy",
    ]);
    const runs = getV2TaxRuns().filter((run) => scenarios.has(run.scenario));

    expect(runs.length).toBe(4);
    for (const run of runs) {
      expect(run.evidenceSourceIds.length).toBeGreaterThan(0);
      expect(run.coverageLimitIds?.length).toBeGreaterThan(0);
      expect(run.steps.length).toBeGreaterThan(0);
      expect(
        run.steps.every(
          (step) =>
            step.evidenceSourceId &&
            step.ruleVersionId &&
            step.coverageLimitIds.length > 0 &&
            step.nextAction.length > 20,
        ),
      ).toBe(true);
    }
  });

  it("exposes report coverage CTAs to the expected test pages", () => {
    const hrefs = new Set(sourceCoverageMatrix.map((item) => item.testHref.split("?")[0].split("#")[0]));

    expect(hrefs.has("/dossiers")).toBe(true);
    expect(hrefs.has("/simulations")).toBe(true);
    expect(hrefs.has("/workflow")).toBe(true);
    expect(hrefs.has("/review")).toBe(true);
    expect(hrefs.has("/evidence")).toBe(true);
    expect(hrefs.has("/report")).toBe(true);
  });
});
