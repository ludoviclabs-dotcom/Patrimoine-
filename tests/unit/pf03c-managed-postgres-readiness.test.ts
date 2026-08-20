import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSafeDatabaseRuntimeRole,
  isProductionEnvironment,
  managedPostgresMigrationMarker,
  managedPostgresRlsTables,
} from "../../lib/db/managed-readiness";

const root = process.cwd();

describe("PF-03C managed PostgreSQL operational readiness", () => {
  it("rejects unsafe runtime credentials before they can assume the application role", () => {
    expect(() => assertSafeDatabaseRuntimeRole({
      roleName: "runtime_login",
      isSuperuser: true,
      bypassesRls: false,
      canAssumeApplicationRole: true,
      hasDirectTablePrivileges: false,
    })).toThrow("DATABASE_RUNTIME_ROLE_UNSAFE");
    expect(() => assertSafeDatabaseRuntimeRole({
      roleName: "runtime_login",
      isSuperuser: false,
      bypassesRls: true,
      canAssumeApplicationRole: true,
      hasDirectTablePrivileges: false,
    })).toThrow("DATABASE_RUNTIME_ROLE_UNSAFE");
    expect(() => assertSafeDatabaseRuntimeRole({
      roleName: "runtime_login",
      isSuperuser: false,
      bypassesRls: false,
      canAssumeApplicationRole: false,
      hasDirectTablePrivileges: false,
    })).toThrow("DATABASE_RUNTIME_ROLE_UNSAFE");
    expect(() => assertSafeDatabaseRuntimeRole({
      roleName: "runtime_login",
      isSuperuser: false,
      bypassesRls: false,
      canAssumeApplicationRole: true,
      hasDirectTablePrivileges: true,
    })).toThrow("DATABASE_RUNTIME_ROLE_UNSAFE");
    expect(() => assertSafeDatabaseRuntimeRole({
      roleName: "runtime_login",
      isSuperuser: false,
      bypassesRls: false,
      canAssumeApplicationRole: true,
      hasDirectTablePrivileges: false,
    })).not.toThrow();
  });

  it("recognises Vercel production as a protected environment", () => {
    expect(isProductionEnvironment({ VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionEnvironment({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionEnvironment({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("ships a non-sensitive readiness attestation and operational commands", () => {
    // The attestation must live in the newest migration, whichever it is.
    const migration = readFileSync(
      join(root, `drizzle/${managedPostgresMigrationMarker}.sql`),
      "utf8",
    );
    const readiness = readFileSync(join(root, "scripts/managed-postgres-readiness.ts"), "utf8");
    const backup = readFileSync(join(root, "scripts/managed-postgres-backup.ts"), "utf8");
    const health = readFileSync(join(root, "app/api/health/route.ts"), "utf8");

    expect(migration).toContain(managedPostgresMigrationMarker);
    expect(migration).toContain("rlsReady");
    expect(managedPostgresRlsTables).toHaveLength(30);
    expect(readiness).toContain("DATABASE_RUNTIME_ROLE_UNSAFE");
    expect(readiness).toContain("forward_only_no_automatic_rollback");
    expect(readiness).toContain("PF03_SMOKE_WRITE_FORBIDDEN_IN_PRODUCTION");
    expect(backup).toContain("PF03_RESTORE_FORBIDDEN_IN_PRODUCTION");
    expect(health).toContain("managed_postgres_readiness");
    expect(health).not.toContain("DATABASE_ADMIN_URL");
  });
});
