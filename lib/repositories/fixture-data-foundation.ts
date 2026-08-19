import { randomUUID } from "node:crypto";
import type { TenantContext } from "../tenancy/tenant-context";
import {
  type DataFoundationFixtureSeed,
  type PersistedSimulationSnapshot,
  type PersistSimulationResult,
  type SimulationPersistenceRepository,
  validateSimulationPersistenceInput,
} from "./data-foundation-contract";

type MutableFixtureState = {
  simulations: Map<string, PersistedSimulationSnapshot>;
};

function cloneState(state: MutableFixtureState): MutableFixtureState {
  return {
    simulations: new Map(state.simulations),
  };
}

export function createFixtureDataFoundationRepository(seed: DataFoundationFixtureSeed) {
  let state: MutableFixtureState = { simulations: new Map() };

  function requireActiveMembership(context: TenantContext) {
    const membership = seed.memberships.find(
      (candidate) =>
        candidate.tenantId === context.tenantId &&
        candidate.identityId === context.identityId &&
        candidate.role === context.role &&
        candidate.status === "active",
    );

    if (!membership || !seed.tenants.includes(context.tenantId)) {
      throw new Error("TENANT_MEMBERSHIP_REQUIRED");
    }
  }

  const repository: SimulationPersistenceRepository = {
    async persist(context, input): Promise<PersistSimulationResult> {
      requireActiveMembership(context);
      const linkage = validateSimulationPersistenceInput(input);
      const working = cloneState(state);
      const existing = [...working.simulations.values()].find(
        (candidate) =>
          candidate.tenantId === context.tenantId &&
          candidate.idempotencyKey === input.idempotencyKey,
      );

      if (existing) {
        if (existing.dossierId !== input.dossierId || existing.engineKey !== input.engineKey) {
          throw new Error("IDEMPOTENCY_KEY_REUSE_MISMATCH");
        }

        return {
          runId: existing.runId,
          reused: true,
          ruleVersionIds: existing.ruleVersionIds,
        };
      }

      const dossier = seed.dossiers.find(
        (candidate) => candidate.id === input.dossierId && candidate.tenantId === context.tenantId,
      );

      if (!dossier) {
        throw new Error("DOSSIER_NOT_FOUND");
      }

      const missingRule = linkage.ruleVersionIds.find(
        (ruleVersionId) =>
          !seed.ruleVersions.some(
            (rule) =>
              rule.id === ruleVersionId &&
              (rule.tenantId === null || rule.tenantId === context.tenantId),
          ),
      );

      if (missingRule) {
        throw new Error(`RULE_VERSION_NOT_AVAILABLE:${missingRule}`);
      }

      const missingEvidence = linkage.evidenceSourceIds.find(
        (sourceId) => !seed.evidenceSourceIds.includes(sourceId),
      );

      if (missingEvidence) {
        throw new Error(`EVIDENCE_SOURCE_NOT_FOUND:${missingEvidence}`);
      }

      const snapshot: PersistedSimulationSnapshot = Object.freeze({
        runId: randomUUID(),
        tenantId: context.tenantId,
        dossierId: dossier.id,
        householdId: dossier.householdId,
        idempotencyKey: input.idempotencyKey,
        engineKey: input.engineKey,
        engineVersion: input.engineVersion,
        scenario: input.scenario,
        status: input.status,
        inputSnapshot: Object.freeze({ ...input.inputSnapshot }),
        outputSnapshot: Object.freeze({ ...input.outputSnapshot }),
        steps: Object.freeze(input.steps.map((step) => Object.freeze({ ...step }))),
        ruleVersionIds: Object.freeze(linkage.ruleVersionIds),
      });

      working.simulations.set(snapshot.runId, snapshot);
      state = working;

      return {
        runId: snapshot.runId,
        reused: false,
        ruleVersionIds: snapshot.ruleVersionIds,
      };
    },

    async findById(context, runId) {
      requireActiveMembership(context);
      const snapshot = state.simulations.get(runId);
      return snapshot?.tenantId === context.tenantId ? snapshot : null;
    },
  };

  return {
    repository,
    inspect: () => cloneState(state),
  };
}
