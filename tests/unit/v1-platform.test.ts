import { describe, expect, it } from "vitest";
import { appendAuditEvent, assertAuditTenantIntegrity, rejectAuditMutation } from "../../lib/audit/append-only";
import { demoCases, demoTenant, demoUsers, demoV1AuditLogs } from "../../lib/demo-data/v1";
import { buildTenantBlobPath } from "../../lib/documents/blob";
import { ruleVersions } from "../../lib/rules/rule-versions";
import {
  canAccessCase,
  canReviewCase,
  filterByTenant,
  requireCaseAccess,
} from "../../lib/security/access-control";
import {
  getBareOwnershipRate,
  simulateDismemberedDonation,
  simulateRealEstateGain,
  simulateSciArbitrage,
} from "../../lib/simulations/advanced";

describe("V1 cabinet foundation", () => {
  it("filters cases by tenant and denies cross-tenant access", () => {
    const scoped = filterByTenant(demoCases, demoTenant.id);
    const conseiller = demoUsers.find((user) => user.role === "conseiller");

    expect(scoped).toHaveLength(1);
    expect(conseiller).toBeDefined();
    expect(canAccessCase(conseiller!, scoped[0])).toBe(true);

    expect(() =>
      requireCaseAccess({ ...conseiller!, tenantId: "tenant-other" }, scoped[0]),
    ).toThrow("CASE_ACCESS_DENIED");
  });

  it("restricts professional review to admin and expert roles", () => {
    const clientCase = demoCases[0];
    const expert = demoUsers.find((user) => user.role === "expert");
    const client = demoUsers.find((user) => user.role === "client");

    expect(canReviewCase(expert!, clientCase)).toBe(true);
    expect(canReviewCase(client!, clientCase)).toBe(false);
  });

  it("keeps audit logs append-only and tenant scoped", () => {
    const next = appendAuditEvent(demoV1AuditLogs, {
      id: "audit-v1-test",
      tenantId: demoTenant.id,
      actorUserId: "user-conseiller-marie",
      action: "source.checked",
      entityType: "source",
      entityId: "src-service-public-ifi-2026",
      createdAt: "2026-05-26T11:00:00.000Z",
      summary: "Source IFI verifiee en test.",
    });

    expect(next).toHaveLength(demoV1AuditLogs.length + 1);
    expect(next[0].id).toBe("audit-v1-test");
    expect(Object.isFrozen(next)).toBe(true);
    expect(() => rejectAuditMutation()).toThrow("AUDIT_APPEND_ONLY");
    expect(() => assertAuditTenantIntegrity(next, demoTenant.id)).not.toThrow();
  });

  it("produces sourced calculation steps for advanced simulations", () => {
    const donation = simulateDismemberedDonation({
      householdId: "household-claire-marc",
      assetValue: 300_000,
      donorAge: 51,
    });
    const plusValue = simulateRealEstateGain({
      householdId: "household-claire-marc",
      salePrice: 720_000,
      purchasePrice: 600_000,
      declaredCosts: 24_000,
    });
    const sci = simulateSciArbitrage({
      householdId: "household-claire-marc",
      propertyValue: 600_000,
      debt: 220_000,
      annualRent: 33_600,
      annualCharges: 11_400,
    });

    expect(getBareOwnershipRate(51)).toBe(0.5);
    expect(donation.result.bareOwnershipValue).toBe(150_000);
    expect(plusValue.result.netBeforeAllowances).toBe(96_000);
    expect(sci.result.annualCashflowBeforeTax).toBe(22_200);

    for (const run of [donation, plusValue, sci]) {
      for (const step of run.steps) {
        expect(step.ruleVersionId).toBeTruthy();
        expect(step.evidenceSourceId).toBeTruthy();
      }
    }
  });

  it("keeps V1 rule versions connected to evidence sources", () => {
    const v1RuleSets = new Set(["donation", "plus-value", "sci", "ai-governance"]);
    const v1Rules = ruleVersions.filter((rule) => v1RuleSets.has(rule.ruleSet));

    expect(v1Rules).toHaveLength(4);
    expect(v1Rules.every((rule) => rule.evidenceSourceIds.length > 0)).toBe(true);
  });

  it("builds tenant-isolated blob paths", () => {
    const path = buildTenantBlobPath({
      tenantId: demoTenant.id,
      caseId: "case-claire-marc-2026",
      documentId: "doc-company-statutes",
      filename: "Statuts Société.pdf",
    });

    expect(path).toContain(`tenants/${demoTenant.id}/cases/case-claire-marc-2026`);
    expect(path.endsWith("statuts-soci-t-.pdf")).toBe(true);
  });
});
