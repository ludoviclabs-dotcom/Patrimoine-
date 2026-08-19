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
import {
  E_INVOICING_FIRST_MILESTONE_DATE,
  E_INVOICING_SECOND_MILESTONE_DATE,
  E_INVOICING_TIMELINE,
  resolveEInvoicingEventStatus,
  resolveEInvoicingTimeline,
} from "../../lib/simulations/e-invoicing";
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

// --- GOLDEN CASES timeline facturation électronique (TAX-P0-005) ------------
// Sources : REGLEMENTATION_AOUT_2026.md § 15.1 et § 17 ; calendrier officiel
// recontrôlé sur impots.gouv.fr et economie.gouv.fr.
// 01/09/2026 : réception pour TOUTES les entreprises ; émission et e-reporting
// pour les grandes entreprises et ETI.
// 01/09/2027 : émission et e-reporting pour les PME, TPE et micro-entreprises.
// Réception, émission et e-reporting sont trois obligations distinctes.
describe("V3.9 — timeline facturation électronique datée (TAX-P0-005)", () => {
  const statusOf = (
    obligation: "RECEIVE_E_INVOICE" | "ISSUE_E_INVOICE" | "E_REPORTING",
    companySize: "LARGE" | "ETI" | "SME" | "MICRO" | "UNKNOWN",
    asOfDate: string,
  ) => {
    const resolution = resolveEInvoicingTimeline({ companySize, asOfDate });
    const event = resolution.events.find(
      (candidate) =>
        candidate.obligation === obligation &&
        (candidate.companyCategory === "ALL" || candidate.companyCategory === companySize),
    );
    return event ? { status: event.status, applies: event.appliesToCompany } : null;
  };

  it("golden A/B — réception toutes entreprises : frontière au 01/09/2026", () => {
    expect(statusOf("RECEIVE_E_INVOICE", "SME", "2026-08-31")).toEqual({
      status: "UPCOMING",
      applies: true,
    });
    expect(statusOf("RECEIVE_E_INVOICE", "SME", "2026-09-01")).toEqual({
      status: "IN_FORCE",
      applies: true,
    });
  });

  it("golden C/D — émission grandes entreprises : frontière au 01/09/2026", () => {
    expect(statusOf("ISSUE_E_INVOICE", "LARGE", "2026-08-31")?.status).toBe("UPCOMING");
    expect(statusOf("ISSUE_E_INVOICE", "LARGE", "2026-09-01")).toEqual({
      status: "IN_FORCE",
      applies: true,
    });
  });

  it("golden E — e-reporting ETI en vigueur au 01/09/2026", () => {
    expect(statusOf("E_REPORTING", "ETI", "2026-09-01")).toEqual({
      status: "IN_FORCE",
      applies: true,
    });
  });

  it("golden F/G/H — émission PME : encore à venir en 2026, en vigueur au 01/09/2027", () => {
    // Le jalon 2027 ne doit jamais être appliqué aux PME dès 2026.
    expect(statusOf("ISSUE_E_INVOICE", "SME", "2026-09-01")?.status).toBe("UPCOMING");
    expect(statusOf("ISSUE_E_INVOICE", "SME", "2027-08-31")?.status).toBe("UPCOMING");
    expect(statusOf("ISSUE_E_INVOICE", "SME", "2027-09-01")).toEqual({
      status: "IN_FORCE",
      applies: true,
    });
  });

  it("golden I — e-reporting micro-entreprises en vigueur au 01/09/2027", () => {
    expect(statusOf("E_REPORTING", "MICRO", "2027-09-01")).toEqual({
      status: "IN_FORCE",
      applies: true,
    });
    expect(statusOf("E_REPORTING", "MICRO", "2027-08-31")?.status).toBe("UPCOMING");
  });

  it("golden J — taille inconnue : réception déterminée, émission à qualifier", () => {
    const resolution = resolveEInvoicingTimeline({ companySize: "UNKNOWN", asOfDate: "2026-09-01" });
    // La réception vise toutes les entreprises : déterminable sans la taille.
    const reception = resolution.events.find((event) => event.companyCategory === "ALL");
    expect(reception?.appliesToCompany).toBe(true);
    expect(reception?.status).toBe("IN_FORCE");
    expect(reception?.qualificationRequired).toBe(false);

    // Émission et e-reporting : aucune présomption de taille.
    expect(resolution.qualificationRequired).toBe(true);
    for (const event of resolution.events.filter((item) => item.companyCategory !== "ALL")) {
      expect(event.appliesToCompany).toBe(false);
      expect(event.qualificationRequired).toBe(true);
    }
  });

  it("golden K — état de référence au 19/08/2026 : tous les jalons à venir", () => {
    for (const companySize of ["LARGE", "ETI", "SME", "MICRO"] as const) {
      const resolution = resolveEInvoicingTimeline({ companySize, asOfDate: "2026-08-19" });
      expect(resolution.inForceEvents).toHaveLength(0);
      expect(resolution.upcomingEvents.length).toBeGreaterThan(0);
      for (const event of resolution.events) {
        expect(event.status).toBe("UPCOMING");
      }
    }
  });

  it("golden — au 02/09/2026 : GE/ETI en vigueur, PME/micro encore à venir", () => {
    const eti = resolveEInvoicingTimeline({ companySize: "ETI", asOfDate: "2026-09-02" });
    for (const event of eti.events.filter((item) => item.appliesToCompany)) {
      expect(event.status).toBe("IN_FORCE");
    }

    const sme = resolveEInvoicingTimeline({ companySize: "SME", asOfDate: "2026-09-02" });
    // Réception en vigueur, mais émission et e-reporting PME toujours à venir.
    expect(sme.inForceEvents.map((event) => event.obligation)).toEqual(["RECEIVE_E_INVOICE"]);
    expect(sme.upcomingEvents.map((event) => event.obligation).sort()).toEqual([
      "E_REPORTING",
      "ISSUE_E_INVOICE",
    ]);
  });

  it("golden — au 02/09/2027 : tous les jalons applicables sont en vigueur", () => {
    for (const companySize of ["LARGE", "ETI", "SME", "MICRO"] as const) {
      const resolution = resolveEInvoicingTimeline({ companySize, asOfDate: "2027-09-02" });
      expect(resolution.upcomingEvents).toHaveLength(0);
      expect(resolution.inForceEvents.length).toBeGreaterThan(0);
    }
  });

  it("golden — non-régression : dates, obligations distinctes, provenance et règle versionnée", () => {
    // Aucune échéance 2026 ne doit rester « à venir » en 2027.
    expect(
      resolveEInvoicingEventStatus(E_INVOICING_FIRST_MILESTONE_DATE, "2027-01-01"),
    ).toBe("IN_FORCE");
    // Les deux jalons restent distincts et ne fusionnent pas.
    expect(E_INVOICING_FIRST_MILESTONE_DATE).toBe("2026-09-01");
    expect(E_INVOICING_SECOND_MILESTONE_DATE).toBe("2027-09-01");
    // Les trois obligations sont modélisées séparément.
    expect(new Set(E_INVOICING_TIMELINE.map((event) => event.obligation))).toEqual(
      new Set(["RECEIVE_E_INVOICE", "ISSUE_E_INVOICE", "E_REPORTING"]),
    );
    // Provenance : chaque jalon porte sa règle versionnée et ses sources.
    for (const event of E_INVOICING_TIMELINE) {
      expect(event.ruleVersionId).toBe("rule-e-invoicing-timeline-2026-v2");
      expect(event.sourceRefs.length).toBeGreaterThan(0);
      for (const sourceId of event.sourceRefs) {
        expect(evidenceSources.some((source) => source.id === sourceId), sourceId).toBe(true);
      }
    }
    expect(
      ruleVersions.some(
        (rule) => rule.id === "rule-e-invoicing-timeline-2026-v2" && rule.status === "active",
      ),
    ).toBe(true);
  });
});
