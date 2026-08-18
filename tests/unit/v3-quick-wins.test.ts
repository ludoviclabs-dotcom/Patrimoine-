import { describe, expect, it } from "vitest";
import { simulationCatalog, getSimulationByParam } from "../../lib/cabinet-refonte/v2-6";
import { coverageLimits } from "../../lib/coverage/limits";
import { getPvImmoRegulatoryDiff } from "../../lib/evidence/pv-immo-rule-diff";
import { evidenceSources } from "../../lib/evidence/sources";
import { ruleVersions } from "../../lib/rules/rule-versions";
import { getAllTaxRuns, getV3TaxRuns } from "../../lib/tax/engines";
import { computeIrBareme2026, simulateIrBareme2026 } from "../../lib/tax/engines/ir";
import { computePfuVsBareme, simulatePfuVsBareme } from "../../lib/tax/engines/pfu-arbitrage";
import { computePvImmo, simulatePvImmoV3 } from "../../lib/tax/engines/pv-immo";
import { simulateIrPfuCdhr, simulateRealEstateGainV2 } from "../../lib/tax/v2-engines";
import { assertSimulationHasProof, goldenCases } from "../../lib/validation/golden-cases";

describe("V3 quick wins — IR barème 2026", () => {
  it("reproduit l'exemple officiel : célibataire 30 000 € → 2 103,99 €, TMI 30 %, taux moyen 7,01 %", () => {
    const result = computeIrBareme2026({ taxableIncome: 30_000, situation: "single" });
    expect(result.incomeTax).toBe(2_103.99);
    expect(result.marginalRate).toBe(0.3);
    expect(result.averageRatePercent).toBe(7.01);
    expect(result.decote).toBe(0);
  });

  it("applique la décote sous le seuil (célibataire 20 000 €)", () => {
    // IR brut = (20 000 − 11 600) × 11 % = 924 € < 1 982 € →
    // décote = 897 − 45,25 % × 924 = 478,89 € → IR = 445,11 €
    const result = computeIrBareme2026({ taxableIncome: 20_000, situation: "single" });
    expect(result.taxAfterCap).toBe(924);
    expect(result.decote).toBe(478.89);
    expect(result.incomeTax).toBe(445.11);
  });

  it("plafonne le quotient familial à 1 807 € par demi-part", () => {
    // Couple 200 000 €, 2 enfants (2 demi-parts) :
    // IR 3 parts = 39 311,97 ; IR 2 parts = 49 601,04 ; avantage 10 289,07 > 3 614
    // → IR final = 49 601,04 − 3 614 = 45 987,04
    const result = computeIrBareme2026({
      taxableIncome: 200_000,
      situation: "couple",
      childrenHalfParts: 2,
    });
    expect(result.quotientCapped).toBe(true);
    expect(result.taxAfterCap).toBe(45_987.04);
  });

  it("calcule la CEHR au-delà de 250 k€ (célibataire)", () => {
    // RFR 600 000 : 3 % × 250 000 + 4 % × 100 000 = 11 500 €
    const result = computeIrBareme2026({ taxableIncome: 600_000, situation: "single" });
    expect(result.cehr).toBe(11_500);
    expect(result.cdhrApplicable).toBe(true);
  });

  it("ne déclenche pas la CDHR quand IR + CEHR dépassent déjà 20 % du RFR", () => {
    const result = computeIrBareme2026({ taxableIncome: 600_000, situation: "single" });
    // IR ≈ 234 000 € > 120 000 € (20 % du RFR) → CDHR nulle
    expect(result.cdhr).toBe(0);
  });

  it("expose un TaxRun complet avec preuves", () => {
    const run = simulateIrBareme2026();
    expect(run.module).toBe("ir-bareme");
    expect(run.scenario).toBe("ir");
    expect(assertSimulationHasProof(run)).toBe(true);
    expect(run.steps).toHaveLength(6);
  });
});

