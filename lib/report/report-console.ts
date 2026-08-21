import { and, asc, desc, eq } from "drizzle-orm";
import { can, withAuthorizedTenantTransaction } from "../auth/authorization";
import { getDatabase } from "../db/client";
import { clientCases, simulationRuns } from "../db/schema";
import { describeError } from "../errors/error-catalog";
import { resolvePersistenceRuntime } from "../persistence/mode";
import type { TenantContext } from "../tenancy/tenant-context";
import { resolveDownloadSigningSecret } from "../documents/access-grant";
import {
  createInMemoryPrivateDocumentStorage,
  createVercelPrivateBlobStorage,
} from "../documents/private-storage";
import { createServerReportService, type ReportReadiness, type ReportVersionSummary } from "./report-service";
import type { ReportFreshness } from "./freshness";

/**
 * Server read model behind the cabinet report screen.
 *
 * It performs no mutation: every action stays behind the audited API routes.
 * Its job is to give the interface exactly the facts it needs to show a state
 * instead of guessing one — including why an action is unavailable.
 */

type Database = ReturnType<typeof getDatabase>;

export type ReportConsoleDossier = Readonly<{
  id: string;
  reference: string;
  title: string;
  status: string;
  fiscalYear: number;
}>;

export type ReportConsoleRun = Readonly<{
  id: string;
  scenario: string;
  engineKey: string;
  engineVersion: string;
  status: string;
  professionalValidationRequired: boolean;
  completedAt: string | null;
}>;

export type ReportConsoleBlocker = Readonly<{
  code: string;
  title: string;
  detail: string;
  nextAction: string;
  severity: "blocking" | "review" | "info";
}>;

export type ReportConsoleState = Readonly<{
  role: TenantContext["role"];
  capabilities: Readonly<{ generate: boolean; validate: boolean; download: boolean }>;
  dossiers: readonly ReportConsoleDossier[];
  selectedDossier: ReportConsoleDossier | null;
  runs: readonly ReportConsoleRun[];
  selectedRunIds: readonly string[];
  legalFreezeDate: string | null;
  versions: readonly ReportVersionSummary[];
  currentVersion: ReportVersionSummary | null;
  freshness: ReportFreshness | null;
  readiness: ReportReadiness | null;
  blockers: readonly ReportConsoleBlocker[];
  storageConfigured: boolean;
}>;

export type ReportConsoleUnavailable = Readonly<{
  available: false;
  code: string;
  title: string;
  detail: string;
  nextAction: string;
}>;

export type ReportConsoleResult =
  | (ReportConsoleState & Readonly<{ available: true }>)
  | ReportConsoleUnavailable;

/**
 * PF-07 — wording now comes from the shared catalog, so the same refusal reads
 * identically wherever it surfaces and always names the next action.
 */
export function describeUnavailable(code: string): ReportConsoleUnavailable {
  const descriptor = describeError(code);

  return {
    available: false,
    code,
    title: descriptor.title,
    detail: descriptor.explanation,
    nextAction: descriptor.nextAction,
  };
}

export function isServerPipelineEnabled(env: NodeJS.ProcessEnv = process.env) {
  return resolvePersistenceRuntime(env).mode === "DATABASE";
}

export function isPrivateStorageConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.BLOB_READ_WRITE_TOKEN?.trim());
}

/**
 * Translates readiness, freshness and configuration facts into the explicit
 * blockers the screen must display. Nothing is hidden behind a generic
 * message: every entry carries its own machine-readable code.
 */
