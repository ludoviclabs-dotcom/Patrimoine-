import { createHash } from "node:crypto";

/**
 * Immutable report snapshot.
 *
 * The PDF is rendered exclusively from this structure, never from live UI
 * state. `business` holds only facts read from the database and carries no
 * generation timestamp, so the same database facts always produce the same
 * `businessSha256`. `validation` and `generation` are the mutable-in-time
 * parts, which is why a validation produces a new version with the same
 * business hash and a different snapshot hash.
 */

export const reportSnapshotSchemaVersion = "pf06-report-snapshot-1";
export const reportGeneratorVersion = "PF06-SERVER-REPORT-1.0.0";

export type ReportVersionStatus = "draft" | "changes_requested" | "validated";

export type ReportReviewFlagSeverity = "info" | "review" | "blocking";

export type ReportReviewFlag = Readonly<{
  code: string;
  severity: ReportReviewFlagSeverity;
  detail: string;
  simulationRunId?: string;
  stepOrder?: number;
}>;

export type ReportDossierIdentity = Readonly<{
  tenantId: string;
  caseId: string;
  reference: string;
  title: string;
  status: string;
  fiscalYear: number;
}>;

export type ReportSimulationRun = Readonly<{
  id: string;
  engineKey: string;
  engineVersion: string;
  scenario: string;
  status: string;
  professionalValidationRequired: boolean;
  inputSnapshot: Record<string, unknown>;
  output: Record<string, unknown>;
  coverageLimitIds: readonly string[];
  completedAt: string | null;
}>;

export type ReportRuleVersion = Readonly<{
  id: string;
  ruleSet: string;
  version: string;
  title: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceReference: string;
  evidenceSourceIds: readonly string[];
  checksumSha256: string;
}>;

export type ReportCalculationStep = Readonly<{
  simulationRunId: string;
  stepOrder: number;
  label: string;
  inputValue: string;
  formula: string;
  outputValue: string;
  ruleVersionId: string;
  evidenceSourceId: string;
  confidenceStatus: string;
  displayStatus: string | null;
  coverageLimitIds: readonly string[];
  nextAction: string | null;
}>;

export type ReportEvidenceSource = Readonly<{
  id: string;
  title: string;
  authority: string;
  url: string;
  legalScope: string;
  reliability: string;
  status: string;
  checkedAt: string;
}>;

export type ReportDocumentReference = Readonly<{
  documentId: string;
  documentVersionId: string;
  versionNumber: number;
  sha256: string;
  byteSize: number;
  mimeType: string;
  purpose: string;
  simulationRunId: string;
}>;

export type ReportComparisonRow = Readonly<{
  simulationRunId: string;
  scenario: string;
  engineKey: string;
  status: string;
  finalStepLabel: string | null;
  finalStepOutputValue: string | null;
}>;

export type ReportProfessionalValidationState = Readonly<{
  required: boolean;
  decision: string;
  reviewId: string | null;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  summary: string | null;
  requiredActions: readonly string[];
}>;

export type ReportBusinessPayload = Readonly<{
  dossier: ReportDossierIdentity;
  legalFreezeDate: string;
  simulationRunIds: readonly string[];
  runs: readonly ReportSimulationRun[];
  ruleVersions: readonly ReportRuleVersion[];
  calculationSteps: readonly ReportCalculationStep[];
  comparisons: readonly ReportComparisonRow[];
  reviewFlags: readonly ReportReviewFlag[];
  professionalValidation: ReportProfessionalValidationState;
  evidenceSources: readonly ReportEvidenceSource[];
  documentReferences: readonly ReportDocumentReference[];
  coverageLimitIds: readonly string[];
  limitations: readonly string[];
}>;

export type ReportValidationBlock = Readonly<{
  status: ReportVersionStatus;
  decision: "pending" | "approved" | "changes_requested" | "rejected";
  validatedByIdentityId: string | null;
  validatedAt: string | null;
  comment: string | null;
}>;

export type ReportGenerationBlock = Readonly<{
  reportId: string;
  reportVersionId: string;
  versionNumber: number;
  generatedAt: string;
  generatedByIdentityId: string;
  generatorVersion: string;
  watermark: string | null;
}>;

