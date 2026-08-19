import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  assets,
  auditLogs,
  cabinets,
  calculationSteps,
  clientCases,
  documents,
  memberships,
  ruleVersions as ruleVersionTable,
  simulationRuleVersions,
  simulationRuns,
  userIdentities,
} from "../../lib/db/schema";
import { demoHousehold } from "../../lib/demo-data/household";
import { persistIfiSimulation } from "../../lib/workflow/case-workflow";
import { resolvePersistenceRuntime } from "../../lib/persistence/mode";
import type { PersistSimulationInput } from "../../lib/repositories/data-foundation-contract";
import { createFixtureDataFoundationRepository } from "../../lib/repositories/fixture-data-foundation";
import { createConfiguredDataFoundationRuntime } from "../../lib/services/simulation-persistence";
import { createInternalTenantContext } from "../../lib/tenancy/tenant-context";

const globalRuleId = "rule-global-v1";
const tenantBRuleId = "rule-tenant-b-v1";
const evidenceSourceId = "source-official-v1";

function fixtureSeed() {
  return {
    tenants: ["tenant-a", "tenant-b"],
    memberships: [
      {
        tenantId: "tenant-a",
        identityId: "identity-a",
        role: "conseiller" as const,
        status: "active" as const,
      },
      {
        tenantId: "tenant-b",
        identityId: "identity-b",
        role: "conseiller" as const,
        status: "active" as const,
      },
    ],
    dossiers: [
      { id: "dossier-a", tenantId: "tenant-a", householdId: "household-a" },
      { id: "dossier-b", tenantId: "tenant-b", householdId: "household-b" },
    ],
    ruleVersions: [
      { id: globalRuleId, tenantId: null },
      { id: tenantBRuleId, tenantId: "tenant-b" },
    ],
    evidenceSourceIds: [evidenceSourceId],
  };
}

function context(tenant: "a" | "b") {
  return createInternalTenantContext({
    tenantId: `tenant-${tenant}`,
    identityId: `identity-${tenant}`,
    role: "conseiller",
    source: "internal-test",
    correlationId: `correlation-${tenant}`,
  });
}

function simulationInput(
  overrides: Partial<PersistSimulationInput> = {},
): PersistSimulationInput {
  return {
    dossierId: "dossier-a",
    idempotencyKey: "simulation-a-001",
    engineKey: "ifi",
    engineVersion: "2026.08",
    scenario: "ifi",
    status: "completed_with_review",
    inputSnapshot: { householdId: "household-a", valuationDate: "2026-01-01" },
    outputSnapshot: { taxableBase: 1_110_000, tax: 0 },
    professionalValidationRequired: true,
    steps: [
      {
        order: 1,
        label: "Base nette IFI",
        inputValue: "1530000",
        formula: "actifs taxables - dettes admises",
        outputValue: "1110000",
        ruleVersionId: globalRuleId,
        evidenceSourceId,
        confidenceStatus: "indicative",
      },
    ],
    ...overrides,
  };
}

function columnNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

function listTsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? listTsxFiles(path)
      : path.endsWith(".tsx")
        ? [path]
        : [];
  });
}

