import { describe, expect, it } from "vitest";
import { buildAdequationDeclaration } from "../../lib/conformite/adequation";
import { buildDer, defaultDerInput } from "../../lib/conformite/der";
import { stableHash } from "../../lib/conformite/hash";
import { buildKycProfile, defaultKycInput, toAdequacyInputs } from "../../lib/conformite/kyc";
import { scoreAmlRisk } from "../../lib/conformite/lcb-ft";
import { buildLettreMission, defaultLettreMissionInput } from "../../lib/conformite/lettre-mission";
import { evidenceSources } from "../../lib/evidence/sources";
import { FixtureSignatureProvider } from "../../lib/integrations/signature";
import { ruleVersions } from "../../lib/rules/rule-versions";
import { simulateProductAdequacyV24 } from "../../lib/tax/v2-engines";

describe("V3.4 — DER", () => {
  it("bloque la génération si le numéro ORIAS manque", () => {
    const result = buildDer({ ...defaultDerInput, oriasNumber: "" });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.missingFields).toContain("Numéro ORIAS");
    }
  });

  it("bloque sans statuts réglementés et produit un document hashé sinon", () => {
    expect(buildDer({ ...defaultDerInput, statuses: [] }).status).toBe("blocked");

    const ready = buildDer(defaultDerInput);
    expect(ready.status).toBe("ready");
    if (ready.status === "ready") {
      expect(ready.document.kind).toBe("der");
      expect(ready.document.hash).toMatch(/^der-[0-9a-f]{8}$/);
      expect(ready.document.professionalValidationRequired).toBe(true);
      expect(ready.sections.some((section) => section.label === "Immatriculation ORIAS")).toBe(true);
    }
  });
});

describe("V3.4 — lettre de mission", () => {
  it("bloque sans délai de mission", () => {
    const result = buildLettreMission({ ...defaultLettreMissionInput, durationMonths: 0 });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.missingFields).toContain("Délai de mission (obligatoire)");
    }
  });

  it("produit une lettre complète avec délai et honoraires", () => {
    const result = buildLettreMission(defaultLettreMissionInput);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.sections.some((section) => section.value.includes("4 mois"))).toBe(true);
      expect(result.document.kind).toBe("lettre-mission");
    }
  });
});

describe("V3.4 — chaîne KYC → adéquation", () => {
  it("alimente le moteur d'adéquation avec le profil capturé", () => {
    const profile = buildKycProfile(defaultKycInput);
    const direct = simulateProductAdequacyV24(toAdequacyInputs(profile));
    const declaration = buildAdequationDeclaration(profile);
    expect(declaration.run.computedResult?.mismatchCount).toBe(direct.computedResult?.mismatchCount);
    // Profil défaut : risque produit 4 > tolérance 3, durabilité non documentée, marché cible non prouvé.
    expect(declaration.mismatches).toHaveLength(3);
    expect(declaration.document.kind).toBe("rapport-adequation");
  });

  it("réduit les écarts quand le profil est cohérent et documenté", () => {
    const profile = buildKycProfile({
      ...defaultKycInput,
      riskTolerance: 5,
      sustainabilityDocumented: true,
      horizonYears: 8,
    });
    const declaration = buildAdequationDeclaration(profile, { targetMarketAligned: true });
    expect(declaration.mismatches).toHaveLength(0);
    expect(declaration.conclusion).toContain("validation humaine requise");
  });

  it("borne la tolérance au risque entre 1 et 7", () => {
    expect(buildKycProfile({ ...defaultKycInput, riskTolerance: 12 }).riskTolerance).toBe(7);
    expect(buildKycProfile({ ...defaultKycInput, riskTolerance: -2 }).riskTolerance).toBe(1);
  });
});

