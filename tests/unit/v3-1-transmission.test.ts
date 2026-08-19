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
  // PF-02B2 : aucun arrondi par tranche. Chaque tranche est calculée au
  // centime exact, le total est arrondi une seule fois à l'euro le plus
  // proche (BOFiP BOI-ENR-DG-30 § 100). Confirmé par l'exemple chiffré
  // officiel service-public.gouv.fr F14205 sur une base de 100 000 € :
  // 403,60 + 403,70 + 573,45 + 16 813,60 = 18 194,35 € → 18 194 € dus.
  it("reproduit le barème ligne directe sur 50 000 € : 403,60 + 403,70 + 573,45 + 6 813,60 = 8 194,35 € -> 8 194 €", () => {
    const result = computeDmtg({ taxableAfterAllowance: 50_000, relationship: "direct-line" });
    expect(result.tax).toBe(8_194);
    expect(result.marginalRate).toBe(0.2);
  });

  it("applique le tableau III frères/sœurs : 35 % puis 45 % au-delà de 24 430 €", () => {
    // 30 000 € : 24 430 × 35 % = 8 550,50 € + 5 570 × 45 % = 2 506,50 € = 11 057 € exact, arrondi une fois.
    const result = computeDmtg({ taxableAfterAllowance: 30_000, relationship: "sibling" });
    expect(result.tax).toBe(11_057);
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
    // 403,60 + 403,70 + 573,45 + (140 000 − 15 932) × 20 % (24 813,60) = 26 194,35 € -> 26 194 €
    expect(result.indicativeRights).toBe(26_194);
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

describe("V3.1 — Dutreil v4 (chaînage DMTG)", () => {
  /** Cas de référence : société 2 M€, 100 % opérationnelle, 1 bénéficiaire en ligne directe. */
  const base = {
    companyValue: 2_000_000,
    eligibleOperatingValue: 2_000_000,
    nonEligibleAssets: 0,
    children: 1,
    donorAge: 65,
  };

  it("chiffre l'économie vs sans pacte : 2 M€, donateur 65 ans → > 370 000 €", () => {
    const run = simulateDutreilV2(base);
    // Sans pacte : 1 900 000 € taxables → 617 394 € (arrondi final unique, inchangé).
    // Avec pacte : 400 000 € taxables → 78 194,35 € -> 78 194 €, puis réduction
    // art. 790 (50 %) → 39 097 € (PF-02B2 : arrondi final unique, BOI-ENR-DG-30).
    expect(run.computedResult?.rightsWithoutDutreil).toBe(617_394);
    expect(run.computedResult?.rightsBeforeArticle790).toBe(78_194);
    expect(run.computedResult?.rightsWithDutreil).toBe(39_097);
    expect(run.computedResult?.dutreilSavings).toBe(578_297);
    expect(Number(run.computedResult?.dutreilSavings)).toBeGreaterThan(370_000);
  });

  // --- GOLDEN CASES art. 790 CGI (TAX-P0-001) -------------------------------
  // Source : REGLEMENTATION_AOUT_2026.md § 7.5 et § 17 (registre P0).
  // L'article 790 CGI (réduction de 50 % des droits) est TOUJOURS en vigueur au
  // 18/08/2026 : il n'a pas été abrogé par la LF 2026. La V3 le confondait avec
  // l'ancien article 790 I et le désactivait après le 21/02/2026, ce qui
  // surévaluait les droits.
  it("golden — art. 790 : réduction 50 % maintenue pour une donation POSTÉRIEURE au 21/02/2026", () => {
    const run = simulateDutreilV2({ ...base, transmissionDate: "2026-06-01" });
    expect(run.computedResult?.fiftyPercentReductionApplicable).toBe(true);
    expect(run.computedResult?.article790ReductionRate).toBe(0.5);
    expect(run.computedResult?.rightsWithDutreil).toBe(39_097);
  });

  it("golden — art. 790 : réduction 50 % également acquise AVANT le 21/02/2026", () => {
    const run = simulateDutreilV2({ ...base, transmissionDate: "2026-01-15" });
    expect(run.computedResult?.fiftyPercentReductionApplicable).toBe(true);
    expect(run.computedResult?.rightsWithDutreil).toBe(39_097);
  });

  it("golden — art. 790 : non-régression du taux de 50 % au 18/08/2026", () => {
    expect(
      simulateDutreilV2({ ...base, transmissionDate: "2026-08-18" }).computedResult
        ?.article790ReductionRate,
    ).toBe(0.5);
  });

  it("golden — art. 790 : seuil d'âge du donateur (69 ans oui / 70 ans non)", () => {
    expect(
      simulateDutreilV2({ ...base, donorAge: 69 }).computedResult?.fiftyPercentReductionApplicable,
    ).toBe(true);
    expect(
      simulateDutreilV2({ ...base, donorAge: 70 }).computedResult?.fiftyPercentReductionApplicable,
    ).toBe(false);
    // Sans réduction, les droits restent à leur montant plein.
    expect(simulateDutreilV2({ ...base, donorAge: 70 }).computedResult?.rightsWithDutreil).toBe(
      78_194,
    );
  });

  it("golden — art. 790 : exclue hors pleine propriété et hors donation", () => {
    expect(
      simulateDutreilV2({ ...base, fullOwnership: false }).computedResult
        ?.fiftyPercentReductionApplicable,
    ).toBe(false);
    // L'article 790 ne vise que les donations, pas les successions.
    expect(
      simulateDutreilV2({ ...base, transmissionKind: "inheritance" }).computedResult
        ?.fiftyPercentReductionApplicable,
    ).toBe(false);
  });

  it("golden — art. 790 : pas de réduction si le pacte n'est pas éligible", () => {
    const run = simulateDutreilV2({ ...base, collectiveCommitmentSigned: false });
    expect(run.computedResult?.eligible).toBe(false);
    expect(run.computedResult?.fiftyPercentReductionApplicable).toBe(false);
  });

  // --- GOLDEN CASES pivot LF 2026 du 21/02/2026 (TAX-P0-007) ----------------
  // Engagement individuel : 4 ans avant le 21/02/2026, 6 ans à compter de cette
  // date. Les exclusions d'actifs LF 2026 ne sont pas rétroactives.
  it("golden — pivot 21/02/2026 : engagement individuel 4 ans avant, 6 ans après", () => {
    // 4 ans suffisent sous le régime antérieur.
    expect(
      simulateDutreilV2({
        ...base,
        transmissionDate: "2026-01-15",
        individualCommitmentYears: 4,
      }).computedResult?.eligible,
    ).toBe(true);
    // 4 ans ne suffisent plus à compter du 21/02/2026.
    expect(
      simulateDutreilV2({ ...base, individualCommitmentYears: 4 }).computedResult?.eligible,
    ).toBe(false);
  });

  it("golden — pivot 21/02/2026 : bascule exacte au jour près", () => {
    const eve = simulateDutreilV2({ ...base, transmissionDate: "2026-02-20" });
    expect(eve.computedResult?.lf2026RegimeApplied).toBe(false);
    expect(eve.computedResult?.requiredIndividualCommitmentYears).toBe(4);

    const pivot = simulateDutreilV2({ ...base, transmissionDate: "2026-02-21" });
    expect(pivot.computedResult?.lf2026RegimeApplied).toBe(true);
    expect(pivot.computedResult?.requiredIndividualCommitmentYears).toBe(6);
  });

  it("golden — exclusions d'actifs LF 2026 non rétroactives", () => {
    const luxury = { ...base, excludedLuxuryAssetsValue: 200_000 };
    // Avant le 21/02/2026 : exclusion non appliquée → base éligible intacte.
    expect(
      simulateDutreilV2({ ...luxury, transmissionDate: "2026-01-15", individualCommitmentYears: 4 })
        .computedResult?.exemptValue,
    ).toBe(1_500_000);
    // À compter du 21/02/2026 : exclusion appliquée.
    expect(simulateDutreilV2(luxury).computedResult?.exemptValue).toBe(1_350_000);
  });

  // --- GOLDEN CASE arrondi (PF-02B2) -----------------------------------------
  // Reproduit à l'identique le cas DUTREIL-2026-ARTICLE-790 de
  // docs/reference/2026-08/MOTEURS_FISCAUX_2026.ts (société 1 M€, donation
  // postérieure au 21/02/2026, donateur 65 ans, pleine propriété,
  // 1 bénéficiaire) : le référentiel attend 14 097 €. Avant PF-02B2, le
  // dépôt calculait 14 098 € (arrondi par tranche). Voir
  // docs/agent/PF02B_FISCAL_COMPLETENESS.md.
  it("golden — cas référentiel 1 M€ : réduction art. 790 → 14 097 € (arrondi final unique)", () => {
    const run = simulateDutreilV2({
      companyValue: 1_000_000,
      eligibleOperatingValue: 1_000_000,
      nonEligibleAssets: 0,
      children: 1,
      donorAge: 65,
      fullOwnership: true,
      transmissionDate: "2026-06-01",
      transmissionKind: "gift",
    });
    expect(run.computedResult?.rightsBeforeArticle790).toBe(28_194);
    expect(run.computedResult?.rightsWithDutreil).toBe(14_097);
  });

  it("préserve les invariants v2 (exonération 75 %, exclusions)", () => {
    expect(simulateDutreilV2().computedResult?.exemptValue).toBe(592_500);
    expect(simulateDutreilV2({ individualCommitmentYears: 5 }).computedResult?.exemptValue).toBe(0);
    const run = simulateDutreilV2();
    expect(run.steps.every((step) => step.ruleVersionId === "rule-dutreil-2026-v4")).toBe(true);
  });

  it("documente le diff v3 → v4 (rétablissement de la réduction art. 790)", () => {
    const diff = getDutreilRegulatoryDiff();
    // V3 : droits pleins 78 194 € → V4 : 39 097 € après réduction art. 790
    // (PF-02B2 : arrondi final unique à l'euro, BOI-ENR-DG-30).
    expect(diff.amountBefore).toBe(78_194);
    expect(diff.amountAfter).toBe(39_097);
    expect(diff.delta).toBe(-39_097);
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
    // 130 500 − 30 500 = 100 000 € → DMTG ligne directe = 403,60+403,70+573,45+16 813,60
    // = 18 194,35 € -> 18 194 € (golden officiel service-public.gouv.fr F14205).
    expect(result.taxablePremiums757B).toBe(100_000);
    expect(result.tax757B).toBe(18_194);
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
  it("documente le diff de règle DMTG (correction de l'arrondi par tranche, PF-02B2)", () => {
    const diff = getDmtgRegulatoryDiff();
    // L'ancienne V1 arrondissait chaque tranche avant sommation (16 390 € sur
    // le cas 300 000 €/2 enfants) ; la V2 applique l'arrondi final unique à
    // l'euro (BOI-ENR-DG-30 § 100), soit 16 388 €.
    expect(diff.amountBefore).toBe(16_390);
    expect(diff.amountAfter).toBe(16_388);
    expect(diff.delta).toBe(-2);
    expect(diff.status).toBe("review_required");
  });

  it("déclare règles, sources, limites et catalogue", () => {
    expect(ruleVersions.some((rule) => rule.id === "rule-dmtg-bareme-2026-v2" && rule.status === "active")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-demembrement-669-2026-v1" && rule.status === "active")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-impots-dmtg-bareme-2026")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-legifrance-cgi-669-2026")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-dmtg-multi-liens")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-demembrement-ifi-968")).toBe(true);
    expect(getSimulationByParam("demembrement")?.scenarioParam).toBe("demembrement");
    expect(getSimulationByParam("usufruit")?.scenarioParam).toBe("demembrement");
    expect(getSimulationByParam("assurance-vie")?.scenarioParam).toBe("assurance-vie");
    // V4 active (correction art. 790), V3 archivée : cycle de vie draft → active → archived.
    expect(ruleVersions.some((rule) => rule.id === "rule-dutreil-2026-v4" && rule.status === "active")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-dutreil-2026-v3" && rule.status === "archived")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-assurance-vie-990i-757b-2026-v1")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-bofip-tcas-aut-60-2026")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-bofip-dmtg-reduction-790-2026")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-assurance-vie-transmission")).toBe(true);
  });
});
