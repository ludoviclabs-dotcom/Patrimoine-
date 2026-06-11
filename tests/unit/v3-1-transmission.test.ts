import { describe, expect, it } from "vitest";
import { getSimulationByParam } from "../../lib/cabinet-refonte/v2-6";
import { coverageLimits } from "../../lib/coverage/limits";
import { getDmtgRegulatoryDiff } from "../../lib/evidence/dmtg-rule-diff";
import { evidenceSources } from "../../lib/evidence/sources";
import { ruleVersions } from "../../lib/rules/rule-versions";
import { computeDemembrement, simulateDemembrement } from "../../lib/tax/engines/demembrement";
import {
  computeDmtg,
  computeDmtgForShare,
  getAvailableAllowance,
} from "../../lib/tax/engines/dmtg";
import { simulateTransmissionV2 } from "../../lib/tax/v2-engines";
import { assertSimulationHasProof } from "../../lib/validation/golden-cases";

describe("V3.1 — DMTG multi-liens (art. 777)", () => {
  it("reproduit l'exemple officiel ligne directe : 50 000 € → 8 195 € (404+404+573+6 814)", () => {
    const result = computeDmtg({ taxableAfterAllowance: 50_000, relationship: "direct-line" });
    expect(result.tax).toBe(8_195);
    expect(result.marginalRate).toBe(0.2);
  });

  it("applique le tableau III frères/sœurs : 35 % puis 45 % au-delà de 24 430 €", () => {
    // 30 000 € : 24 430 × 35 % = 8 551 (8 550,5 arrondi) + 5 570 × 45 % = 2 507 (2 506,5 arrondi)
    const result = computeDmtg({ taxableAfterAllowance: 30_000, relationship: "sibling" });
    expect(result.tax).toBe(8_551 + 2_507);
    expect(result.marginalRate).toBe(0.45);
  });

  it("applique 55 % aux neveux/nièces et 60 % aux non-parents", () => {
    expect(computeDmtg({ taxableAfterAllowance: 10_000, relationship: "nephew-niece" }).tax).toBe(5_500);
    expect(computeDmtg({ taxableAfterAllowance: 10_000, relationship: "non-relative" }).tax).toBe(6_000);
  });

  it("exonère le conjoint/PACS en succession", () => {
    const result = computeDmtgForShare({ grossShare: 500_000, relationship: "spouse-pacs" });
    expect(result.tax).toBe(0);
    expect(result.exempt).toBe(true);
  });

  it("applique les abattements par lien avec rappel fiscal 15 ans", () => {
    expect(getAvailableAllowance("direct-line")).toBe(100_000);
    expect(getAvailableAllowance("grandchild")).toBe(31_865);
    expect(getAvailableAllowance("sibling")).toBe(15_932);
    expect(getAvailableAllowance("nephew-niece")).toBe(7_967);
    expect(getAvailableAllowance("non-relative")).toBe(1_594);
    expect(getAvailableAllowance("direct-line", 80_000)).toBe(20_000);
    expect(getAvailableAllowance("direct-line", 150_000)).toBe(0);
  });

  it("chaîne le barème multi-liens dans simulateTransmissionV2", () => {
    const sibling = simulateTransmissionV2({
      assetValue: 100_000,
      children: 1,
      relationship: "sibling",
    });
    // 100 000 − 15 932 = 84 068 → 8 551 + 26 837 (59 638 × 45 % = 26 837,1) = 35 388
    expect(sibling.computedResult?.taxableShare).toBe(84_068);
    expect(sibling.computedResult?.indicativeRights).toBe(35_388);

    const spouse = simulateTransmissionV2({ assetValue: 400_000, children: 1, relationship: "spouse-pacs" });
    expect(spouse.computedResult?.indicativeRights).toBe(0);
  });
});

describe("V3.1 — démembrement art. 669", () => {
  it("reproduit le golden viager : 65 ans, 400 000 € → NP 240 000 €, taxable 140 000 €", () => {
    const result = computeDemembrement({ usufructuaryAge: 65, fullOwnershipValue: 400_000 });
    expect(result.usufructRate).toBe(0.4);
    expect(result.bareOwnershipValue).toBe(240_000);
    expect(result.taxableShare).toBe(140_000);
    // 404 + 404 + 573 + (140 000 − 15 932) × 20 % = 1 381 + 24 814 = 26 195
    expect(result.indicativeRights).toBe(26_195);
  });

  it("calcule l'usufruit temporaire à 23 % par décennie entamée", () => {
    const fifteenYears = computeDemembrement({
      mode: "temporaire",
      temporaryYears: 15,
      usufructuaryAge: 30,
      fullOwnershipValue: 100_000,
    });
    // 2 décennies entamées → 46 %, sous le plafond viager (80 % à 30 ans)
    expect(fifteenYears.startedDecades).toBe(2);
    expect(fifteenYears.usufructRate).toBe(0.46);
    expect(fifteenYears.temporaryCappedByViager).toBe(false);
  });

  it("plafonne l'usufruit temporaire à la valeur viagère (65 ans → 40 %)", () => {
    const capped = computeDemembrement({
      mode: "temporaire",
      temporaryYears: 15,
      usufructuaryAge: 65,
      fullOwnershipValue: 100_000,
    });
    expect(capped.rawTemporaryRate).toBe(0.46);
    expect(capped.usufructRate).toBe(0.4);
    expect(capped.temporaryCappedByViager).toBe(true);
  });

  it("expose un TaxRun complet avec alerte IFI art. 968 et alerte décennale", () => {
    const run = simulateDemembrement({ mode: "temporaire", temporaryYears: 15 });
    expect(run.module).toBe("demembrement");
    expect(assertSimulationHasProof(run)).toBe(true);
    expect(run.steps.some((step) => step.id === "demembrement-step-ifi")).toBe(true);
    expect(run.steps.some((step) => step.id === "demembrement-step-decennial")).toBe(true);
    expect(run.reviewerRequired).toBe("notaire");
  });
});

describe("V3.1 — intégration produit", () => {
  it("documente le diff de règle DMTG (arrondi par tranche)", () => {
    const diff = getDmtgRegulatoryDiff();
    expect(diff.amountBefore).toBe(16_388);
    expect(diff.amountAfter).toBe(16_390);
    expect(diff.delta).toBe(2);
    expect(diff.status).toBe("review_required");
  });

  it("déclare règles, sources, limites et catalogue", () => {
    expect(ruleVersions.some((rule) => rule.id === "rule-dmtg-bareme-2026-v1" && rule.status === "active")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-demembrement-669-2026-v1" && rule.status === "active")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-impots-dmtg-bareme-2026")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-legifrance-cgi-669-2026")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-dmtg-multi-liens")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-demembrement-ifi-968")).toBe(true);
    expect(getSimulationByParam("demembrement")?.scenarioParam).toBe("demembrement");
    expect(getSimulationByParam("usufruit")?.scenarioParam).toBe("demembrement");
  });
});