describe("V3 quick wins — plus-value immobilière v2", () => {
  it("reproduit l'exemple officiel : PV 66 250 €, 16 ans → IR 4 279 € / PS 9 326 €", () => {
    // L'exemple du rapport d'audit (« 15 ans ») correspond mathématiquement à
    // 16 années révolues — calé sur le barème art. 150 VC (tolérance ±2 €).
    const result = computePvImmo({
      salePrice: 266_250,
      purchasePrice: 200_000,
      acquisitionCosts: 0,
      works: 0,
      yearsHeld: 16,
    });
    expect(result.grossGain).toBe(66_250);
    expect(result.incomeTax).toBe(4_279);
    expect(result.socialTax).toBe(9_326);
    expect(result.surtax).toBe(0);
  });

  it("applique les forfaits acquisition 7,5 % et travaux 15 %", () => {
    const result = computePvImmo({
      salePrice: 500_000,
      purchasePrice: 300_000,
      acquisitionCosts: 0,
      works: 0,
      yearsHeld: 10,
      useAcquisitionLumpSum: true,
      useWorksLumpSum: true,
    });
    expect(result.retainedAcquisitionCosts).toBe(22_500);
    expect(result.retainedWorks).toBe(45_000);
    expect(result.grossGain).toBe(132_500);
  });

  it("refuse le forfait travaux à 5 ans de détention ou moins", () => {
    const result = computePvImmo({ yearsHeld: 5, useWorksLumpSum: true, works: 10_000 });
    expect(result.worksLumpSumApplicable).toBe(false);
    expect(result.retainedWorks).toBe(10_000);
  });

  it("garde le wrapper v2 fonctionnel (non-régression de surface)", () => {
    expect(
      simulateRealEstateGainV2({
        isMainResidence: true,
        mainResidenceQualification: { occupiedAtSale: true },
      }).resultAmount,
    ).toBe(0);
    expect(simulateRealEstateGainV2({ yearsHeld: 9 }).resultAmount).toBeGreaterThan(0);
    const run = simulatePvImmoV3();
    expect(run.steps.every((step) => step.ruleVersionId === "rule-plus-value-immobiliere-2026-v3")).toBe(true);
  });

  it("documente le diff de règle v1 → v2 avec dossiers à recalculer", () => {
    const diff = getPvImmoRegulatoryDiff();
    expect(diff.status).toBe("review_required");
    expect(diff.impactedRuns.length).toBeGreaterThan(0);
    expect(diff.amountAfter).toBe(4_279 + 9_326);
  });

  // --- GOLDEN CASES résidence principale (TAX-P0-006) -----------------------
  // Source : REGLEMENTATION_AOUT_2026.md § 17 (TAX-P0-006), § 5.6 protocole
  // PF-01B, CGI art. 150 U II-1°, BOFiP RFPI-PVI-10-40-10. Un booléen
  // `isMainResidence` déclaré seul ne doit plus jamais produire une
  // exonération totale automatique.
  describe("V3.5 — exonération résidence principale qualifiée (TAX-P0-006)", () => {
    const base = {
      salePrice: 720_000,
      purchasePrice: 420_000,
      acquisitionCosts: 31_500,
      works: 35_000,
      yearsHeld: 9,
    } as const;
    const normalTax = { incomeTax: 33_717, socialTax: 37_511, surtax: 7_098, estimatedTax: 78_326 };

    it("golden 1 — résidence principale clairement éligible : occupation confirmée au jour de la cession", () => {
      const result = computePvImmo({
        ...base,
        isMainResidence: true,
        mainResidenceQualification: { occupiedAtSale: true },
      });
      expect(result.mainResidenceAssessment).toBe("eligible");
      expect(result.mainResidenceExempt).toBe(true);
      expect(result.estimatedTax).toBe(0);
    });

    it("golden 2 — résidence secondaire : imposition normale, aucune exonération évaluée", () => {
      const result = computePvImmo(base);
      expect(result.isMainResidence).toBe(false);
      expect(result.mainResidenceAssessment).toBeNull();
      expect(result.mainResidenceExempt).toBe(false);
      expect(result.estimatedTax).toBe(normalTax.estimatedTax);
    });

    it("golden 3 — résidence principale déclarée mais informations insuffisantes : needs_review, jamais d'exonération automatique", () => {
      const result = computePvImmo({ ...base, isMainResidence: true });
      expect(result.mainResidenceAssessment).toBe("needs_review");
      expect(result.mainResidenceExempt).toBe(false);
      expect(result.estimatedTax).toBe(normalTax.estimatedTax);
      expect(result.mainResidenceAssessmentReason).toMatch(/non renseignée/);
    });

    it("golden 4 — départ avant cession : tolérance BOFiP appliquée si vente diligente dans l'année", () => {
      const withinDelay = computePvImmo({
        ...base,
        isMainResidence: true,
        mainResidenceQualification: {
          occupiedAtSale: false,
          vacantWithActiveSaleEffort: true,
          monthsBetweenVacatingAndSale: 6,
        },
      });
      expect(withinDelay.mainResidenceAssessment).toBe("eligible");
      expect(withinDelay.estimatedTax).toBe(0);

      // Pile au seuil légal d'un an : encore éligible.
      const atThreshold = computePvImmo({
        ...base,
        isMainResidence: true,
        mainResidenceQualification: {
          occupiedAtSale: false,
          vacantWithActiveSaleEffort: true,
          monthsBetweenVacatingAndSale: 12,
        },
      });
      expect(atThreshold.mainResidenceAssessment).toBe("eligible");

      // Au-delà d'un an : nécessite une appréciation professionnelle, pas d'exonération automatique.
      const overDelay = computePvImmo({
        ...base,
        isMainResidence: true,
        mainResidenceQualification: {
          occupiedAtSale: false,
          vacantWithActiveSaleEffort: true,
          monthsBetweenVacatingAndSale: 18,
        },
      });
      expect(overDelay.mainResidenceAssessment).toBe("needs_review");
      expect(overDelay.mainResidenceExempt).toBe(false);
      expect(overDelay.estimatedTax).toBe(normalTax.estimatedTax);
    });

    it("golden 5 — bien vacant, situation ambiguë : needs_review plutôt qu'une exclusion arbitraire", () => {
      const result = computePvImmo({
        ...base,
        isMainResidence: true,
        mainResidenceQualification: { occupiedAtSale: false },
      });
      expect(result.mainResidenceAssessment).toBe("needs_review");
      expect(result.mainResidenceExempt).toBe(false);
      expect(result.estimatedTax).toBe(normalTax.estimatedTax);

      // Vacance établie sans diligence de vente (loué/prêté) : exclusion positive, pas une ambiguïté.
      const noEffort = computePvImmo({
        ...base,
        isMainResidence: true,
        mainResidenceQualification: { occupiedAtSale: false, vacantWithActiveSaleEffort: false },
      });
      expect(noEffort.mainResidenceAssessment).toBe("not-eligible");
      expect(noEffort.mainResidenceExempt).toBe(false);
    });

    it("golden 6 — un needs_review ne bénéficie jamais silencieusement d'une exonération complète", () => {
      const scenarios = [
        computePvImmo({ ...base, isMainResidence: true }),
        computePvImmo({
          ...base,
          isMainResidence: true,
          mainResidenceQualification: { occupiedAtSale: false },
        }),
        computePvImmo({
          ...base,
          isMainResidence: true,
          mainResidenceQualification: {
            occupiedAtSale: false,
            vacantWithActiveSaleEffort: true,
            monthsBetweenVacatingAndSale: 24,
          },
        }),
      ];
      for (const result of scenarios) {
        expect(result.mainResidenceAssessment).toBe("needs_review");
        expect(result.mainResidenceExempt).toBe(false);
        expect(result.incomeTaxAllowanceRate).toBeLessThan(1);
        expect(result.estimatedTax).toBeGreaterThan(0);
      }
    });

    it("golden 7 — le run complet reflète l'étape dédiée et le statut needs_review sans exonération", () => {
      const run = simulatePvImmoV3({ ...base, isMainResidence: true });
      const step = run.steps.find((s) => s.id === "pvi-step-main-residence");
      expect(step).toBeDefined();
      expect(step?.confidenceStatus).toBe("needs_review");
      expect(step?.ruleVersionId).toBe("rule-plus-value-immobiliere-2026-v3");
      expect(step?.coverageLimitIds).toContain("coverage-plus-value-main-residence");
      expect(run.resultAmount).toBe(normalTax.estimatedTax);
      expect(run.resultLabel).toMatch(/revue requise/);

      // Résidence secondaire : pas d'étape résidence principale du tout.
      const secondaryRun = simulatePvImmoV3(base);
      expect(secondaryRun.steps.some((s) => s.id === "pvi-step-main-residence")).toBe(false);
    });
  });
});