describe("PF-03A PostgreSQL data foundation", () => {
  it("declares the required tenant-owned schema boundaries", () => {
    for (const table of [
      cabinets,
      memberships,
      clientCases,
      assets,
      documents,
      simulationRuns,
      calculationSteps,
      simulationRuleVersions,
      auditLogs,
    ]) {
      expect(columnNames(table)).toContain("tenant_id");
    }

    expect(columnNames(userIdentities)).toEqual(
      expect.arrayContaining([
        "provider",
        "provider_subject",
        "email_normalized",
        "created_at",
        "updated_at",
      ]),
    );
    expect(columnNames(ruleVersionTable)).toEqual(
      expect.arrayContaining([
        "effective_from",
        "effective_to",
        "source_reference",
        "rule_payload",
        "checksum_sha256",
      ]),
    );
    expect(columnNames(simulationRuns)).toEqual(
      expect.arrayContaining([
        "input_snapshot",
        "output",
        "engine_key",
        "engine_version",
        "idempotency_key",
      ]),
    );
  });

  it("defines composite tenant foreign keys for dossier-owned records", () => {
    expect(getTableConfig(assets).foreignKeys.map((key) => key.getName())).toContain(
      "assets_tenant_case_fk",
    );
    expect(getTableConfig(documents).foreignKeys.map((key) => key.getName())).toContain(
      "documents_tenant_case_fk",
    );
    expect(getTableConfig(simulationRuns).foreignKeys.map((key) => key.getName())).toContain(
      "simulation_runs_tenant_case_fk",
    );
    expect(getTableConfig(calculationSteps).foreignKeys.map((key) => key.getName())).toContain(
      "calculation_steps_tenant_run_fk",
    );
  });

  it("ships a versioned Drizzle migration with FK and rule-link constraints", () => {
    const migration = readFileSync(
      join(process.cwd(), "drizzle/0003_pf03a_postgresql_data_foundation.sql"),
      "utf8",
    );
    const journal = readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8");

    expect(migration).toContain('CREATE TABLE "memberships"');
    expect(migration).toContain('CREATE TABLE "simulation_rule_versions"');
    expect(migration).toContain('FOREIGN KEY ("tenant_id", "case_id")');
    expect(migration).toContain('UNIQUE ("tenant_id", "idempotency_key")');
    expect(journal).toContain("0003_pf03a_postgresql_data_foundation");
  });

  it("uses an explicit fixture/database mode without DATABASE_URL fallback", () => {
    expect(resolvePersistenceRuntime({ NODE_ENV: "test" }).mode).toBe("FIXTURE");
    expect(
      resolvePersistenceRuntime({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://configured-but-not-selected",
      }).mode,
    ).toBe("FIXTURE");
    expect(() =>
      resolvePersistenceRuntime({ NODE_ENV: "production" }),
    ).toThrow("PERSISTENCE_MODE_REQUIRED_IN_PRODUCTION");
    expect(() =>
      resolvePersistenceRuntime({ NODE_ENV: "test", PERSISTENCE_MODE: "DATABASE" }),
    ).toThrow("DATABASE_URL_REQUIRED_FOR_DATABASE_MODE");
  });

  it("persists Claire and Marc inputs, result, traces and rule links in fixture mode", async () => {
    const runtime = createConfiguredDataFoundationRuntime({
      NODE_ENV: "test",
      PERSISTENCE_MODE: "FIXTURE",
    });
    const ifiRun = persistIfiSimulation();
    const input: PersistSimulationInput = {
      dossierId: "case-claire-marc-2026",
      idempotencyKey: "claire-marc-ifi-2026",
      engineKey: "ifi",
      engineVersion: "2026.08",
      scenario: "ifi",
      status: "completed_with_review",
      inputSnapshot: {
        householdId: demoHousehold.id,
        assetIds: demoHousehold.assets.map((asset) => asset.id),
      },
      outputSnapshot: { ...ifiRun.result },
      professionalValidationRequired: true,
      steps: ifiRun.steps.map((step) => ({
        order: step.order,
        label: step.label,
        inputValue: String(step.inputValue),
        formula: step.formula,
        outputValue: String(step.outputValue),
        ruleVersionId: step.ruleVersionId,
        evidenceSourceId: step.evidenceSourceId,
        confidenceStatus: step.confidenceStatus,
        usedData: step.usedData,
        intermediateResult: step.intermediateResult,
        coverageLimitIds: step.coverageLimitIds,
        nextAction: step.nextAction,
        displayStatus: step.displayStatus,
      })),
    };

    const first = await runtime.service.persistSimulation(runtime.context, input);
    const second = await runtime.service.persistSimulation(runtime.context, input);
    const persisted = await runtime.service.getSimulation(runtime.context, first.runId);

    expect(first.reused).toBe(false);
    expect(second).toEqual({ ...first, reused: true });
    expect(persisted?.dossierId).toBe("case-claire-marc-2026");
    expect(persisted?.steps).toHaveLength(ifiRun.steps.length);
    expect(persisted?.ruleVersionIds).toContain(ifiRun.steps[0].ruleVersionId);
    expect(persisted?.outputSnapshot).toEqual(ifiRun.result);
  });

  it("enforces tenant ownership on write and read without accepting tenantId in input", async () => {
    const fixture = createFixtureDataFoundationRepository(fixtureSeed());
    const created = await fixture.repository.persist(context("a"), simulationInput());

    await expect(
      fixture.repository.persist(
        context("a"),
        simulationInput({ dossierId: "dossier-b", idempotencyKey: "cross-tenant" }),
      ),
    ).rejects.toThrow("DOSSIER_NOT_FOUND");
    await expect(fixture.repository.findById(context("b"), created.runId)).resolves.toBeNull();
    await expect(fixture.repository.findById(context("a"), created.runId)).resolves.toMatchObject({
      tenantId: "tenant-a",
      dossierId: "dossier-a",
    });
    expect("tenantId" in simulationInput()).toBe(false);
  });

  it("rolls back the fixture transaction when evidence or rule linkage is invalid", async () => {
    const fixture = createFixtureDataFoundationRepository(fixtureSeed());

    await expect(
      fixture.repository.persist(
        context("a"),
        simulationInput({
          steps: [
            {
              ...simulationInput().steps[0],
              evidenceSourceId: "missing-source",
            },
          ],
        }),
      ),
    ).rejects.toThrow("EVIDENCE_SOURCE_NOT_FOUND:missing-source");
    expect(fixture.inspect().simulations.size).toBe(0);

    await expect(
      fixture.repository.persist(
        context("a"),
        simulationInput({
          idempotencyKey: "tenant-rule-crossing",
          steps: [
            {
              ...simulationInput().steps[0],
              ruleVersionId: tenantBRuleId,
            },
          ],
        }),
      ),
    ).rejects.toThrow(`RULE_VERSION_NOT_AVAILABLE:${tenantBRuleId}`);
    expect(fixture.inspect().simulations.size).toBe(0);
  });

  it("requires an active membership in the trusted tenant context", async () => {
    const fixture = createFixtureDataFoundationRepository(fixtureSeed());
    const unauthorized = createInternalTenantContext({
      tenantId: "tenant-a",
      identityId: "identity-unknown",
      role: "conseiller",
      source: "internal-test",
    });

    await expect(
      fixture.repository.persist(unauthorized, simulationInput()),
    ).rejects.toThrow("TENANT_MEMBERSHIP_REQUIRED");
  });

  it("keeps React components independent from Postgres and Drizzle", () => {
    const files = [
      ...listTsxFiles(join(process.cwd(), "app")),
      ...listTsxFiles(join(process.cwd(), "components")),
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/drizzle-orm|getDatabase\(|postgres-data-foundation/);
    }
  });
});
