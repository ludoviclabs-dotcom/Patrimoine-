import { describe, expect, it } from "vitest";
import {
  assessHoldingAnimatrice,
  HOLDING_ANIMATRICE_RULE_ID,
  HOLDING_ANIMATRICE_SOURCE_REFS,
  type HoldingAnimatriceFacts,
} from "../../lib/tax/holding-animatrice";
import { simulateDutreilV2 } from "../../lib/tax/v2-engines";

const QUALIFIED_FACTS: HoldingAnimatriceFacts = {
  groupPolicyActivelyLed: true,
  subsidiariesControlled: true,
  operationalSubsidiariesActivityProven: true,
  animationIsPrincipalActivity: true,
  internalServicesProvided: true,
  contemporaneousEvidenceTypes: ["proces-verbaux", "conventions", "reporting"],
  taxableEventDate: "2026-06-11",
  professionalValidationConfirmed: true,
};

describe("PF-02B3 — assessHoldingAnimatrice (CGI art. 787 B, al. 1-2)", () => {
  it("holding clairement animatrice, faits suffisants -> QUALIFIED", () => {
    const result = assessHoldingAnimatrice(QUALIFIED_FACTS);
    expect(result.qualification).toBe("QUALIFIED");
    expect(result.missingFacts).toEqual([]);
    expect(result.factsConsidered.length).toBeGreaterThan(0);
    expect(result.ruleVersionId).toBe(HOLDING_ANIMATRICE_RULE_ID);
    expect(result.sourceRefs).toEqual(HOLDING_ANIMATRICE_SOURCE_REFS);
    expect(result.reviewReason).toBeTruthy();
  });

  it("holding purement passive (filiales patrimoniales non prouvées opérationnelles) -> NOT_QUALIFIED", () => {
    const result = assessHoldingAnimatrice({
      groupPolicyActivelyLed: true,
      subsidiariesControlled: true,
      operationalSubsidiariesActivityProven: false,
      animationIsPrincipalActivity: false,
      contemporaneousEvidenceTypes: [],
    });
    expect(result.qualification).toBe("NOT_QUALIFIED");
    expect(result.reviewReason).toContain("expressément écarté");
    expect(result.reviewReason).toContain("art. 787 B, al. 1");
  });

  it("activité mixte : ratio d'actifs favorable mais validation professionnelle absente -> NEEDS_REVIEW, jamais de safe harbor sur le ratio", () => {
    const result = assessHoldingAnimatrice({
      ...QUALIFIED_FACTS,
      operationalAssetRatio: 0.55,
      professionalValidationConfirmed: undefined,
    });
    expect(result.qualification).toBe("NEEDS_REVIEW");
    expect(result.missingFacts).toContain("Validation professionnelle confirmée");
    expect(result.reviewReason).not.toMatch(/ratio/i);
    expect(result.factsConsidered.some((f) => f.includes("55 %"))).toBe(true);
  });

  it("données incomplètes (critères cumulatifs non renseignés) -> NEEDS_REVIEW", () => {
    const result = assessHoldingAnimatrice({
      groupPolicyActivelyLed: true,
      // subsidiariesControlled, operationalSubsidiariesActivityProven et
      // animationIsPrincipalActivity : non renseignés.
    });
    expect(result.qualification).toBe("NEEDS_REVIEW");
    expect(result.missingFacts).toContain("Contrôle direct ou indirect des filiales");
    expect(result.missingFacts).toContain("Activité opérationnelle des filiales prouvée au fait générateur");
    expect(result.missingFacts).toContain("Animation retenue comme activité principale de la holding");
  });

  it("contradiction entre déclaratif et preuves : critères déclarés réunis, aucune preuve contemporaine -> NEEDS_REVIEW", () => {
    const result = assessHoldingAnimatrice({
      groupPolicyActivelyLed: true,
      subsidiariesControlled: true,
      operationalSubsidiariesActivityProven: true,
      animationIsPrincipalActivity: true,
      contemporaneousEvidenceTypes: [],
      professionalValidationConfirmed: true,
    });
    expect(result.qualification).toBe("NEEDS_REVIEW");
    expect(result.reviewReason).toContain("aucune preuve contemporaine");
    expect(result.reviewReason).toContain("24-17.415");
  });

  it("absence de preuve (jamais rassemblée) -> NEEDS_REVIEW", () => {
    const result = assessHoldingAnimatrice({
      groupPolicyActivelyLed: true,
      subsidiariesControlled: true,
      operationalSubsidiariesActivityProven: true,
      animationIsPrincipalActivity: true,
      // contemporaneousEvidenceTypes non renseigné du tout.
      professionalValidationConfirmed: true,
    });
    expect(result.qualification).toBe("NEEDS_REVIEW");
    expect(result.missingFacts).toContain("Preuves contemporaines rassemblées");
  });

  it("faits complets et preuves réunies mais validation professionnelle non confirmée -> NEEDS_REVIEW", () => {
    const result = assessHoldingAnimatrice({
      groupPolicyActivelyLed: true,
      subsidiariesControlled: true,
      operationalSubsidiariesActivityProven: true,
      animationIsPrincipalActivity: true,
      contemporaneousEvidenceTypes: ["decisions", "moyens-humains"],
      professionalValidationConfirmed: false,
    });
    expect(result.qualification).toBe("NEEDS_REVIEW");
    expect(result.reviewReason).toContain("validation professionnelle");
  });

  it("aucun appel ne produit jamais QUALIFIED sans les cinq garanties réunies", () => {
    // Faisceau volontairement incomplet : ne doit jamais basculer QUALIFIED.
    const variants: HoldingAnimatriceFacts[] = [
      { ...QUALIFIED_FACTS, groupPolicyActivelyLed: undefined },
      { ...QUALIFIED_FACTS, subsidiariesControlled: false },
      { ...QUALIFIED_FACTS, contemporaneousEvidenceTypes: [] },
      { ...QUALIFIED_FACTS, professionalValidationConfirmed: false },
    ];
    for (const facts of variants) {
      expect(assessHoldingAnimatrice(facts).qualification).not.toBe("QUALIFIED");
    }
  });
});

