import { describe, expect, it } from "vitest";
import { coverageLimits } from "../../lib/coverage/limits";
import { instantiatePersona, createOnboardingDossier, getLivingDossier } from "../../lib/dossiers/v2-dossiers";
import { demoHousehold } from "../../lib/demo-data/household";
import { calculateIfi } from "../../lib/simulations/ifi";
import {
  calculateRealEstateHoldingAllowances,
  generateProfessionalDocuments,
  getBareOwnershipRate,
  getV2TaxRuns,
  simulateApportCessionV2,
  simulateDutreilV2,
  simulateHoldingTaxV2,
  simulateIrPfuCdhr,
  simulateRealEstateGainV2,
  simulateTransmissionV2,
} from "../../lib/tax/v2-engines";
import type { Household } from "../../lib/types";

describe("V2 cabinet fiscal product layer", () => {
  it("computes IFI with discount range and full proof metadata", () => {
    const household: Household = {
      ...demoHousehold,
      assets: demoHousehold.assets.map((asset) => {
        if (asset.id === "asset-rental") return { ...asset, value: 990_000 };
        if (asset.id === "asset-sci") return { ...asset, value: 100_000 };
        return asset;
      }),
      liabilities: [],
    };

    const run = calculateIfi(household);

    expect(run.result.taxableBase).toBe(1_720_000);
    expect(run.result.grossIfi).toBeGreaterThan(0);
    expect(run.result.discount).toBe(0);
    expect(run.steps.every((step) => step.evidenceSourceId && step.ruleVersionId)).toBe(true);
    expect(run.steps.every((step) => step.coverageLimitIds.length > 0)).toBe(true);
  });

  it("does not apply the main residence abatement when held through a company", () => {
    const household: Household = {
      ...demoHousehold,
      assets: demoHousehold.assets.map((asset) =>
        asset.id === "asset-main-residence" ? { ...asset, isDirectlyHeld: false } : asset,
      ),
    };

    const run = calculateIfi(household);

    expect(run.result.taxableRealEstateBeforeDebt).toBe(1_800_000);
    expect(run.result.taxableBase).toBe(1_380_000);
    expect(run.result.discount).toBeGreaterThan(0);
  });

  it("applies IFI cap when income and other taxes create a cap signal", () => {
    const household: Household = {
      ...demoHousehold,
      assets: demoHousehold.assets.map((asset) =>
        asset.id === "asset-rental" ? { ...asset, value: 2_600_000 } : asset,
      ),
    };

    const run = calculateIfi(household, { annualIncome: 30_000, otherTaxes: 28_000 });

    expect(run.result.capApplied).toBe(true);
    expect(run.result.netIfi).toBe(0);
  });

  it("returns V2 tax runs for the priority cabinet modules", () => {
    const runs = getV2TaxRuns();
    const modules = new Set(runs.map((run) => run.module));

    expect(modules).toEqual(
      new Set([
        "ir-pfu-cdhr",
        "plus-value-immo",
        "transmission",
        "dutreil",
        "apport-cession",
        "holding-tax",
        "pea",
        "per",
        "bank-import",
        "succession",
        "per-exit",
        "liquidity-stress",
        "product-adequacy",
      ]),
    );
    for (const run of runs) {
      expect(run.professionalValidationRequired).toBe(true);
      expect(run.evidenceSourceIds.length).toBeGreaterThan(0);
      expect(run.coverageLimitIds?.length).toBeGreaterThan(0);
      expect(run.steps.length).toBeGreaterThan(0);
    }
  });

  it("covers PFU/CDHR, plus-value, transmission and LF 2026 dirigeant modules", () => {
    expect(simulateIrPfuCdhr({ taxableIncome: 420_000, capitalIncome: 140_000 }).computedResult?.cdhr).toBeGreaterThan(0);
    expect(simulateRealEstateGainV2({ yearsHeld: 9 }).resultAmount).toBeGreaterThan(0);
    expect(simulateTransmissionV2({ assetValue: 300_000, children: 2 }).resultAmount).toBeGreaterThanOrEqual(0);
    expect(simulateDutreilV2().computedResult?.exemptValue).toBe(592_500);
    expect(simulateApportCessionV2().computedResult?.requiredReinvestment).toBe(840_000);
    expect(simulateHoldingTaxV2().computedResult?.holdingTax).toBe(84_000);
  });

  it("applies exact holding allowances and main residence treatment for real estate gains", () => {
    expect(calculateRealEstateHoldingAllowances(5)).toEqual({
      yearsHeld: 5,
      incomeTaxAllowanceRate: 0,
      socialAllowanceRate: 0,
    });
    expect(calculateRealEstateHoldingAllowances(22)).toMatchObject({
      yearsHeld: 22,
      incomeTaxAllowanceRate: 1,
      socialAllowanceRate: 0.28,
    });
    expect(calculateRealEstateHoldingAllowances(30)).toEqual({
      yearsHeld: 30,
      incomeTaxAllowanceRate: 1,
      socialAllowanceRate: 1,
    });

    expect(simulateRealEstateGainV2({ isMainResidence: true }).resultAmount).toBe(0);
    expect(
      simulateRealEstateGainV2({
        salePrice: 900_000,
        purchasePrice: 300_000,
        acquisitionCosts: 0,
        works: 0,
        yearsHeld: 5,
      }).computedResult?.surtax,
    ).toBeGreaterThan(0);
  });

  it("computes direct-line donation, prior donations and cash gifts as review items", () => {
    expect(simulateTransmissionV2({ assetValue: 100_000, children: 2 }).resultAmount).toBe(0);
    expect(simulateTransmissionV2({ assetValue: 600_000, children: 1 }).resultAmount).toBeGreaterThan(0);
    expect(
      simulateTransmissionV2({
        assetValue: 300_000,
        children: 2,
        familyCashGift: 31_865,
      }).computedResult?.familyCashGiftNeedsReview,
    ).toBe(true);
  });

  it("keeps dismemberment rates aligned with age thresholds", () => {
    expect(getBareOwnershipRate(50)).toBe(0.4);
    expect(getBareOwnershipRate(51)).toBe(0.5);
    expect(getBareOwnershipRate(60)).toBe(0.5);
    expect(getBareOwnershipRate(61)).toBe(0.6);
    expect(getBareOwnershipRate(70)).toBe(0.6);
    expect(getBareOwnershipRate(71)).toBe(0.7);
  });

  it("hardens Dutreil with commitments, exclusions and eligible net base", () => {
    expect(simulateDutreilV2().computedResult?.exemptValue).toBe(592_500);
    expect(simulateDutreilV2({ individualCommitmentYears: 5 }).computedResult?.exemptValue).toBe(0);
    const withExcludedAssets = simulateDutreilV2({ excludedLuxuryAssetsValue: 40_000 });

    expect(withExcludedAssets.computedResult?.totalExcludedValue).toBe(100_000);
    expect(withExcludedAssets.computedResult?.eligibleBase).toBe(750_000);
    expect(withExcludedAssets.computedResult?.exemptValue).toBe(562_500);
  });

  it("computes holding tax only when criteria and taxable inventory are present", () => {
    expect(simulateHoldingTaxV2({ totalAssets: 4_900_000 }).computedResult?.holdingTax).toBe(0);

    const run = simulateHoldingTaxV2({
      luxuryAssetsValue: 100_000,
      financialAssetsValue: 120_000,
      realEstateLuxuryValue: 80_000,
      cashAndReceivablesValue: 30_000,
    });

    expect(run.computedResult?.taxableLuxuryInventory).toBe(330_000);
    expect(run.computedResult?.holdingTax).toBe(66_000);
  });

  it("keeps every dynamic TaxRun attached to proof, limits and professional status", () => {
    const runs = [
      simulateRealEstateGainV2({ yearsHeld: 22 }),
      simulateTransmissionV2({ assetValue: 600_000, priorDonations: 100_000 }),
      simulateDutreilV2({ excludedLuxuryAssetsValue: 40_000 }),
      simulateHoldingTaxV2({ financialAssetsValue: 120_000 }),
    ];

    for (const run of runs) {
      expect(run.professionalValidationRequired).toBe(true);
      expect(run.evidenceSourceIds.length).toBeGreaterThan(0);
      expect(run.coverageLimitIds?.length).toBeGreaterThan(0);
      expect(run.status).toBe("needs_review");
      expect(
        run.steps.every(
          (step) =>
            step.ruleVersionId &&
            step.evidenceSourceId &&
            step.displayStatus &&
            step.coverageLimitIds.length > 0,
        ),
      ).toBe(true);
    }
  });

  it("instantiates personas, onboarding dossier and professional documents", () => {
    const instantiation = instantiatePersona("persona-entrepreneur-cession");
    const onboarding = createOnboardingDossier({ householdName: "Test cabinet" });
    const dossier = getLivingDossier();
    const documents = generateProfessionalDocuments();

    expect(instantiation.caseId).toContain("entrepreneur-cession");
    expect(onboarding.clientCase.title).toContain("Test cabinet");
    expect(dossier.envelopes.some((item) => item.label === "Société opérationnelle")).toBe(true);
    expect(documents.map((document) => document.kind)).toEqual([
      "der",
      "fil",
      "lettre-mission",
      "rapport-adequation",
      "note-synthese-fiscale",
      "checklist-lcb-ft",
    ]);
  });

  it("declares coverage limits for all new V2 modules", () => {
    const modules = new Set(coverageLimits.map((limit) => limit.module));

    expect(modules.has("ir-pfu-cdhr")).toBe(true);
    expect(modules.has("dutreil")).toBe(true);
    expect(modules.has("apport-cession")).toBe(true);
    expect(modules.has("holding-tax")).toBe(true);
    expect(modules.has("documents-cabinet")).toBe(true);
  });
});
