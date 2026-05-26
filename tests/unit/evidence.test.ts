import { describe, expect, it } from "vitest";
import { evidenceSources } from "../../lib/evidence/sources";
import { ruleVersions } from "../../lib/rules/rule-versions";

describe("evidence registry", () => {
  it("keeps rule evidence links resolvable", () => {
    const sourceIds = new Set(evidenceSources.map((source) => source.id));

    for (const rule of ruleVersions) {
      expect(rule.evidenceSourceIds.length).toBeGreaterThan(0);
      for (const sourceId of rule.evidenceSourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
    }
  });
});
