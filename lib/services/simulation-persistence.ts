import { demoCases, demoTenant, demoUsers } from "../demo-data/v1";
import { evidenceSources } from "../evidence/sources";
import { resolvePersistenceRuntime } from "../persistence/mode";
import { ruleVersions } from "../rules/rule-versions";
import { createInternalTenantContext, createServerTenantContext } from "../tenancy/tenant-context";
import type { TenantContext } from "../tenancy/tenant-context";
import type {
  PersistSimulationInput,
  SimulationPersistenceRepository,
} from "../repositories/data-foundation-contract";
import { createFixtureDataFoundationRepository } from "../repositories/fixture-data-foundation";
import { createPostgresDataFoundationRepository } from "../repositories/postgres-data-foundation";

export function createSimulationPersistenceService(
  repository: SimulationPersistenceRepository,
) {
  return {
    persistSimulation(context: TenantContext, input: PersistSimulationInput) {
      return repository.persist(context, input);
    },
    getSimulation(context: TenantContext, runId: string) {
      return repository.findById(context, runId);
    },
  };
}

export function createConfiguredDataFoundationRuntime(
  env: NodeJS.ProcessEnv = process.env,
) {
  const runtime = resolvePersistenceRuntime(env);

  if (runtime.mode === "DATABASE") {
    return {
      runtime,
      context: createServerTenantContext(env),
      service: createSimulationPersistenceService(
        createPostgresDataFoundationRepository(),
      ),
    };
  }

  const fixtureUser = demoUsers.find((user) => user.role === "conseiller");

  if (!fixtureUser) {
    throw new Error("DEMO_FIXTURE_IDENTITY_REQUIRED");
  }

  const fixture = createFixtureDataFoundationRepository({
    tenants: [demoTenant.id],
    memberships: [
      {
        tenantId: demoTenant.id,
        identityId: fixtureUser.id,
        role: fixtureUser.role,
        status: "active",
      },
    ],
    dossiers: demoCases.map((dossier) => ({
      id: dossier.id,
      tenantId: dossier.tenantId,
      householdId: dossier.householdId,
    })),
    ruleVersions: ruleVersions.map((ruleVersion) => ({
      id: ruleVersion.id,
      tenantId: null,
    })),
    evidenceSourceIds: evidenceSources.map((source) => source.id),
  });

  return {
    runtime,
    context: createInternalTenantContext({
      tenantId: demoTenant.id,
      identityId: fixtureUser.id,
      role: fixtureUser.role,
      source: "demo-fixture",
    }),
    service: createSimulationPersistenceService(fixture.repository),
  };
}