export function buildBlockers(input: {
  legalFreezeDate: string | null;
  selectedRunIds: readonly string[];
  readiness: ReportReadiness | null;
  readinessErrorCode: string | null;
  freshness: ReportFreshness | null;
  storageConfigured: boolean;
  downloadSecretConfigured: boolean;
  requestedDossierOutOfScope?: boolean;
}): readonly ReportConsoleBlocker[] {
  const blockers: ReportConsoleBlocker[] = [];

  /**
   * Every blocker keeps its own machine-readable code and takes its wording
   * from the shared catalog, so nothing is collapsed into a generic message
   * and the same refusal reads identically on every screen.
   */
  const add = (code: string, override?: Parameters<typeof describeError>[1]) => {
    const descriptor = describeError(code, override);
    blockers.push({
      code,
      title: descriptor.title,
      detail: descriptor.explanation,
      nextAction: descriptor.nextAction,
      severity: descriptor.severity,
    });
  };

  if (input.requestedDossierOutOfScope) add("REPORT_DOSSIER_NOT_ACCESSIBLE");
  if (!input.legalFreezeDate) add("REPORT_LEGAL_FREEZE_DATE_REQUIRED");
  if (input.selectedRunIds.length === 0) add("REPORT_SIMULATION_RUN_REQUIRED");

  if (input.readinessErrorCode) {
    // An unreadable dossier keeps the underlying code; it never resolves to
    // "everything is fine".
    add(input.readinessErrorCode, {
      title: "Faits du dossier illisibles",
      severity: "blocking",
    });
  }

  for (const flag of input.readiness?.blockingFlags ?? []) {
    add(flag.code, { explanation: flag.detail, severity: "blocking" });
  }

  for (const flag of input.readiness?.reviewFlags ?? []) {
    add(flag.code, { explanation: flag.detail, severity: "review" });
  }

  if (input.readiness && input.readiness.evidenceCount === 0) add("REPORT_EVIDENCE_MISSING");

  if (input.freshness?.status === "outdated") {
    add(input.freshness.reasonCode ?? "REPORT_REGENERATION_REQUIRED", {
      ...(input.freshness.reason ? { explanation: input.freshness.reason } : {}),
      severity: "blocking",
    });
  }

  if (!input.storageConfigured) add("BLOB_READ_WRITE_TOKEN_REQUIRED");
  if (!input.downloadSecretConfigured) add("DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED");

  return blockers;
}

function isoOrNull(value: Date | null) {
  return value ? value.toISOString() : null;
}

/**
 * Loads everything the report screen displays for one tenant, optionally
 * scoped to a dossier, a run selection and a legal freeze date chosen by the
 * operator. Read-only.
 */
