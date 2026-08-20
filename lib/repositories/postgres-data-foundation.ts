import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { withAuthorizedTenantTransaction } from "../auth/authorization";
import {
  auditLogs,
  calculationSteps,
  clientCases,
  evidenceSources,
  ruleVersions,
  simulationRuleVersions,
  simulationRuns,
} from "../db/schema";
import {
  type PersistedSimulationSnapshot,
  type PersistSimulationResult,
  type SimulationPersistenceRepository,
  validateSimulationPersistenceInput,
} from "./data-foundation-contract";

type Database = ReturnType<typeof getDatabase>;

function difference(expected: readonly string[], actual: readonly string[]) {
  const actualSet = new Set(actual);
  return expected.filter((value) => !actualSet.has(value));
}

export function createPostgresDataFoundationRepository(
  database: Database = getDatabase(),
): SimulationPersistenceRepository {
  return {
    async persist(context, input): Promise<PersistSimulationResult> {
      const linkage = validateSimulationPersistenceInput(input);

      return withAuthorizedTenantTransaction(database, context, "simulation.run", {
          tenantId: context.tenantId, type: "simulation", id: input.dossierId,
        }, async (transaction) => {

        const [existing] = await transaction
          .select({
            id: simulationRuns.id,
            caseId: simulationRuns.caseId,
            engineKey: simulationRuns.engineKey,
          })
          .from(simulationRuns)
          .where(
            and(
              eq(simulationRuns.tenantId, context.tenantId),
              eq(simulationRuns.idempotencyKey, input.idempotencyKey),
            ),
          )
          .limit(1);

        if (existing) {
          if (existing.caseId !== input.dossierId || existing.engineKey !== input.engineKey) {
            throw new Error("IDEMPOTENCY_KEY_REUSE_MISMATCH");
          }

          const pinnedRules = await transaction
            .select({ ruleVersionId: simulationRuleVersions.ruleVersionId })
            .from(simulationRuleVersions)
            .where(
              and(
                eq(simulationRuleVersions.tenantId, context.tenantId),
                eq(simulationRuleVersions.simulationRunId, existing.id),
              ),
            );

          return {
            runId: existing.id,
            reused: true,
            ruleVersionIds: pinnedRules.map((row) => row.ruleVersionId),
          };
        }

        const [dossier] = await transaction
          .select({ id: clientCases.id, householdId: clientCases.householdId })
          .from(clientCases)
          .where(
            and(
              eq(clientCases.tenantId, context.tenantId),
              eq(clientCases.id, input.dossierId),
            ),
          )
          .limit(1);

        if (!dossier) {
          throw new Error("DOSSIER_NOT_FOUND");
        }

        const availableRules = await transaction
          .select({ id: ruleVersions.id })
          .from(ruleVersions)
          .where(
            and(
              inArray(ruleVersions.id, linkage.ruleVersionIds),
              or(isNull(ruleVersions.tenantId), eq(ruleVersions.tenantId, context.tenantId)),
            ),
          );
        const missingRules = difference(
          linkage.ruleVersionIds,
          availableRules.map((rule) => rule.id),
        );

        if (missingRules.length > 0) {
          throw new Error(`RULE_VERSION_NOT_AVAILABLE:${missingRules.join(",")}`);
        }

        const availableEvidence = await transaction
          .select({ id: evidenceSources.id })
          .from(evidenceSources)
          .where(inArray(evidenceSources.id, linkage.evidenceSourceIds));
        const missingEvidence = difference(
          linkage.evidenceSourceIds,
          availableEvidence.map((source) => source.id),
        );

        if (missingEvidence.length > 0) {
          throw new Error(`EVIDENCE_SOURCE_NOT_FOUND:${missingEvidence.join(",")}`);
        }

        const [run] = await transaction
          .insert(simulationRuns)
          .values({
            tenantId: context.tenantId,
            caseId: dossier.id,
            householdId: dossier.householdId,
            engineKey: input.engineKey,
            engineVersion: input.engineVersion,
            scenario: input.scenario,
            status: input.status,
            idempotencyKey: input.idempotencyKey,
            inputSnapshot: { ...input.inputSnapshot },
            inputSnapshotId: input.inputSnapshotId,
            ruleSnapshotId: input.ruleSnapshotId,
            coverageLimitIds: [...(input.coverageLimitIds ?? [])],
            professionalValidationRequired: input.professionalValidationRequired,
            computedResult: { ...input.outputSnapshot },
            output: { ...input.outputSnapshot },
            completedAt: new Date(),
          })
          .returning({ id: simulationRuns.id });

        await transaction.insert(calculationSteps).values(
          input.steps.map((step) => ({
            tenantId: context.tenantId,
            simulationRunId: run.id,
            stepOrder: step.order,
            label: step.label,
            inputValue: step.inputValue,
            formula: step.formula,
            outputValue: step.outputValue,
            ruleVersionId: step.ruleVersionId,
            evidenceSourceId: step.evidenceSourceId,
            confidenceStatus: step.confidenceStatus,
            usedData: [...(step.usedData ?? [])],
            intermediateResult: step.intermediateResult,
            coverageLimitIds: [...(step.coverageLimitIds ?? [])],
            nextAction: step.nextAction,
            displayStatus: step.displayStatus,
          })),
        );

        await transaction.insert(simulationRuleVersions).values(
          linkage.ruleVersionIds.map((ruleVersionId) => ({
            tenantId: context.tenantId,
            simulationRunId: run.id,
            ruleVersionId,
            purpose: "calculation-step",
          })),
        );

        await transaction.insert(auditLogs).values({
          tenantId: context.tenantId,
          actorIdentityId: context.identityId,
          action: "simulation.run",
          entityType: "simulation",
          entityId: run.id,
          summary: `Simulation ${input.engineKey} persistée avec ses traces et versions de règles.`,
          correlationId: context.correlationId,
        });

        return {
          runId: run.id,
          reused: false,
          ruleVersionIds: linkage.ruleVersionIds,
        };
      });
    },

    async findById(context, runId): Promise<PersistedSimulationSnapshot | null> {
      return withAuthorizedTenantTransaction(database, context, "dossier.read", {
          tenantId: context.tenantId, type: "simulation", id: runId,
        }, async (transaction) => {

        const [run] = await transaction
        .select({
          id: simulationRuns.id,
          tenantId: simulationRuns.tenantId,
          caseId: simulationRuns.caseId,
          householdId: simulationRuns.householdId,
          idempotencyKey: simulationRuns.idempotencyKey,
          engineKey: simulationRuns.engineKey,
          engineVersion: simulationRuns.engineVersion,
          scenario: simulationRuns.scenario,
          status: simulationRuns.status,
          inputSnapshot: simulationRuns.inputSnapshot,
          outputSnapshot: simulationRuns.output,
        })
        .from(simulationRuns)
        .where(
          and(eq(simulationRuns.tenantId, context.tenantId), eq(simulationRuns.id, runId)),
        )
        .limit(1);

        if (!run) {
          return null;
        }

        const steps = await transaction
        .select({
          order: calculationSteps.stepOrder,
          label: calculationSteps.label,
          inputValue: calculationSteps.inputValue,
          formula: calculationSteps.formula,
          outputValue: calculationSteps.outputValue,
          ruleVersionId: calculationSteps.ruleVersionId,
          evidenceSourceId: calculationSteps.evidenceSourceId,
          confidenceStatus: calculationSteps.confidenceStatus,
          usedData: calculationSteps.usedData,
          intermediateResult: calculationSteps.intermediateResult,
          coverageLimitIds: calculationSteps.coverageLimitIds,
          nextAction: calculationSteps.nextAction,
          displayStatus: calculationSteps.displayStatus,
        })
        .from(calculationSteps)
        .where(
          and(
            eq(calculationSteps.tenantId, context.tenantId),
            eq(calculationSteps.simulationRunId, runId),
          ),
        )
        .orderBy(asc(calculationSteps.stepOrder));

        const links = await transaction
        .select({ ruleVersionId: simulationRuleVersions.ruleVersionId })
        .from(simulationRuleVersions)
        .where(
          and(
            eq(simulationRuleVersions.tenantId, context.tenantId),
            eq(simulationRuleVersions.simulationRunId, runId),
          ),
        );

        return {
          runId: run.id,
          tenantId: run.tenantId,
          dossierId: run.caseId,
          householdId: run.householdId,
          idempotencyKey: run.idempotencyKey,
          engineKey: run.engineKey,
          engineVersion: run.engineVersion,
          scenario: run.scenario,
          status: run.status,
          inputSnapshot: run.inputSnapshot,
          outputSnapshot: run.outputSnapshot,
          steps: steps.map((step) => ({
            ...step,
            confidenceStatus: step.confidenceStatus as
              | "validated"
              | "indicative"
              | "needs_review",
            intermediateResult: step.intermediateResult ?? undefined,
            nextAction: step.nextAction ?? undefined,
            displayStatus: step.displayStatus ?? undefined,
          })),
          ruleVersionIds: links.map((link) => link.ruleVersionId),
        };
      });
    },
  };
}
