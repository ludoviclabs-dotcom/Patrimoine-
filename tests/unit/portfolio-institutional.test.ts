import { describe, expect, it } from "vitest";
import { getPfuDiffAuditEvents, getPfuRegulatoryDiff } from "../../lib/evidence/pfu-rule-diff";
import { getMaturityMatrix } from "../../lib/maturity/matrix";
import { runDemoSourceWatch } from "../../lib/source-watch/watcher";
import { getGoldenCases } from "../../lib/validation/golden-cases";

describe("portfolio institutional proof layer", () => {
  it("returns the PFU regulatory diff with official source and review status", () => {
    const diff = getPfuRegulatoryDiff();

    expect(diff.fromRule).toContain("30 %");
    expect(diff.toRule).toContain("31,4 %");
    expect(diff.effectiveFrom).toBe("2026-01-01");
    expect(diff.legalBasisUrl).toBe("https://entreprendre.service-public.gouv.fr/actualites/A18796");
    expect(diff.status).toBe("review_required");
    expect(diff.sourceId).toBe("src-service-public-pfu-2026");
  });

  it("calculates Claire and Marc PFU impact as capital income multiplied by 1.4 percent", () => {
    const diff = getPfuRegulatoryDiff();

    expect(diff.amountBefore).toBe(36_000);
    expect(diff.amountAfter).toBe(37_680);
    expect(diff.delta).toBe(1_680);
    expect(diff.impactedRuns[0]).toMatchObject({
      caseLabel: "Claire et Marc",
      module: "ir-pfu-cdhr",
      recalculationRequired: true,
    });
  });

  it("attaches hashes, audit events and recommended action to every PFU diff", () => {
    const diff = getPfuRegulatoryDiff();
    const auditEvents = getPfuDiffAuditEvents();

    expect(diff.fromHash).toContain("2025-30-0");
    expect(diff.toHash).toContain("2026-31-4");
    expect(diff.auditEventIds).toEqual(auditEvents.map((event) => event.id));
    expect(auditEvents.map((event) => event.action)).toEqual([
      "source.changed",
      "rule.updated",
      "simulation.recalculation_required",
    ]);
    expect(diff.recommendedAction).toContain("Revue humaine");
  });

  it("makes the demo source watcher surface the PFU change", () => {
    const pfu = runDemoSourceWatch().find((result) => result.sourceId === "src-service-public-pfu-2026");

    expect(pfu?.status).toBe("changed");
    expect(pfu?.recommendedAction).toContain("PFU 30 % -> 31,4 %");
  });

  it("executes golden cases live with pass/fail and review badges", () => {
    const cases = getGoldenCases();
    const statuses = new Set(cases.map((goldenCase) => goldenCase.executionStatus));
    const coverage = new Set(cases.map((goldenCase) => goldenCase.coverageBadge));

    expect(statuses.has("pass")).toBe(true);
    expect(statuses.has("needs_professional_review")).toBe(true);
    expect(coverage.has("not_covered_v1")).toBe(true);
    expect(cases.every((goldenCase) => goldenCase.actual && goldenCase.executedAt)).toBe(true);
  });

  it("classifies the maturity matrix across demo, ready, external and not-built states", () => {
    const statuses = new Set(getMaturityMatrix().map((item) => item.status));

    expect(statuses.has("fixtures_demo")).toBe(true);
    expect(statuses.has("production_ready_without_connector")).toBe(true);
    expect(statuses.has("external_connector_required")).toBe(true);
    expect(statuses.has("not_built")).toBe(true);
  });
});
