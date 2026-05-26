import { describe, expect, it } from "vitest";
import { demoHousehold } from "../../lib/demo-data/household";
import { calculateIfi } from "../../lib/simulations/ifi";
import type { Household } from "../../lib/types";

describe("calculateIfi", () => {
  it("computes the Claire and Marc golden case", () => {
    const run = calculateIfi(demoHousehold);

    expect(run.result.taxableRealEstateBeforeDebt).toBe(1_530_000);
    expect(run.result.deductibleDebt).toBe(420_000);
    expect(run.result.taxableBase).toBe(1_110_000);
    expect(run.result.threshold).toBe(1_300_000);
    expect(run.result.triggered).toBe(false);
    expect(run.status).toBe("indicative");
  });

  it("raises an alert above the IFI threshold", () => {
    const household: Household = {
      ...demoHousehold,
      assets: demoHousehold.assets.map((asset) =>
        asset.id === "asset-rental" ? { ...asset, value: 1_100_000 } : asset,
      ),
    };

    const run = calculateIfi(household);

    expect(run.result.taxableBase).toBe(1_610_000);
    expect(run.result.triggered).toBe(true);
    expect(run.result.message).toContain("Alerte IFI");
  });

  it("abstains when real-estate data is missing", () => {
    const household: Household = {
      ...demoHousehold,
      assets: demoHousehold.assets.map((asset) =>
        asset.id === "asset-sci" ? { ...asset, value: Number.NaN } : asset,
      ),
    };

    const run = calculateIfi(household);

    expect(run.status).toBe("needs_review");
    expect(run.result.taxableBase).toBeNull();
  });

  it("links every calculation step to a rule and an evidence source", () => {
    const run = calculateIfi(demoHousehold);

    for (const step of run.steps) {
      expect(step.ruleVersionId).toBeTruthy();
      expect(step.evidenceSourceId).toBeTruthy();
    }
  });
});