describe("V3 quick wins — PFU vs barème", () => {
  it("reproduit l'exemple de référence : 1 000 € dividendes TMI 11 % → barème 238 € < PFU 314 €", () => {
    const result = computePfuVsBareme({ dividends: 1_000, tmi: 0.11, psRateAtBareme: 0.172 });
    expect(result.pfuTotal).toBe(314);
    expect(result.baremeTotal).toBe(238);
    expect(result.winner).toBe("bareme");
  });

  it("bascule vers le PFU à TMI 30 % avec PS 18,6 % (défaut LFSS 2026)", () => {
    const result = computePfuVsBareme({ dividends: 1_000, tmi: 0.3 });
    expect(result.baremeTotal).toBe(366);
    expect(result.pfuTotal).toBe(314);
    expect(result.winner).toBe("pfu");
  });

  it("applique les abattements 50 %/65 % aux titres pré-2018", () => {
    const eightYears = computePfuVsBareme({
      dividends: 0,
      gains: 10_000,
      tmi: 0.3,
      titlesPre2018: true,
      holdingYears: 9,
    });
    expect(eightYears.gainsAllowanceRate).toBe(0.65);
    expect(eightYears.baremeIncomeTax).toBe(1_050);
  });

  it("affiche la CSG déductible sans la déduire du total de l'année", () => {
    const result = computePfuVsBareme({ dividends: 1_000, tmi: 0.3 });
    expect(result.deductibleCsgSaving).toBe(20.4);
    expect(result.baremeTotal).toBe(366);
  });

  it("expose un TaxRun complet avec limite assurance-vie 30 %", () => {
    const run = simulatePfuVsBareme();
    expect(assertSimulationHasProof(run)).toBe(true);
    expect(run.coverageLimitIds).toContain("coverage-pfu-assurance-vie-30");
  });
});

