import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  auditLogs,
  consents,
  dataRequests,
  dossierSnapshots,
  privateDocumentMetadata,
  professionalDocuments,
  professionalReviews,
  reportVersions,
} from "../../lib/db/schema";

const root = process.cwd();
const migration = readFileSync(
  join(root, "drizzle/0004_pf03b_postgres_rls_tenant_isolation.sql"),
  "utf8",
);

describe("PF-03B tenant isolation contracts", () => {
  it("ships forced RLS, membership-backed policies and deny-by-default context", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("app_security.tenant_member_access");
    expect(migration).toContain("current_setting('app.tenant_id', true)");
    expect(migration).toContain("current_setting('app.user_id', true)");
    expect(migration).toContain("membership.status = 'active'");
    expect(migration).toContain("membership.revoked_at IS NULL");
    expect(migration).toContain("validate_tenant_rule_version_linkage");
  });

  it("uses controlled non-bypass application and fixture-service roles", () => {
    expect(migration).toMatch(/CREATE ROLE patrimoine_app[\s\S]+NOBYPASSRLS/);
    expect(migration).toMatch(/CREATE ROLE patrimoine_fixture_service[\s\S]+NOBYPASSRLS/);
    expect(migration).toContain("current_user = 'patrimoine_fixture_service'");
    expect(migration).toContain("'demo_fixture_seed'");
    expect(migration).not.toMatch(/\sBYPASSRLS\b/);
  });

  it("adds composite tenant foreign keys to historical tenant-owned tables", () => {
    const tables = [
      professionalReviews,
      auditLogs,
      reportVersions,
      dossierSnapshots,
      professionalDocuments,
      dataRequests,
      privateDocumentMetadata,
      consents,
    ];

    for (const table of tables) {
      const foreignKeys = getTableConfig(table).foreignKeys.map((key) => key.getName());
      expect(foreignKeys.some((name) => name.includes("tenant_"))).toBe(true);
    }
  });

  it("centralizes transaction-local role, tenant, identity and role context", () => {
    const transaction = readFileSync(
      join(root, "lib/db/tenant-transaction.ts"),
      "utf8",
    );
    const postgresRepository = readFileSync(
      join(root, "lib/repositories/postgres-data-foundation.ts"),
      "utf8",
    );

    expect(transaction).toContain("set local role patrimoine_app");
    expect(transaction).toContain("set_config('app.tenant_id'");
    expect(transaction).toContain("set_config('app.user_id'");
    expect(transaction).toContain("set_config('app.role'");
    expect(postgresRepository).toContain("withAuthorizedTenantTransaction");
  });

  it("keeps the Claire and Marc import explicit, synthetic and idempotent", () => {
    const seed = readFileSync(join(root, "lib/db/seed-demo.ts"), "utf8");
    const command = readFileSync(join(root, "scripts/seed-demo-postgres.ts"), "utf8");

    expect(seed).toContain("onConflictDoNothing");
    expect(seed).toContain("claire-marc");
    expect(seed).toContain("synthetic: true");
    expect(command).toContain("ALLOW_DEMO_FIXTURE_SEED_MUST_BE_TRUE");
    expect(command).toContain("DEMO_FIXTURE_SEED_FORBIDDEN_IN_PRODUCTION");
    expect(command).toContain("DATABASE_ADMIN_URL_REQUIRED");
  });
});
