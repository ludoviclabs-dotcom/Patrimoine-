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

  it("reproduit l'exemple chiffré officiel service-public.gouv.fr (fiche F14205, base 100 000 €)", () => {
    // PF-02B2 : donation de 200 000 € à un enfant, abattement 100 000 € →
    // 403,60 + 403,70 + 573,45 + 16 813,60 = 18 194,35 € -> 18 194 €. Aucun
    // arrondi par tranche : la seule option `perSliceRounding` a été retirée
    // car elle produisait un écart d'1 € (18 195 €) par rapport à cet exemple
    // officiel. Voir docs/agent/PF02B_FISCAL_COMPLETENESS.md.
    expect(calculateProgressiveTax(100_000, directLineDonationBrackets)).toBe(18_194);
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

  it("garde le moteur transmission aligné sur la règle DMTG en vigueur", () => {
    // rule-dmtg-bareme-2026-v2 (PF-02B2, arrondi final unique à l'euro) :
    // 8 194 € x 2 enfants = 16 388 €. Voir RuleDiff
    // rule-diff-dmtg-2026-arrondi-par-tranche pour l'historique de la correction.
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