describe("V3.4 — scoring LCB-FT", () => {
  it("applique les seuils standard / renforcée / déclaration de soupçon", () => {
    expect(scoreAmlRisk({ isPep: false, countryRisk: "faible", sourceOfFundsDocumented: true, beneficialOwnerIdentified: true }).vigilanceLevel).toBe("standard");
    expect(scoreAmlRisk({ isPep: true, countryRisk: "faible", sourceOfFundsDocumented: true, beneficialOwnerIdentified: true }).vigilanceLevel).toBe("renforcee");
    expect(scoreAmlRisk({ isPep: true, countryRisk: "eleve", sourceOfFundsDocumented: true, beneficialOwnerIdentified: true }).vigilanceLevel).toBe("declaration-soupcon");
    // Bénéficiaire effectif non identifié : examen renforcé quel que soit le score.
    expect(scoreAmlRisk({ isPep: false, countryRisk: "faible", sourceOfFundsDocumented: true, beneficialOwnerIdentified: false }).vigilanceLevel).toBe("declaration-soupcon");
  });

  it("calcule un score additif transparent", () => {
    const scoring = scoreAmlRisk({ isPep: true, countryRisk: "moyen", sourceOfFundsDocumented: false, beneficialOwnerIdentified: true });
    expect(scoring.score).toBe(3 + 1 + 2);
    expect(scoring.vigilanceLevel).toBe("declaration-soupcon");
    expect(scoring.rationale.length).toBe(3);
  });
});

describe("V3.4 — signature simulée", () => {
  it("produit une empreinte d'enveloppe déterministe et archive la signature", () => {
    const provider = new FixtureSignatureProvider();
    const der = buildDer(defaultDerInput);
    if (der.status !== "ready") throw new Error("DER attendu prêt");

    const envelopeA = provider.createEnvelope(der.document);
    const envelopeB = provider.createEnvelope(der.document);
    expect(envelopeA.documentHash).toBe(envelopeB.documentHash);
    expect(envelopeA.signatureLevel).toBe("SES-demo");

    const signed = provider.sign(envelopeA);
    expect(signed.status).toBe("signed");
    expect(signed.timestampedAt).toBeTruthy();
    expect(signed.auditEventId).toContain("audit-signature");
  });

  it("garde le hash stable pour un même contenu", () => {
    expect(stableHash("contenu-test")).toBe(stableHash("contenu-test"));
    expect(stableHash("contenu-test")).not.toBe(stableHash("contenu-test-2"));
  });
});

describe("V3.4 — acceptation du rapport d'audit", () => {
  it("un dossier produit DER + lettre de mission + profil de risque signés et archivés", () => {
    const provider = new FixtureSignatureProvider();
    const der = buildDer(defaultDerInput);
    const lettre = buildLettreMission(defaultLettreMissionInput);
    const adequation = buildAdequationDeclaration(buildKycProfile(defaultKycInput));

    expect(der.status).toBe("ready");
    expect(lettre.status).toBe("ready");

    const documents = [
      der.status === "ready" ? der.document : null,
      lettre.status === "ready" ? lettre.document : null,
      adequation.document,
    ].filter((document): document is NonNullable<typeof document> => document !== null);

    const signedEnvelopes = documents.map((document) => provider.sign(provider.createEnvelope(document)));
    expect(signedEnvelopes).toHaveLength(3);
    expect(signedEnvelopes.every((envelope) => envelope.status === "signed")).toBe(true);
    expect(signedEnvelopes.every((envelope) => envelope.auditEventId)).toBeTruthy();
    expect(new Set(documents.map((document) => document.kind))).toEqual(
      new Set(["der", "lettre-mission", "rapport-adequation"]),
    );
  });

  it("déclare règles et sources de la couche conformité", () => {
    for (const ruleId of [
      "rule-der-2026-v1",
      "rule-lettre-mission-2026-v1",
      "rule-kyc-profil-risque-2026-v1",
      "rule-lcb-ft-scoring-2026-v1",
      "rule-signature-demo-2026-v1",
      "rule-pages-legales-2026-v1",
    ]) {
      expect(ruleVersions.some((rule) => rule.id === ruleId), ruleId).toBe(true);
    }
    for (const sourceId of [
      "src-amf-rg-325-5-2026",
      "src-legifrance-cmf-l541-8-1-2026",
      "src-cncgp-lettre-mission-2026",
      "src-tracfin-lignes-directrices-2026",
      "src-eurlex-eidas-910-2014",
    ]) {
      expect(evidenceSources.some((source) => source.id === sourceId), sourceId).toBe(true);
    }
    expect(
      evidenceSources.find((source) => source.id === "src-tracfin-lignes-directrices-2026")?.authority,
    ).toBe("tracfin");
  });
});
