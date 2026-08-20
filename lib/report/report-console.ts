import { and, asc, desc, eq } from "drizzle-orm";
import { can, withAuthorizedTenantTransaction } from "../auth/authorization";
import { getDatabase } from "../db/client";
import { clientCases, simulationRuns } from "../db/schema";
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
}>;

export type ReportConsoleResult =
  | (ReportConsoleState & Readonly<{ available: true }>)
  | ReportConsoleUnavailable;

const unavailableCopy: Readonly<Record<string, { title: string; detail: string }>> = {
  PERSISTENCE_MODE_FIXTURE: {
    title: "Pipeline serveur inactif",
    detail:
      "Le rapport cabinet exige PERSISTENCE_MODE=DATABASE et une base PostgreSQL managée. En mode fixtures, seul l'aperçu de travail est disponible.",
  },
  CLERK_SESSION_REQUIRED: {
    title: "Authentification requise",
    detail: "Connectez-vous avec votre compte cabinet pour accéder aux rapports du tenant.",
  },
  CLERK_ORGANIZATION_REQUIRED: {
    title: "Organisation cabinet requise",
    detail: "Sélectionnez l'organisation du cabinet : le tenant est résolu côté serveur, jamais depuis le navigateur.",
  },
  CLERK_TENANT_CONTEXT_DENIED: {
    title: "Accès refusé",
    detail:
      "Aucune adhésion active ne relie ce compte à un tenant interne. Un administrateur doit rattacher l'organisation et la membership en base.",
  },
  TENANT_MEMBERSHIP_REQUIRED: {
    title: "Adhésion révoquée",
    detail: "Votre adhésion au tenant n'est plus active : l'accès aux rapports est refusé jusqu'à sa réactivation.",
  },
  TENANT_AUTHORIZATION_DENIED: {
    title: "Rôle insuffisant",
    detail: "Votre rôle ne dispose pas de la capacité requise sur les rapports de ce tenant.",
  },
};

export function describeUnavailable(code: string): ReportConsoleUnavailable {
  const copy = unavailableCopy[code];

  return {
    available: false,
    code,
    title: copy?.title ?? "Rapport serveur indisponible",
    detail: copy?.detail ?? "Le pipeline serveur n'a pas pu être ouvert. Le code technique est affiché pour diagnostic.",
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

  if (input.requestedDossierOutOfScope) {
    blockers.push({
      code: "REPORT_DOSSIER_NOT_ACCESSIBLE",
      severity: "blocking",
      title: "Dossier hors périmètre",
      detail:
        "Le dossier demandé n'existe pas dans le périmètre de votre cabinet. Aucun repli sur un autre dossier n'est effectué.",
    });
  }

  if (!input.legalFreezeDate) {
    blockers.push({
      code: "REPORT_LEGAL_FREEZE_DATE_REQUIRED",
      severity: "blocking",
      title: "Date de gel juridique manquante",
      detail:
        "Aucune date de gel juridique n'est renseignée. Elle n'est jamais déduite : indiquez la date à laquelle le droit applicable est figé.",
    });
  }

  if (input.selectedRunIds.length === 0) {
    blockers.push({
      code: "REPORT_SIMULATION_RUN_REQUIRED",
      severity: "blocking",
      title: "Aucune simulation sélectionnée",
      detail: "Sélectionnez au moins une simulation du dossier à intégrer au rapport.",
    });
  }

  if (input.readinessErrorCode) {
    blockers.push({
      code: input.readinessErrorCode,
      severity: "blocking",
      title: "Faits du dossier illisibles",
      detail:
        "Les données nécessaires au rapport n'ont pas pu être lues dans le périmètre du tenant. Le code technique est affiché pour diagnostic.",
    });
  }

  for (const flag of input.readiness?.blockingFlags ?? []) {
    blockers.push({
      code: flag.code,
      severity: "blocking",
      title: flag.code === "review.professional_not_signed"
        ? "Revue professionnelle non signée"
        : "Point bloquant",
      detail: flag.detail,
    });
  }

  for (const flag of input.readiness?.reviewFlags ?? []) {
    blockers.push({
      code: flag.code,
      severity: "review",
      title: "Point de vigilance",
      detail: flag.detail,
    });
  }

  if (input.readiness && input.readiness.evidenceCount === 0) {
    blockers.push({
      code: "REPORT_EVIDENCE_MISSING",
      severity: "review",
      title: "Aucune pièce justificative rattachée",
      detail:
        "Aucune version de document n'est reliée aux simulations retenues : l'index des preuves du rapport sera vide.",
    });
  }

  if (input.freshness?.status === "outdated") {
    blockers.push({
      code: input.freshness.reasonCode ?? "REPORT_REGENERATION_REQUIRED",
      severity: "blocking",
      title: "Rapport obsolète — régénération requise",
      detail: input.freshness.reason
        ?? "Les faits du dossier ont changé depuis la dernière génération.",
    });
  }

  if (!input.storageConfigured) {
    blockers.push({
      code: "BLOB_READ_WRITE_TOKEN_REQUIRED",
      severity: "blocking",
      title: "Stockage privé indisponible",
      detail:
        "Aucun conteneur Vercel Private Blob n'est configuré : la génération d'un PDF serveur échouerait avant tout enregistrement.",
    });
  }

  if (!input.downloadSecretConfigured) {
    blockers.push({
      code: "DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED",
      severity: "blocking",
      title: "Secret de téléchargement absent",
      detail:
        "Sans secret de signature serveur, aucune autorisation de téléchargement temporaire ne peut être émise.",
    });
  }

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