export async function loadReportConsole(
  context: TenantContext,
  params: {
    caseId?: string;
    simulationRunIds?: readonly string[];
    legalFreezeDate?: string;
    database?: Database;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<ReportConsoleResult> {
  const env = params.env ?? process.env;

  if (!isServerPipelineEnabled(env)) {
    return describeUnavailable("PERSISTENCE_MODE_FIXTURE");
  }

  const database = params.database ?? getDatabase();
  const storageConfigured = isPrivateStorageConfigured(env);
  let downloadSecretConfigured = true;

  try {
    resolveDownloadSigningSecret(env);
  } catch {
    downloadSecretConfigured = false;
  }

  const capabilities = {
    generate: can(context, "report.generate", { tenantId: context.tenantId, type: "report" }),
    validate: can(context, "report.validate", { tenantId: context.tenantId, type: "report" }),
    download: can(context, "report.download", { tenantId: context.tenantId, type: "report" }),
  } as const;

  const dossiers = await withAuthorizedTenantTransaction(
    database,
    context,
    "dossier.read",
    { tenantId: context.tenantId, type: "dossier" },
    async (transaction) => {
      const rows = await transaction
        .select({
          id: clientCases.id,
          reference: clientCases.reference,
          title: clientCases.title,
          status: clientCases.status,
          fiscalYear: clientCases.fiscalYear,
        })
        .from(clientCases)
        .where(eq(clientCases.tenantId, context.tenantId))
        .orderBy(asc(clientCases.reference));

      return rows;
    },
  );

  const selectedDossier = params.caseId
    ? dossiers.find((dossier) => dossier.id === params.caseId) ?? null
    : dossiers[0] ?? null;
  // A dossier the tenant cannot see never falls back to another one.
  const requestedDossierOutOfScope = Boolean(params.caseId) && !selectedDossier;

  if (!selectedDossier) {
    return {
      available: true,
      role: context.role,
      capabilities,
      dossiers,
      selectedDossier: null,
      runs: [],
      selectedRunIds: [],
      legalFreezeDate: null,
      versions: [],
      currentVersion: null,
      freshness: null,
      readiness: null,
      blockers: buildBlockers({
        legalFreezeDate: null,
        selectedRunIds: [],
        readiness: null,
        readinessErrorCode: null,
        freshness: null,
        storageConfigured,
        downloadSecretConfigured,
        requestedDossierOutOfScope,
      }),
      storageConfigured,
    };
  }

  const runs = await withAuthorizedTenantTransaction(
    database,
    context,
    "dossier.read",
    { tenantId: context.tenantId, type: "dossier", id: selectedDossier.id },
    async (transaction) => {
      const rows = await transaction
        .select({
          id: simulationRuns.id,
          scenario: simulationRuns.scenario,
          engineKey: simulationRuns.engineKey,
          engineVersion: simulationRuns.engineVersion,
          status: simulationRuns.status,
          professionalValidationRequired: simulationRuns.professionalValidationRequired,
          completedAt: simulationRuns.completedAt,
        })
        .from(simulationRuns)
        .where(
          and(
            eq(simulationRuns.tenantId, context.tenantId),
            eq(simulationRuns.caseId, selectedDossier.id),
          ),
        )
        .orderBy(desc(simulationRuns.createdAt));

      return rows.map((row) => ({ ...row, completedAt: isoOrNull(row.completedAt) }));
    },
  );

  const service = createServerReportService({
    database,
    storage: storageConfigured
      ? createVercelPrivateBlobStorage(env)
      : createInMemoryPrivateDocumentStorage(),
    downloadSigningSecret: downloadSecretConfigured
      ? resolveDownloadSigningSecret(env)
      : "unconfigured-download-secret-placeholder",
  });

  const versions = capabilities.download
    ? await service.listVersions(context, selectedDossier.id)
    : [];
  const currentVersion = versions.length > 0 ? versions[versions.length - 1] : null;

  const currentSnapshot = currentVersion
    ? await service.getSnapshot(context, currentVersion.reportVersionId)
    : null;

  const selectedRunIds = params.simulationRunIds && params.simulationRunIds.length > 0
    ? params.simulationRunIds
    : currentSnapshot?.business.simulationRunIds ?? [];
  const legalFreezeDate = params.legalFreezeDate
    ?? currentSnapshot?.business.legalFreezeDate
    ?? null;

  const freshness = currentVersion
    ? await service.evaluateFreshness(context, currentVersion.reportVersionId)
    : null;

  let readiness: ReportReadiness | null = null;
  let readinessErrorCode: string | null = null;

  if (legalFreezeDate && selectedRunIds.length > 0 && capabilities.generate) {
    try {
      readiness = await service.previewReadiness(context, {
        caseId: selectedDossier.id,
        simulationRunIds: selectedRunIds,
        legalFreezeDate,
      });
    } catch (error) {
      readinessErrorCode = error instanceof Error ? error.message : "REPORT_READINESS_UNAVAILABLE";
    }
  }

  return {
    available: true,
    role: context.role,
    capabilities,
    dossiers,
    selectedDossier,
    runs,
    selectedRunIds,
    legalFreezeDate,
    versions,
    currentVersion,
    freshness,
    readiness,
    blockers: buildBlockers({
      legalFreezeDate,
      selectedRunIds,
      readiness,
      readinessErrorCode,
      freshness,
      storageConfigured,
      downloadSecretConfigured,
    }),
    storageConfigured,
  };
}
