import { describe, expect, it } from "vitest";
import { demoHousehold } from "../../lib/demo-data/household";
import { getGrossWealth, getNetWealth, getTotalDebt } from "../../lib/demo-data/metrics";
import {
  calculateProgressiveTax,
  createTaxRunFactory,
  directLineDonationBrackets,
  getBareOwnershipRate,
  makeStep,
} from "../../lib/tax/engine-kit";
import { applyRate, fromCents, roundCents, roundEuros, toCents } from "../../lib/tax/money";
import { simulateTransmissionV2 } from "../../lib/tax/v2-engines";

describe("V3 socle — money (centimes entiers)", () => {
  it("convertit euros et centimes sans dérive flottante", () => {
    expect(toCents(2_103.99)).toBe(210_399);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(210_399)).toBe(2_103.99);
    expect(roundEuros(2_103.99)).toBe(2_104);
    expect(roundCents(2_103.985)).toBe(2_103.99);
  });

  it("applique un taux en centimes entiers", () => {
    // 17 979 € à 11 % puis 421 € à 30 % = composantes du golden IR 2026 (30 000 €, 1 part)
    expect(applyRate(toCents(17_979), 0.11)).toBe(197_769);
    expect(applyRate(toCents(421), 0.3)).toBe(12_630);
    expect(fromCents(197_769 + 12_630)).toBe(2_103.99);
  });
});

describe("V3 socle — engine-kit (extraction pure)", () => {
  it("garde le comportement historique du barème progressif (arrondi final)", () => {
    // 50 000 € en ligne directe, arrondi final : 8 194,35 → 8 194
    expect(calculateProgressiveTax(50_000)).toBe(8_194);
    expect(calculateProgressiveTax(0)).toBe(0);
  });

  it("reproduit l'exemple officiel DMTG avec arrondi par tranche", () => {
    // impots.gouv.fr : 50 000 € taxables en ligne directe → 404 + 404 + 573 + 6 814 = 8 195 €
    expect(
      calculateProgressiveTax(50_000, directLineDonationBrackets, { perSliceRounding: true }),
    ).toBe(8_195);
  });

  it("garde le barème usufruit art. 669 inchangé", () => {
    expect(getBareOwnershipRate(51)).toBe(0.5);
    expect(getBareOwnershipRate(65)).toBe(0.6);
    expect(getBareOwnershipRate(95)).toBe(0.9);
  });

  it("produit des runs identiques au format v2 via la factory", () => {
    const taxRun = createTaxRunFactory({
      tenantId: "tenant-test",
      caseId: "case-test",
      householdId: "household-test",
      dossierSnapshotId: "snapshot-test",
      runIdSuffix: "test-v3",
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    const step = makeStep({
      id: "step-1",
      order: 1,
      label: "Étape test",
      inputValue: 100,
      formula: "100 x 2",
      outputValue: 200,
      ruleVersionId: "rule-test-2026-v1",
      evidenceSourceId: "src-test-2026",
      coverageLimitIds: ["coverage-test"],
    });
    const run = taxRun({
      module: "transmission",
      scenario: "transmission",
      steps: [step],
      resultLabel: "Test",
      resultAmount: 200,
      evidenceSourceIds: ["src-test-2026"],
      reviewerRequired: "notaire",
      computedResult: { value: 200 },
    });

    expect(run.id).toBe("taxrun-transmission-test-v3");
    expect(run.professionalValidationRequired).toBe(true);
    expect(run.status).toBe("needs_review");
    expect(run.coverageLimitIds).toEqual(["coverage-test"]);
    expect(step.displayStatus).toBe("indicative_calculation");
    expect(step.nextAction.length).toBeGreaterThan(10);
  });

  it("ne change pas le résultat des moteurs v2 après extraction", () => {
    // Défauts v2 : 300 000 € / 2 enfants → part 150 000, taxable 50 000, 8 194 € x 2
    const run = simulateTransmissionV2();
    expect(run.computedResult?.indicativeRights).toBe(16_388);
    expect(run.id).toBe("taxrun-transmission-claire-marc-v2");
  });
});

describe("V3 socle — cohérence patrimoine démo", () => {
  it("calcule 3 840 000 / 420 000 / 3 420 000 pour Claire et Marc", () => {
    expect(getGrossWealth(demoHousehold)).toBe(3_840_000);
    expect(getTotalDebt(demoHousehold)).toBe(420_000);
    expect(getNetWealth(demoHousehold)).toBe(3_420_000);
  });
});
