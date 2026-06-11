import { describe, expect, it } from "vitest";
import { getAggregatedTotals, mapToAssets } from "../../lib/aggregation/simulated-accounts";
import { getFiscalAlerts } from "../../lib/alerts/fiscal-alerts";
import {
  deadlinesAsTimelineEvents,
  fiscalDeadlines,
  getUpcomingDeadlines,
} from "../../lib/calendar/fiscal-deadlines";
import {
  advanceRecommendation,
  demoRecommendations,
  getNextStatus,
} from "../../lib/crm/recommendations";
import { demoHousehold } from "../../lib/demo-data/household";
import { getNetWealth } from "../../lib/demo-data/metrics";
import { evidenceSources } from "../../lib/evidence/sources";
import { FixturePowensClient, type PowensClient } from "../../lib/integrations/powens";
import {
  compound,
  getScenarioNetWealthEstimates,
  projectNetWealth,
} from "../../lib/projections/wealth-projection";
import { ruleVersions } from "../../lib/rules/rule-versions";
import { calculateIfi } from "../../lib/simulations/ifi";
import {
  simulateDutreilV2,
  simulateHoldingTaxV2,
  simulateIrPfuCdhr,
  simulatePerDeductionV2,
} from "../../lib/tax/v2-engines";

describe("V3.3 — agrégation simulée", () => {
  it("expose des comptes fixtures avec consentement et SCA documentés", async () => {
    const client: PowensClient = new FixturePowensClient();
    const consent = await client.createConsent("case-claire-marc-2026");
    expect(consent.status).toBe("active");
    const accounts = await client.listAccounts(consent.id);
    expect(accounts).toHaveLength(4);
    expect(accounts.every((account) => account.provider === "powens-fixture")).toBe(true);
  });

  it("mappe les comptes en actifs candidats marqués external_source", () => {
    const assets = mapToAssets();
    expect(assets.every((asset) => asset.dataQuality.status === "external_source")).toBe(true);
    expect(assets.every((asset) => asset.dataQuality.validationStatus === "not_started")).toBe(true);
    const totals = getAggregatedTotals();
    // Cohérence avec le dossier déclaré : liquidités 220 000, CTO 480 000, AV 350 000.
    expect(totals.liquidity).toBe(220_000);
    expect(totals.financial).toBe(480_000);
    expect(totals.insurance).toBe(350_000);
  });
});

describe("V3.3 — projections déterministes", () => {
  it("vérifie la capitalisation à la main : 3 420 000 € à 2 % sur 10 ans", () => {
    expect(compound(3_420_000, 0.02, 10)).toBe(4_168_961);
  });

  it("part du patrimoine net actuel et projette les trois scénarios", () => {
    const statuQuo = projectNetWealth({ scenario: "statu-quo", years: 10 });
    expect(statuQuo[0].netWealth).toBe(getNetWealth(demoHousehold));
    expect(statuQuo.at(-1)!.netWealth).toBeGreaterThan(statuQuo[0].netWealth);

    const estimates = getScenarioNetWealthEstimates(10);
    // Donation : 300 000 € sortis du patrimoine → projection inférieure.
    expect(estimates.donation).toBeLessThan(estimates["statu-quo"]);
    // Cession : frottement fiscal 15 % sur les titres → départ plus bas.
    expect(estimates.cession).toBeLessThan(estimates["statu-quo"]);
  });
});

describe("V3.3 — CRM préconisations", () => {
  it("suit la machine d'états proposée → acceptée → en-cours → réalisée", () => {
    expect(getNextStatus("proposee")).toBe("acceptee");
    expect(getNextStatus("acceptee")).toBe("en-cours");
    expect(getNextStatus("en-cours")).toBe("realisee");
    expect(getNextStatus("realisee")).toBeNull();

    const proposed = demoRecommendations.find((reco) => reco.status === "proposee")!;
    const advanced = advanceRecommendation(proposed);
    expect(advanced.status).toBe("acceptee");
    const done = demoRecommendations.find((reco) => reco.status === "realisee")!;
    expect(advanceRecommendation(done).status).toBe("realisee");
  });
});

describe("V3.3 — alertes fiscales chiffrées", () => {
  it("dérive chaque montant d'un run moteur traçable", () => {
    const alerts = getFiscalAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(5);
    expect(alerts.every((alert) => alert.computedFromRunId.length > 0)).toBe(true);

    const ifiRun = calculateIfi(demoHousehold);
    const ifiAlert = alerts.find((alert) => alert.id === "alert-ifi-seuil")!;
    expect(ifiAlert.amount).toBe(
      Math.abs(ifiRun.result.threshold - (ifiRun.result.taxableBase ?? 0)),
    );

    const cdhrRun = simulateIrPfuCdhr();
    const cdhrAlert = alerts.find((alert) => alert.id === "alert-cdhr")!;
    expect(cdhrAlert.amount).toBe(
      Math.max(0, 500_000 - Number(cdhrRun.computedResult?.rfr ?? 0)),
    );

    const perRun = simulatePerDeductionV2();
    const perAlert = alerts.find((alert) => alert.id === "alert-per-plafond")!;
    expect(perAlert.amount).toBe(
      Number(perRun.computedResult?.availableCeiling) -
        Number(perRun.computedResult?.deductionUsed),
    );

    const dutreilAlert = alerts.find((alert) => alert.id === "alert-dutreil-engagements")!;
    expect(dutreilAlert.amount).toBe(Number(simulateDutreilV2().computedResult?.dutreilSavings));

    const holdingAlert = alerts.find((alert) => alert.id === "alert-holding-tax")!;
    expect(holdingAlert.amount).toBe(Number(simulateHoldingTaxV2().computedResult?.holdingTax));
    expect(holdingAlert.amount).toBe(84_000);
    expect(holdingAlert.severity).toBe("critical");
  });
});

describe("V3.3 — calendrier fiscal", () => {
  it("trie les échéances à venir et inclut la taxe holding 2027", () => {
    const upcoming = getUpcomingDeadlines("2026-06-11", 10);
    expect(upcoming.length).toBeGreaterThanOrEqual(4);
    expect([...upcoming.map((deadline) => deadline.date)]).toEqual(
      [...upcoming.map((deadline) => deadline.date)].sort(),
    );
    expect(fiscalDeadlines.some((deadline) => deadline.scope === "holding-tax")).toBe(true);
    expect(fiscalDeadlines.every((deadline) => deadline.ruleVersionId === "rule-calendrier-fiscal-2026-v1")).toBe(true);
  });

  it("fusionne les échéances dans la frise patrimoniale", () => {
    const events = deadlinesAsTimelineEvents();
    expect(events.length).toBe(fiscalDeadlines.length);
    expect(events.every((event) => event.status === "regulatory")).toBe(true);
  });
});

describe("V3.3 — intégration produit", () => {
  it("déclare règles et sources de la couche gestion", () => {
    expect(ruleVersions.some((rule) => rule.id === "rule-agregation-demo-2026-v1")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-projections-2026-v1")).toBe(true);
    expect(ruleVersions.some((rule) => rule.id === "rule-calendrier-fiscal-2026-v1")).toBe(true);
    expect(
      evidenceSources.some(
        (source) =>
          source.id === "src-interne-hypotheses-projection-2026" && source.reliability === "internal",
      ),
    ).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-impots-calendrier-fiscal-2026")).toBe(true);
  });
});
