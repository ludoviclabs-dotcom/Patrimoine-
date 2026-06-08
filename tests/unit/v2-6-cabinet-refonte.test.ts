import { describe, expect, it } from "vitest";
import {
  cabinetDecisionCards,
  cabinetStatuses,
  cabinetTaskQueue,
  dossierWorkspaceTabs,
  getSimulationByParam,
  reportConclusionCards,
  reviewQueueItems,
  simulationCatalog,
  statusDictionary,
} from "../../lib/cabinet-refonte/v2-6";
import { evidenceSources } from "../../lib/evidence/sources";
import { getV2TaxRuns } from "../../lib/tax/v2-engines";

const sourceIds = new Set(evidenceSources.map((source) => source.id));
const allowedStatuses = new Set(cabinetStatuses);
const fixtureGroups = [
  cabinetDecisionCards,
  cabinetTaskQueue,
  dossierWorkspaceTabs,
  simulationCatalog,
  reviewQueueItems,
  reportConclusionCards,
];

describe("V2.6 cabinet refonte", () => {
  it("keeps every V2.6 displayed fixture sourced and user-facing", () => {
    for (const group of fixtureGroups) {
      for (const item of group) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(allowedStatuses.has(item.status), item.status).toBe(true);
        expect(item.certainty).toBeTruthy();
        expect(item.userFacingExplanation.length).toBeGreaterThan(25);
        expect(item.sourceIds.length).toBeGreaterThan(0);

        for (const sourceId of item.sourceIds) {
          expect(sourceIds.has(sourceId), sourceId).toBe(true);
        }
      }
    }
  });

  it("normalizes status labels to the approved cabinet vocabulary", () => {
    expect(statusDictionary.map((status) => status.id)).toEqual([...cabinetStatuses]);
    expect(statusDictionary.some((status) => status.id === "Revue requise")).toBe(true);
    expect(statusDictionary.some((status) => status.id === "Simulation indicative")).toBe(true);

    const forbidden = ["Prêt", "OK", "Optimisé", "Validé automatiquement", "Conseil recommandé"];
    for (const item of statusDictionary) {
      expect(forbidden.some((word) => item.label.includes(word))).toBe(false);
      expect(forbidden.some((word) => item.meaning.includes(word))).toBe(false);
    }
  });

  it("routes plus-value and legacy aliases to the active simulation catalog", () => {
    expect(getSimulationByParam("plus-value")?.scenarioParam).toBe("plus-value");
    expect(getSimulationByParam("pea-withdrawal")?.scenarioParam).toBe("pea");
    expect(getSimulationByParam("per-deduction")?.scenarioParam).toBe("per");
  });

  it("keeps every simulation catalog item audit-ready and review-gated when sensitive", () => {
    for (const item of simulationCatalog) {
      expect(item.href).toContain(`scenario=${item.scenarioParam}`);
      expect(item.dataUsed).toBeTruthy();
      expect(item.hypothesis).toBeTruthy();
      expect(item.rule).toBeTruthy();
      expect(item.limit).toBeTruthy();
      expect(item.reviewGate).toBeTruthy();
      expect(item.reviewRequired).toBe(true);
    }
  });

  it("keeps review queue and report conclusions under human review", () => {
    expect(reviewQueueItems.length).toBeGreaterThanOrEqual(4);
    expect(reviewQueueItems.every((item) => item.reviewRequired)).toBe(true);
    expect(reviewQueueItems.some((item) => item.status === "Bloqué")).toBe(true);
    expect(reportConclusionCards.every((item) => item.reviewRequired)).toBe(true);
  });

  it("keeps tax run results backed by source, rule, limit and next action", () => {
    for (const run of getV2TaxRuns()) {
      expect(run.evidenceSourceIds.length).toBeGreaterThan(0);
      expect(run.coverageLimitIds?.length).toBeGreaterThan(0);
      expect(run.steps.length).toBeGreaterThan(0);
      expect(
        run.steps.every(
          (step) =>
            step.evidenceSourceId &&
            step.ruleVersionId &&
            step.coverageLimitIds.length > 0 &&
            step.nextAction.length > 10,
        ),
      ).toBe(true);
    }
  });
});
