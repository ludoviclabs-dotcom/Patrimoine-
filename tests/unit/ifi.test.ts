import { describe, expect, it } from "vitest";
import { demoHousehold } from "../../lib/demo-data/household";
import { calculateIfi } from "../../lib/simulations/ifi";
import type { Asset, DataQualityProfile, Household, Liability } from "../../lib/types";

const dq: DataQualityProfile = {
  status: "user_declared",
  expectedAction: "Vérifier avec le dossier.",
  validationStatus: "not_started",
};

function makeAsset(overrides: Partial<Asset> & Pick<Asset, "id" | "value">): Asset {
  return {
    label: overrides.id,
    category: "real-estate",
    ifiKind: "rental",
    dataQuality: dq,
    ...overrides,
  };
}

function makeLiability(overrides: Partial<Liability> & Pick<Liability, "id" | "value">): Liability {
  return {
    label: overrides.id,
    linkedCategory: "real-estate",
    dataQuality: dq,
    ...overrides,
  };
}

function makeHousehold(assets: Asset[], liabilities: Liability[] = []): Household {
  return {
    id: "household-pf02b1-test",
    name: "Ménage test PF-02B1",
    profile: "Test golden IFI",
    members: ["Testeur"],
    children: 0,
    fiscalResidence: "France",
    professionalContext: "Test",
    assets,
    liabilities,
    objectives: [],
  };
}

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

