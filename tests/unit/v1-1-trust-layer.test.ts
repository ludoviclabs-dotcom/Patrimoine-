import { describe, expect, it } from "vitest";
import { coverageLimits } from "../../lib/coverage/limits";
import { demoHousehold } from "../../lib/demo-data/household";
import { demoPersonas } from "../../lib/demo-data/personas";
import { evidenceSources, sourceSnapshots } from "../../lib/evidence/sources";
import { getCompletenessScore, getCriticalDataQuality } from "../../lib/quality/completeness";
import { ruleVersions } from "../../lib/rules/rule-versions";
import { scenarioComparisons } from "../../lib/scenario-comparisons/comparisons";
import { calculateIfi } from "../../lib/simulations/ifi";
import { runDemoSourceWatch } from "../../lib/source-watch/watcher";
import type { CoverageStatus, DataQualityStatus, ReliabilityStatus } from "../../lib/types";

describe("V1.1 trust layer", () => {
  it("computes Claire and Marc completeness at 72 percent with expected missing items", () => {
    const completeness = getCompletenessScore(demoHousehold);

    expect(completeness.score).toBe(72);
    expect(completeness.missingItems).toEqual(
      expect.arrayContaining([
        "Régime matrimonial",
        "Bénéficiaires assurance-vie",
        "Repartition des parts SCI",
        "Capital restant du detaille",
        "Valorisation societe",
        "Dates d'acquisition",
      ]),
    );
  });

  it("gives every critical asset and liability a data quality status", () => {
    const allowed: DataQualityStatus[] = [
      "user_declared",
      "supporting_document_received",
      "estimated",
      "external_source",
      "professional_validated",
    ];

    for (const item of getCriticalDataQuality(demoHousehold)) {
      expect(allowed).toContain(item.dataQuality.status);
      expect(item.dataQuality.expectedAction.length).toBeGreaterThan(10);
    }
  });

  it("adds reliability, source and coverage metadata to every IFI calculation step", () => {
    const run = calculateIfi(demoHousehold);
    const sourceIds = new Set(evidenceSources.map((source) => source.id));
    const ruleIds = new Set(ruleVersions.map((rule) => rule.id));
    const coverageIds = new Set(coverageLimits.map((limit) => limit.id));
    const statuses: ReliabilityStatus[] = [
      "validated_calculation",
      "indicative_calculation",
      "user_assumption",
      "official_source",
      "professional_review_required",
      "not_covered_v1",
    ];

    for (const step of run.steps) {
      expect(sourceIds.has(step.evidenceSourceId)).toBe(true);
      expect(ruleIds.has(step.ruleVersionId)).toBe(true);
      expect(statuses).toContain(step.displayStatus);
      expect(step.coverageLimitIds.length).toBeGreaterThan(0);
      expect(step.coverageLimitIds.every((id) => coverageIds.has(id))).toBe(true);
      expect(step.usedData.length).toBeGreaterThan(0);
      expect(step.intermediateResult).toBeTruthy();
      expect(step.nextAction).toBeTruthy();
    }
  });

  it("lists IFI coverage as covered, partially covered and not covered", () => {
    const ifiStatuses = new Set<CoverageStatus>(
      coverageLimits.filter((limit) => limit.module === "ifi").map((limit) => limit.status),
    );

    expect(ifiStatuses.has("covered")).toBe(true);
    expect(ifiStatuses.has("partially_covered")).toBe(true);
    expect(ifiStatuses.has("not_covered_v1")).toBe(true);
  });

  it("returns five scenarios with required professional validation", () => {
    expect(scenarioComparisons).toHaveLength(5);
    expect(scenarioComparisons.every((scenario) => scenario.requiredValidation)).toBe(true);
  });

  it("runs the source watcher without destructive mutation", () => {
    const results = runDemoSourceWatch(new Date("2026-05-26T12:00:00.000Z"));

    expect(results.length).toBe(sourceSnapshots.length);
    expect(results.map((result) => result.status)).toEqual(
      expect.arrayContaining(["unchanged", "changed"]),
    );
  });

  it("keeps snapshots connected to existing sources and rules", () => {
    const sourceIds = new Set(evidenceSources.map((source) => source.id));
    const ruleIds = new Set(ruleVersions.map((rule) => rule.id));

    for (const snapshot of sourceSnapshots) {
      expect(sourceIds.has(snapshot.sourceId)).toBe(true);
      expect(snapshot.linkedRuleIds.every((ruleId) => ruleIds.has(ruleId))).toBe(true);
    }
  });

  it("ships seven demo personas with sources and reports", () => {
    expect(demoPersonas).toHaveLength(7);
    expect(demoPersonas.every((persona) => persona.sourceIds.length > 0)).toBe(true);
    expect(demoPersonas.every((persona) => persona.sampleReportId)).toBe(true);
  });
});
