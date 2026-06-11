import { describe, expect, it } from "vitest";
import { getSimulationByParam } from "../../lib/cabinet-refonte/v2-6";
import { coverageLimits } from "../../lib/coverage/limits";
import { getDmtgRegulatoryDiff } from "../../lib/evidence/dmtg-rule-diff";
import { getDutreilRegulatoryDiff } from "../../lib/evidence/dutreil-rule-diff";
import { evidenceSources } from "../../lib/evidence/sources";
import { ruleVersions } from "../../lib/rules/rule-versions";
import {
  computeAssuranceVieTransmission,
  simulateAssuranceVieTransmission,
} from "../../lib/tax/engines/assurance-vie";
import { computeDemembrement, simulateDemembrement } from "../../lib/tax/engines/demembrement";
import {
  computeDmtg,
  computeDmtgForShare,
  getAvailableAllowance,
} from "../../lib/tax/engines/dmtg";
import { simulateDutreilV2, simulateTransmissionV2 } from "../../lib/tax/v2-engines";
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

describe("V3.1 — Dutreil v3 (chaînage DMTG)", () => {
  it("chiffre l'économie vs sans pacte : 2 M€, donateur 65 ans → > 370 000 €", () => {
    const run = simulateDutreilV2({
      companyValue: 2_000_000,
      eligibleOperatingValue: 2_000_000,
      nonEligibleAssets: 0,
      children: 1,
      donorAge: 65,
    });
    // Sans pacte : 1 900 000 € taxables → 617 394 € ; avec pacte : 400 000 € → 78 195 €
    expect(run.computedResult?.rightsWithoutDutreil).toBe(617_394);
    expect(run.computedResult?.rightsWithDutreil).toBe(78_195);
    expect(run.computedResult?.dutreilSavings).toBe(539_199);
    expect(Number(run.computedResult?.dutreilSavings)).toBeGreaterThan(370_000);
  });

  it("n'applique la réduction 50 % (790 I) qu'aux donations antérieures au 21/02/2026", () => {
    const base = {
      companyValue: 2_000_000,
      eligibleOperatingValue: 2_000_000,
      nonEligibleAssets: 0,
      children: 1,
      donorAge: 65,
    };
    const after = simulateDutreilV2(base);
    expect(after.computedResult?.fiftyPercentReductionApplicable).toBe(false);

    const before = simulateDutreilV2({ ...base, donationBeforeFeb2026: true });
    expect(before.computedResult?.fiftyPercentReductionApplicable).toBe(true);
    expect(before.computedResult?.rightsWithDutreil).toBe(39_098);

    // 70 ans ou plus, ou démembrement : pas de réduction même avant l'abrogation.
    expect(
      simulateDutreilV2({ ...base, donationBeforeFeb2026: true, donorAge: 70 }).computedResult
        ?.fiftyPercentReductionApplicable,
    ).toBe(false);
    expect(
      simulateDutreilV2({ ...base, donationBeforeFeb2026: true, fullOwnership: false })
        .computedResult?.fiftyPercentReductionApplicable,
    ).toBe(false);
  });

  it("préserve les invariants v2 (exonération 75 %, exclusions)", () => {
    expect(simulateDutreilV2().computedResult?.exemptValue).toBe(592_500);
    expect(simulateDutreilV2({ individualCommitmentYears: 5 }).computedResult?.exemptValue).toBe(0);
    const run = simulateDutreilV2();
    expect(run.steps.every((step) => step.ruleVersionId === "rule-dutreil-2026-v3")).toBe(true);
  });

  it("documente le diff v2 → v3 (abrogation réduction 790 I)", () => {
    const diff = getDutreilRegulatoryDiff();
    expect(diff.amountBefore).toBe(39_098);
    expect(diff.amountAfter).toBe(78_195);
    expect(diff.delta).toBe(39_097);
    expect(diff.status).toBe("review_required");
  });
});

describe("V3.1 — assurance-vie 990 I / 757 B", () => {
  it("reproduit le golden : 352 500 € pré-70 ans → taxable 200 000 € → 40 000 €", () => {
    const result = computeAssuranceVieTransmission({
      deathBenefitBefore70: 352_500,
      beneficiaries: 1,
    });
    expect(result.taxablePerBeneficiary990I).toBe(200_000);
    expect(result.tax990ITotal).toBe(40_000);
    expect(result.totalTax).toBe(40_000);
  });

  it("applique 31,25 % au-delà de 700 000 € de part taxable", () => {
    // 1 152 500 € → taxable 1 000 000 → 700 000 × 20 % + 300 000 × 31,25 % = 233 750 €
    const result = computeAssuranceVieTransmission({
      deathBenefitBefore70: 1_152_500,
      beneficiaries: 1,
    });
    expect(result.tax990ITotal).toBe(233_750);
  });

  it("partage l'abattement 152 500 € par bénéficiaire", () => {
    const result = computeAssuranceVieTransmission({
      deathBenefitBefore70: 400_000,
      beneficiaries: 2,
    });
    // 200 000 € chacun → taxable 47 500 € → 9 500 € chacun → 19 000 €
    expect(result.taxablePerBeneficiary990I).toBe(47_500);
    expect(result.tax990ITotal).toBe(19_000);
  });

  it("soumet le surplus de primes après 70 ans aux DMTG (757 B), produits exonérés", () => {
    const result = computeAssuranceVieTransmission({
      deathBenefitBefore70: 0,
      premiumsAfter70: 130_500,
      gainsAfter70: 40_000,
      relationship: "direct-line",
    });
    // 130 500 − 30 500 = 100 000 € → DMTG ligne directe = 404+404+573+16 814 = 18 195 €
    expect(result.taxablePremiums757B).toBe(100_000);
    expect(result.tax757B).toBe(18_195);
    expect(result.tax990ITotal).toBe(0);
  });

  it("exonère totalement le conjoint/PACS", () => {
    const result = computeAssuranceVieTransmission({
      deathBenefitBefore70: 800_000,
      premiumsAfter70: 200_000,
      spouseBeneficiary: true,
    });
    expect(result.totalTax).toBe(0);
    expect(result.exemptSpouse).toBe(true);
  });

  it("expose un TaxRun complet revu par notaire", () => {
    const run = simulateAssuranceVieTransmission();
    expect(run.module).toBe("assurance-vie");
    expect(assertSimulationHasProof(run)).toBe(true);
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
    expect(getSimulationByParam("assurance-vie")?.scenarioParam).toBe("assurance-vie");
    expect(ruleVersions.some((rule) => rule.id === "rule-dutreil-2026-v3" && rule.status === "active")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-assurance-vie-990i-757b-2026-v1")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-bofip-tcas-aut-60-2026")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-bofip-dmtg-reduction-790-2026")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-assurance-vie-transmission")).toBe(true);
  });
});
