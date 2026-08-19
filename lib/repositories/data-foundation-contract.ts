import type { TenantContext, TenantContextRole } from "../tenancy/tenant-context";

export type SimulationStepSnapshot = Readonly<{
  order: number;
  label: string;
  inputValue: string;
  formula: string;
  outputValue: string;
  ruleVersionId: string;
  evidenceSourceId: string;
  confidenceStatus: "validated" | "indicative" | "needs_review";
  usedData?: readonly string[];
  intermediateResult?: string;
  coverageLimitIds?: readonly string[];
  nextAction?: string;
  displayStatus?: string;
}>;

export type PersistSimulationInput = Readonly<{
  dossierId: string;
  idempotencyKey: string;
  engineKey: string;
  engineVersion: string;
  scenario: string;
  status: "completed" | "completed_with_review" | "failed";
  inputSnapshot: Readonly<Record<string, unknown>>;
  outputSnapshot: Readonly<Record<string, unknown>>;
  inputSnapshotId?: string;
  ruleSnapshotId?: string;
  coverageLimitIds?: readonly string[];
  professionalValidationRequired: boolean;
  steps: readonly SimulationStepSnapshot[];
}>;

export type PersistSimulationResult = Readonly<{
  runId: string;
  reused: boolean;
  ruleVersionIds: readonly string[];
}>;

export type PersistedSimulationSnapshot = Readonly<{
  runId: string;
  tenantId: string;
  dossierId: string;
  householdId: string;
  idempotencyKey: string;
  engineKey: string;
  engineVersion: string;
  scenario: string;
  status: string;
  inputSnapshot: Readonly<Record<string, unknown>>;
  outputSnapshot: Readonly<Record<string, unknown>>;
  steps: readonly SimulationStepSnapshot[];
  ruleVersionIds: readonly string[];
}>;

export interface SimulationPersistenceRepository {
  persist(
    context: TenantContext,
    input: PersistSimulationInput,
  ): Promise<PersistSimulationResult>;
  findById(
    context: TenantContext,
    runId: string,
  ): Promise<PersistedSimulationSnapshot | null>;
}

export type DataFoundationFixtureSeed = Readonly<{
  tenants: readonly string[];
  memberships: readonly Readonly<{
    tenantId: string;
    identityId: string;
    role: TenantContextRole;
    status: "active" | "invited" | "disabled";
  }>[];
  dossiers: readonly Readonly<{
    id: string;
    tenantId: string;
    householdId: string;
  }>[];
  ruleVersions: readonly Readonly<{
    id: string;
    tenantId: string | null;
  }>[];
  evidenceSourceIds: readonly string[];
}>;

export function validateSimulationPersistenceInput(input: PersistSimulationInput) {
  if (!input.idempotencyKey.trim()) {
    throw new Error("SIMULATION_IDEMPOTENCY_KEY_REQUIRED");
  }

  if (input.steps.length === 0) {
    throw new Error("SIMULATION_CALCULATION_STEPS_REQUIRED");
  }

  const orders = new Set<number>();

  for (const step of input.steps) {
    if (!Number.isInteger(step.order) || step.order < 1 || orders.has(step.order)) {
      throw new Error("SIMULATION_STEP_ORDER_INVALID");
    }

    if (!step.ruleVersionId || !step.evidenceSourceId) {
      throw new Error("SIMULATION_STEP_LINKAGE_REQUIRED");
    }

    orders.add(step.order);
  }

  return {
    ruleVersionIds: [...new Set(input.steps.map((step) => step.ruleVersionId))],
    evidenceSourceIds: [...new Set(input.steps.map((step) => step.evidenceSourceId))],
  };
}
