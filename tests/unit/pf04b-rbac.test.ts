import { describe, expect, it } from "vitest";
import { can, listCapabilities, tenantActions } from "../../lib/auth/authorization";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("PF-04B centralized tenant RBAC", () => {
  it("defines one explicit capability matrix for every internal role", () => {
    expect(tenantActions).toEqual(expect.arrayContaining([
      "dossier.read", "dossier.write", "simulation.run", "simulation.review",
      "report.generate", "report.validate", "document.upload", "document.download",
      "member.invite", "rule.review", "admin.manage",
    ]));
    expect(listCapabilities("admin")).toEqual(expect.arrayContaining([...tenantActions]));
    expect(listCapabilities("conseiller")).not.toContain("report.validate");
    expect(listCapabilities("expert")).toContain("report.validate");
    expect(listCapabilities("auditeur")).toEqual(expect.arrayContaining(["dossier.read", "audit.read"]));
  });

  it("rejects cross-tenant resources regardless of role", () => {
    expect(can(
      { tenantId: tenantA, role: "admin" },
      "admin.manage",
      { tenantId: tenantB, type: "tenant" },
    )).toBe(false);
  });

  it("keeps the client role limited to dossier/document capabilities", () => {
    const client = { tenantId: tenantA, role: "client" } as const;
    const dossier = { tenantId: tenantA, type: "dossier", id: "case-a" } as const;
    expect(can(client, "dossier.read", dossier)).toBe(true);
    expect(can(client, "dossier.write", dossier)).toBe(false);
    expect(can(client, "simulation.run", dossier)).toBe(false);
    expect(can(client, "simulation.review", dossier)).toBe(false);
    expect(can(client, "report.validate", { tenantId: tenantA, type: "report", id: "report-a" })).toBe(false);
    expect(can(client, "admin.manage", { tenantId: tenantA, type: "tenant" })).toBe(false);
  });
});