export type ReportSnapshot = Readonly<{
  schemaVersion: typeof reportSnapshotSchemaVersion;
  business: ReportBusinessPayload;
  validation: ReportValidationBlock;
  generation: ReportGenerationBlock;
}>;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/**
 * Canonical JSON: object keys sorted, no insignificant whitespace. Two
 * structurally identical payloads therefore always serialise identically,
 * whatever order the database or the code produced their properties in.
 */
export function canonicalJson(value: unknown): string {
  const normalize = (input: unknown): JsonValue => {
    if (input === null || input === undefined) {
      return null;
    }

    if (Array.isArray(input)) {
      return input.map(normalize);
    }

    if (input instanceof Date) {
      return input.toISOString();
    }

    if (typeof input === "object") {
      const entries = Object.entries(input as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

      return Object.fromEntries(entries.map(([key, entryValue]) => [key, normalize(entryValue)]));
    }

    if (typeof input === "number" && !Number.isFinite(input)) {
      throw new Error("REPORT_SNAPSHOT_NON_FINITE_NUMBER");
    }

    return input as JsonValue;
  };

  return JSON.stringify(normalize(value));
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Hash of the business facts alone — stable across generations. */
export function hashBusinessPayload(business: ReportBusinessPayload) {
  return sha256Hex(canonicalJson(business));
}

/** Hash of the complete snapshot, including validation and generation blocks. */
export function hashSnapshot(snapshot: ReportSnapshot) {
  return sha256Hex(canonicalJson(snapshot));
}

/**
 * Watermark policy (ARCHITECTURE_CIBLE § 9.4). A validated report carries no
 * watermark and instead displays an explicit validation banner, so it can
 * never be confused with a draft.
 */
export function resolveWatermark(status: ReportVersionStatus): string | null {
  switch (status) {
    case "draft":
      return "BROUILLON — NON VALIDÉ";
    case "changes_requested":
      return "À REVOIR";
    case "validated":
      return null;
  }
}

const orderByString = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

/**
 * Assembles the business payload in a fully deterministic order. Every
 * collection is sorted on a stable key so the hash never depends on the
 * database's row order.
 */
export function buildReportBusinessPayload(input: {
  dossier: ReportDossierIdentity;
  legalFreezeDate: string;
  runs: readonly ReportSimulationRun[];
  ruleVersions: readonly ReportRuleVersion[];
  calculationSteps: readonly ReportCalculationStep[];
  evidenceSources: readonly ReportEvidenceSource[];
  documentReferences: readonly ReportDocumentReference[];
  professionalValidation: ReportProfessionalValidationState;
  limitations: readonly string[];
}): ReportBusinessPayload {
  const runs = [...input.runs].sort((left, right) => orderByString(left.id, right.id));
  const steps = [...input.calculationSteps].sort((left, right) =>
    orderByString(left.simulationRunId, right.simulationRunId) || left.stepOrder - right.stepOrder,
  );
  const ruleVersions = [...input.ruleVersions].sort((left, right) => orderByString(left.id, right.id));
  const evidenceSources = [...input.evidenceSources].sort((left, right) => orderByString(left.id, right.id));
  const documentReferences = [...input.documentReferences].sort((left, right) =>
    orderByString(left.documentVersionId, right.documentVersionId),
  );

  const comparisons: ReportComparisonRow[] = runs.map((run) => {
    const runSteps = steps.filter((step) => step.simulationRunId === run.id);
    const finalStep = runSteps.length > 0 ? runSteps[runSteps.length - 1] : null;

    return {
      simulationRunId: run.id,
      scenario: run.scenario,
      engineKey: run.engineKey,
      status: run.status,
      finalStepLabel: finalStep?.label ?? null,
      finalStepOutputValue: finalStep?.outputValue ?? null,
    };
  });

  const coverageLimitIds = [
    ...new Set([
      ...runs.flatMap((run) => run.coverageLimitIds),
      ...steps.flatMap((step) => step.coverageLimitIds),
    ]),
  ].sort(orderByString);

  return {
    dossier: input.dossier,
    legalFreezeDate: input.legalFreezeDate,
    simulationRunIds: runs.map((run) => run.id),
    runs,
    ruleVersions,
    calculationSteps: steps,
    comparisons,
    reviewFlags: buildReviewFlags({
      runs,
      steps,
      ruleVersions,
      coverageLimitIds,
      professionalValidation: input.professionalValidation,
    }),
    professionalValidation: input.professionalValidation,
    evidenceSources,
    documentReferences,
    coverageLimitIds,
    limitations: [...input.limitations],
  };
}

/**
 * Derives review flags from database facts only. Nothing is inferred: a flag
 * exists because a stored value says so. `blocking` flags are what the
 * readiness gate refuses to validate over.
 */
export function buildReviewFlags(input: {
  runs: readonly ReportSimulationRun[];
  steps: readonly ReportCalculationStep[];
  ruleVersions: readonly ReportRuleVersion[];
  coverageLimitIds: readonly string[];
  professionalValidation: ReportProfessionalValidationState;
}): readonly ReportReviewFlag[] {
  const flags: ReportReviewFlag[] = [];

  if (input.runs.length === 0) {
    flags.push({
      code: "simulation.none",
      severity: "blocking",
      detail: "Aucune simulation n'est rattachée à ce rapport.",
    });
  }

  for (const run of input.runs) {
    if (run.status !== "completed") {
      flags.push({
        code: "simulation.not_completed",
        severity: "blocking",
        detail: `Simulation ${run.scenario} en statut ${run.status}.`,
        simulationRunId: run.id,
      });
    }

    if (run.professionalValidationRequired) {
      flags.push({
        code: "simulation.professional_validation_required",
        severity: "review",
        detail: `La simulation ${run.scenario} exige une validation professionnelle.`,
        simulationRunId: run.id,
      });
    }
  }

  for (const step of input.steps) {
    if (step.confidenceStatus !== "validated") {
      flags.push({
        code: "calculation.step_not_validated",
        severity: "blocking",
        detail: `Étape « ${step.label} » en statut ${step.confidenceStatus}.`,
        simulationRunId: step.simulationRunId,
        stepOrder: step.stepOrder,
      });
    }
  }

  const referencedRuleIds = [...new Set(input.steps.map((step) => step.ruleVersionId))].sort(orderByString);

  for (const ruleVersionId of referencedRuleIds) {
    const ruleVersion = input.ruleVersions.find((candidate) => candidate.id === ruleVersionId);

    if (!ruleVersion) {
      flags.push({
        code: "rule.version_unresolved",
        severity: "blocking",
        detail: `Version de règle ${ruleVersionId} introuvable dans le périmètre du tenant.`,
      });
      continue;
    }

    if (ruleVersion.status !== "active") {
      flags.push({
        code: "rule.version_not_active",
        severity: "blocking",
        detail: `Version de règle ${ruleVersion.id} en statut ${ruleVersion.status}.`,
      });
    }

    if (ruleVersion.evidenceSourceIds.length === 0) {
      flags.push({
        code: "rule.version_without_source",
        severity: "blocking",
        detail: `Version de règle ${ruleVersion.id} sans source officielle rattachée.`,
      });
    }
  }

  for (const coverageLimitId of input.coverageLimitIds) {
    flags.push({
      code: "coverage.limit",
      severity: "review",
      detail: `Limite de couverture déclarée : ${coverageLimitId}.`,
    });
  }

  if (input.professionalValidation.required && input.professionalValidation.decision !== "approved") {
    flags.push({
      code: "review.professional_not_signed",
      severity: "blocking",
      detail: "La revue professionnelle requise n'est pas signée.",
    });
  }

  return flags.sort(
    (left, right) =>
      orderByString(left.code, right.code)
      || orderByString(left.simulationRunId ?? "", right.simulationRunId ?? "")
      || (left.stepOrder ?? 0) - (right.stepOrder ?? 0),
  );
}

export function blockingFlags(business: ReportBusinessPayload) {
  return business.reviewFlags.filter((flag) => flag.severity === "blocking");
}

export function assembleReportSnapshot(input: {
  business: ReportBusinessPayload;
  validation: ReportValidationBlock;
  generation: ReportGenerationBlock;
}): ReportSnapshot {
  return {
    schemaVersion: reportSnapshotSchemaVersion,
    business: input.business,
    validation: input.validation,
    generation: input.generation,
  };
}