describe("V3 quick wins — intégration produit", () => {
  it("agrège les runs v2 + v3 sans casser le set v2", () => {
    const all = getAllTaxRuns();
    const v3 = getV3TaxRuns();
    expect(v3.map((run) => run.module)).toEqual([
      "ir-bareme",
      "pfu-arbitrage",
      "demembrement",
      "assurance-vie",
      "is",
      "sci-arbitrage",
      "exit-tax",
    ]);
    expect(all.length).toBe(13 + v3.length);
  });

  it("garde la CDHR v2 alignée sur la délégation ir.ts", () => {
    const run = simulateIrPfuCdhr({ taxableIncome: 420_000, capitalIncome: 140_000 });
    // RFR 560 000 ≥ 500 000 → plancher 20 % = 112 000 ; déjà dû 58 000 + 43 960
    expect(run.computedResult?.cdhr).toBe(10_040);
  });

  it("déclare règles, sources, limites et catalogue pour les nouveaux moteurs", () => {
    expect(ruleVersions.some((rule) => rule.id === "rule-ir-bareme-2026-v1" && rule.status === "active")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-pfu-arbitrage-2026-v1")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-plus-value-immobiliere-2026-v2")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-service-public-bareme-ir-2026")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-legifrance-lfss-2026-ps-capital")).toBe(true);
    expect(coverageLimits.some((limit) => limit.id === "coverage-ir-bareme-2026")).toBe(true);
    expect(getSimulationByParam("ir")?.scenarioParam).toBe("ir");
    expect(getSimulationByParam("flat-tax")?.scenarioParam).toBe("pfu");
    expect(simulationCatalog.every((item) => item.reviewRequired)).toBe(true);
  });

  it("garde les golden cases IR et PFU au statut pass", () => {
    const irGolden = goldenCases.find((goldenCase) => goldenCase.id.includes("ir-2026"));
    const pfuGolden = goldenCases.find((goldenCase) => goldenCase.id.includes("pfu-vs-bar"));
    expect(irGolden?.executionStatus).toBe("pass");
    expect(pfuGolden?.executionStatus).toBe("pass");
  });
});
