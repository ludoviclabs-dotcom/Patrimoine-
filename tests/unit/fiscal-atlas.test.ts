import { describe, expect, it } from "vitest";
import {
  atlasSources,
  atlasCaseStudies,
  fiscalAtlasMaps,
  publicMoneyFlows,
  publicSpendingBreakdown,
} from "../../lib/fiscal-atlas/atlas";

const sourceIds = new Set(atlasSources.map((source) => source.id));
const allowedCertainties = new Set(["fait établi", "analyse", "hypothèse", "débat"]);

describe("fiscal atlas fixtures", () => {
  it("keeps audited source metadata complete", () => {
    for (const source of atlasSources) {
      expect(source.scope.length).toBeGreaterThan(12);
      expect(source.shortQuote.split(/\s+/).length).toBeLessThanOrEqual(25);
      expect(source.auditWarning.length).toBeGreaterThan(12);
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it("keeps public spending close to 1000 euros after rounding", () => {
    const total = publicSpendingBreakdown.reduce((sum, item) => sum + item.amountPer1000, 0);

    expect(total).toBeGreaterThanOrEqual(995);
    expect(total).toBeLessThanOrEqual(1005);
  });

  it("keeps public spending entries sourced, positive and qualified", () => {
    for (const item of publicSpendingBreakdown) {
      expect(item.amountPer1000).toBeGreaterThan(0);
      expect(item.actionHref).toMatch(/^\//);
      expect(item.actionLabel.length).toBeGreaterThan(0);
      expect(allowedCertainties.has(item.certainty)).toBe(true);
      expect(item.sourceIds.length).toBeGreaterThan(0);

      for (const sourceId of item.sourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
    }
  });

  it("keeps money flow steps sourced and qualified", () => {
    expect(publicMoneyFlows.length).toBeGreaterThanOrEqual(4);

    for (const flow of publicMoneyFlows) {
      expect(allowedCertainties.has(flow.certainty)).toBe(true);
      expect(flow.sourceIds.length).toBeGreaterThan(0);

      for (const sourceId of flow.sourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
    }
  });

  it("keeps map nodes, edges and actions resolvable", () => {
    expect(fiscalAtlasMaps.length).toBeGreaterThanOrEqual(7);

    for (const map of fiscalAtlasMaps) {
      const nodeIds = new Set(map.nodes.map((node) => node.id));

      expect(map.actionHref).toMatch(/^\//);
      expect(allowedCertainties.has(map.certainty)).toBe(true);
      expect(map.sourceIds.length).toBeGreaterThan(0);

      for (const sourceId of map.sourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }

      for (const node of map.nodes) {
        expect(allowedCertainties.has(node.certainty)).toBe(true);
        expect(node.sourceIds.length).toBeGreaterThan(0);

        for (const sourceId of node.sourceIds) {
          expect(sourceIds.has(sourceId)).toBe(true);
        }
      }

      for (const [from, to] of map.edges) {
        expect(nodeIds.has(from)).toBe(true);
        expect(nodeIds.has(to)).toBe(true);
      }
    }
  });

  it("keeps case studies actionable and sourced", () => {
    expect(atlasCaseStudies.length).toBeGreaterThanOrEqual(3);

    for (const study of atlasCaseStudies) {
      expect(study.actionHref).toMatch(/^\//);
      expect(study.steps.length).toBeGreaterThanOrEqual(4);
      expect(study.sourceIds.length).toBeGreaterThan(0);

      for (const sourceId of study.sourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }

      for (const step of study.steps) {
        expect(allowedCertainties.has(step.certainty)).toBe(true);
      }
    }
  });
});