describe("PF-02B1 — IFI advanced deterministic rules", () => {
  describe("seuil d'assujettissement (CGI art. 964)", () => {
    it("juste sous le seuil : 1 299 999 € -> hors IFI", () => {
      const run = calculateIfi(makeHousehold([makeAsset({ id: "a", value: 1_299_999 })]));
      expect(run.result.triggered).toBe(false);
      expect(run.result.netIfi).toBe(0);
    });

    it("seuil exact : 1 300 000 € -> hors IFI (comparaison strictement supérieure)", () => {
      const run = calculateIfi(makeHousehold([makeAsset({ id: "a", value: 1_300_000 })]));
      expect(run.result.triggered).toBe(false);
      expect(run.result.netIfi).toBe(0);
    });

    it("juste au-dessus du seuil : 1 300 001 € -> IFI dû", () => {
      const run = calculateIfi(makeHousehold([makeAsset({ id: "a", value: 1_300_001 })]));
      expect(run.result.triggered).toBe(true);
      expect(run.result.grossIfi).toBe(2_500);
      expect(run.result.discount).toBe(1_250);
      expect(run.result.netIfi).toBe(1_250);
    });
  });

  describe("décote (CGI art. 977)", () => {
    it("zone de décote : base 1 310 000 € -> barème 2 570 €, décote 1 125 €, IFI net 1 445 € (golden référentiel)", () => {
      const run = calculateIfi(makeHousehold([makeAsset({ id: "a", value: 1_310_000 })]));
      expect(run.result.grossIfi).toBe(2_570);
      expect(run.result.discount).toBe(1_125);
      expect(run.result.netIfi).toBe(1_445);
    });

    it("sortie de décote : base 1 400 000 € -> décote nulle exactement à la borne", () => {
      const run = calculateIfi(makeHousehold([makeAsset({ id: "a", value: 1_400_000 })]));
      expect(run.result.discount).toBe(0);
      expect(run.result.netIfi).toBe(3_200);
    });

    it("au-delà de la zone de décote : base 1 400 001 € -> décote nulle, autre branche de calcul", () => {
      const run = calculateIfi(makeHousehold([makeAsset({ id: "a", value: 1_400_001 })]));
      expect(run.result.discount).toBe(0);
      expect(run.result.netIfi).toBe(3_200);
    });
  });

  describe("dettes (CGI art. 974)", () => {
    it("dette ordinaire : capital restant dû retenu tel quel (comportement historique inchangé)", () => {
      const run = calculateIfi(
        makeHousehold(
          [makeAsset({ id: "a", value: 1_000_000 })],
          [makeLiability({ id: "d", value: 300_000 })],
        ),
      );
      expect(run.result.deductibleDebt).toBe(300_000);
      expect(run.result.taxableBase).toBe(700_000);
    });

    it("dette importante : actifs 6 M€, dette 5,5 M€ -> plafonnée à 4,55 M€ (golden référentiel art. 974, IV)", () => {
      const run = calculateIfi(
        makeHousehold(
          [makeAsset({ id: "a", value: 6_000_000 })],
          [makeLiability({ id: "d", value: 5_500_000 })],
        ),
      );
      expect(run.result.debtBeforeGlobalCap).toBe(5_500_000);
      expect(run.result.debtAfterGlobalCap).toBe(4_550_000);
      expect(run.result.debtCapReduction).toBe(950_000);
      expect(run.result.deductibleDebt).toBe(4_550_000);
      expect(run.result.taxableBase).toBe(1_450_000);
    });

    it("dette importante sur preuve d'objectif non principalement fiscal : plafonnement écarté", () => {
      const run = calculateIfi(
        makeHousehold(
          [makeAsset({ id: "a", value: 6_000_000 })],
          [makeLiability({ id: "d", value: 5_500_000 })],
        ),
        { excessiveDebtNonTaxPurposeProven: true },
      );
      expect(run.result.debtAfterGlobalCap).toBe(5_500_000);
      expect(run.result.deductibleDebt).toBe(5_500_000);
    });

    it("prêt in fine : amortissement légal sur la durée du prêt (5 ans écoulés sur 10)", () => {
      const run = calculateIfi(
        makeHousehold(
          [makeAsset({ id: "a", value: 1_000_000 })],
          [
            makeLiability({
              id: "d",
              value: 400_000,
              ifiRepaymentKind: "bullet-or-nonconstant",
              ifiOriginalPrincipal: 400_000,
              ifiDisbursementDate: "2016-01-01",
              ifiContractualEndDate: "2026-01-01",
            }),
          ],
        ),
        { valuationDate: "2021-01-01" },
      );
      expect(run.result.deductibleDebt).toBe(200_000);
      expect(run.result.taxableBase).toBe(800_000);
    });

    it("prêt sans terme : réduction d'1/20e par an (10 ans écoulés)", () => {
      const run = calculateIfi(
        makeHousehold(
          [makeAsset({ id: "a", value: 1_000_000 })],
          [
            makeLiability({
              id: "d",
              value: 300_000,
              ifiRepaymentKind: "no-term",
              ifiOriginalPrincipal: 300_000,
              ifiDisbursementDate: "2016-01-01",
            }),
          ],
        ),
        { valuationDate: "2026-01-01" },
      );
      expect(run.result.deductibleDebt).toBe(150_000);
      expect(run.result.taxableBase).toBe(850_000);
    });

    it("dette liée : non déduite sans preuve, déduite normalement si l'objectif non fiscal est prouvé", () => {
      const household = makeHousehold(
        [makeAsset({ id: "a", value: 1_000_000 })],
        [makeLiability({ id: "d", value: 200_000, ifiRelatedPartyDebt: true })],
      );

      const unproven = calculateIfi(household);
      expect(unproven.result.deductibleDebt).toBe(0);
      expect(unproven.result.taxableBase).toBe(1_000_000);

      const proven = calculateIfi({
        ...household,
        liabilities: [{ ...household.liabilities[0], ifiNonTaxPurposeProven: true }],
      });
      expect(proven.result.deductibleDebt).toBe(200_000);
      expect(proven.result.taxableBase).toBe(800_000);
    });

    it("données insuffisantes pour un prêt in fine : dette non déduite et signalée, jamais estimée", () => {
      const missingEndDate = calculateIfi(
        makeHousehold(
          [makeAsset({ id: "a", value: 1_000_000 })],
          [
            makeLiability({
              id: "d",
              value: 400_000,
              ifiRepaymentKind: "bullet-or-nonconstant",
              ifiOriginalPrincipal: 400_000,
              ifiDisbursementDate: "2016-01-01",
            }),
          ],
        ),
        { valuationDate: "2021-01-01" },
      );
      expect(missingEndDate.result.deductibleDebt).toBe(0);
      expect(missingEndDate.result.taxableBase).toBe(1_000_000);

      const missingValuationDate = calculateIfi(
        makeHousehold(
          [makeAsset({ id: "a", value: 1_000_000 })],
          [
            makeLiability({
              id: "d",
              value: 300_000,
              ifiRepaymentKind: "no-term",
              ifiOriginalPrincipal: 300_000,
              ifiDisbursementDate: "2016-01-01",
            }),
          ],
        ),
      );
      expect(missingValuationDate.result.deductibleDebt).toBe(0);
      expect(missingValuationDate.result.taxableBase).toBe(1_000_000);
    });
  });

  describe("démembrement (CGI art. 968)", () => {
    it("règle générale : usufruitier taxé sur la pleine valeur sans exception documentée", () => {
      const run = calculateIfi(
        makeHousehold([makeAsset({ id: "a", value: 500_000, ifiOwnershipRight: "usufructuary" })]),
      );
      expect(run.result.taxableRealEstateBeforeDebt).toBe(500_000);
      const step = run.steps.find((s) => s.id === "ifi-step-dismemberment-general-rule");
      expect(step).toBeTruthy();
      expect(step?.confidenceStatus).toBe("needs_review");
      expect(step?.outputValue).toBe(500_000);
    });

    it("règle générale : nu-propriétaire non taxé sans exception documentée", () => {
      const run = calculateIfi(
        makeHousehold([makeAsset({ id: "a", value: 500_000, ifiOwnershipRight: "bare-owner" })]),
      );
      expect(run.result.taxableRealEstateBeforeDebt).toBe(0);
    });

    it("exception art. 968 avec fondement et âge : répartition selon le barème art. 669 (usufruitier 75 ans -> 30 %)", () => {
      const run = calculateIfi(
        makeHousehold([
          makeAsset({
            id: "a",
            value: 1_000_000,
            ifiOwnershipRight: "usufructuary",
            ifiDismembermentBasis: "legal-usufruct-surviving-spouse",
            ifiUsufructuaryAge: 75,
          }),
        ]),
      );
      expect(run.result.taxableRealEstateBeforeDebt).toBe(300_000);
      const step = run.steps.find((s) => s.id === "ifi-step-dismemberment-exception");
      expect(step).toBeTruthy();
      expect(step?.confidenceStatus).toBe("needs_review");
    });

    it("exception art. 968 côté nu-propriétaire, même âge : part complémentaire (70 %)", () => {
      const run = calculateIfi(
        makeHousehold([
          makeAsset({
            id: "a",
            value: 1_000_000,
            ifiOwnershipRight: "bare-owner",
            ifiDismembermentBasis: "legal-usufruct-surviving-spouse",
            ifiUsufructuaryAge: 75,
          }),
        ]),
      );
      expect(run.result.taxableRealEstateBeforeDebt).toBe(700_000);
    });

    it("exception invoquée mais âge manquant : repli sur la règle générale, jamais de répartition présumée", () => {
      const run = calculateIfi(
        makeHousehold([
          makeAsset({
            id: "a",
            value: 1_000_000,
            ifiOwnershipRight: "usufructuary",
            ifiDismembermentBasis: "legal-usufruct-surviving-spouse",
          }),
        ]),
      );
      expect(run.result.taxableRealEstateBeforeDebt).toBe(1_000_000);
      expect(run.steps.find((s) => s.id === "ifi-step-dismemberment-exception")).toBeUndefined();
      expect(run.steps.find((s) => s.id === "ifi-step-dismemberment-general-rule")).toBeTruthy();
    });
  });

  describe("actif professionnel déclaré (CGI art. 975)", () => {
    it("exclut l'actif professionnel de l'assiette et l'expose dans une étape de revue dédiée", () => {
      const run = calculateIfi(
        makeHousehold([
          makeAsset({ id: "pro", value: 1_000_000, isProfessionalAsset: true }),
          makeAsset({ id: "ordinaire", value: 400_000 }),
        ]),
      );
      expect(run.result.taxableRealEstateBeforeDebt).toBe(400_000);
      expect(run.result.professionalAssetsExcludedValue).toBe(1_000_000);
      const step = run.steps.find((s) => s.id === "ifi-step-professional-assets");
      expect(step).toBeTruthy();
      expect(step?.confidenceStatus).toBe("needs_review");
      expect(step?.outputValue).toBe(0);
    });
  });

  describe("SCI complexe nécessitant revue (non-régression)", () => {
    it("conserve les parts de SCI dans l'assiette avec un statut needs_review", () => {
      const run = calculateIfi(demoHousehold);
      const step = run.steps.find((s) => s.id === "ifi-step-sci");
      expect(step?.confidenceStatus).toBe("needs_review");
      expect(step?.outputValue).toBe(300_000);
    });
  });

  describe("plafonnement global à 75 % (CGI art. 979)", () => {
    it("à la borne exacte : non applique", () => {
      const run = calculateIfi(makeHousehold([makeAsset({ id: "a", value: 1_500_000 })]), {
        annualIncome: 5_200,
        otherTaxes: 0,
      });
      expect(run.result.grossIfi).toBe(3_900);
      expect(run.result.capApplied).toBe(false);
      expect(run.result.netIfi).toBe(3_900);
    });

    it("juste au-delà de la borne : plafonnement applique", () => {
      const run = calculateIfi(makeHousehold([makeAsset({ id: "a", value: 1_500_000 })]), {
        annualIncome: 5_199,
        otherTaxes: 0,
      });
      expect(run.result.capApplied).toBe(true);
      expect(run.result.netIfi).toBe(3_899);
    });
  });
});