describe("PF-02B3 — intégration Dutreil (ne touche que la qualification holding animatrice)", () => {
  const holdingBase = {
    companyValue: 2_000_000,
    eligibleOperatingValue: 2_000_000,
    nonEligibleAssets: 0,
    children: 1,
    donorAge: 65,
  };

  it("holdingAnimatrice absent -> comportement quantitatif inchangé (non-régression)", () => {
    const run = simulateDutreilV2(holdingBase);
    expect(run.computedResult?.rightsBeforeArticle790).toBe(78_194);
    expect(run.computedResult?.rightsWithDutreil).toBe(39_097);
    expect(run.computedResult?.holdingAnimatriceQualification).toBeNull();
    expect(run.steps.some((step) => step.id === "dutreil-step-holding-animatrice")).toBe(false);
  });

  it("société opérationnelle directe (isHoldingCompany: false) -> comportement inchangé", () => {
    const run = simulateDutreilV2({
      ...holdingBase,
      holdingAnimatrice: { isHoldingCompany: false },
    });
    expect(run.computedResult?.rightsWithDutreil).toBe(39_097);
    expect(run.computedResult?.holdingAnimatriceQualification).toBeNull();
  });

  it("holding QUALIFIED -> abattement de 75 % accordé normalement", () => {
    const run = simulateDutreilV2({
      ...holdingBase,
      holdingAnimatrice: { isHoldingCompany: true, facts: QUALIFIED_FACTS },
    });
    expect(run.computedResult?.holdingAnimatriceQualification).toBe("QUALIFIED");
    expect(run.computedResult?.eligibleConsideringHoldingAnimatrice).toBe(true);
    expect(run.computedResult?.exemptValue).toBe(1_500_000);
    expect(run.computedResult?.rightsWithDutreil).toBe(39_097);
    expect(run.steps.some((step) => step.id === "dutreil-step-holding-animatrice")).toBe(true);
  });

  it("holding NOT_QUALIFIED (purement passive) -> abattement refusé, droits pleins", () => {
    const run = simulateDutreilV2({
      ...holdingBase,
      holdingAnimatrice: {
        isHoldingCompany: true,
        facts: { ...QUALIFIED_FACTS, operationalSubsidiariesActivityProven: false },
      },
    });
    expect(run.computedResult?.holdingAnimatriceQualification).toBe("NOT_QUALIFIED");
    expect(run.computedResult?.eligibleConsideringHoldingAnimatrice).toBe(false);
    expect(run.computedResult?.exemptValue).toBe(0);
    // Sans abattement, les droits rejoignent ceux calculés sans pacte.
    expect(run.computedResult?.rightsWithDutreil).toBe(run.computedResult?.rightsWithoutDutreil);
  });

  it("holding NEEDS_REVIEW (preuves manquantes) -> abattement non présumé, jamais accordé par défaut", () => {
    const run = simulateDutreilV2({
      ...holdingBase,
      holdingAnimatrice: {
        isHoldingCompany: true,
        facts: { ...QUALIFIED_FACTS, contemporaneousEvidenceTypes: [] },
      },
    });
    expect(run.computedResult?.holdingAnimatriceQualification).toBe("NEEDS_REVIEW");
    expect(run.computedResult?.eligibleConsideringHoldingAnimatrice).toBe(false);
    expect(run.computedResult?.exemptValue).toBe(0);
    expect(run.computedResult?.holdingAnimatriceReviewReason).toContain("preuve");
  });

  it("l'étape holding animatrice porte toujours confidenceStatus needs_review", () => {
    const run = simulateDutreilV2({
      ...holdingBase,
      holdingAnimatrice: { isHoldingCompany: true, facts: QUALIFIED_FACTS },
    });
    const step = run.steps.find((s) => s.id === "dutreil-step-holding-animatrice");
    expect(step?.confidenceStatus).toBe("needs_review");
    expect(step?.ruleVersionId).toBe(HOLDING_ANIMATRICE_RULE_ID);
  });
});
