import { appendAuditEventToRepository } from "../audit/repository";
import { demoHousehold } from "../demo-data/household";
import { demoCases, demoClients, demoDocuments, demoTenant, demoV1AuditLogs } from "../demo-data/v1";
import { getLivingDossier } from "../dossiers/v2-dossiers";
import { generateProfessionalDocuments, getV2TaxRuns } from "../tax/v2-engines";
import type {
  AuditLogEntry,
  DataExportBundle,
  DataRequest,
  PrivateDocumentMetadata,
  RepositoryReadinessReport,
  RetentionPolicy,
  UserAccount,
} from "../types";

const caseId = demoCases[0].id;
const client = demoClients[0];
const clientCase = demoCases[0];

function nowIso() {
  return "2026-05-27T09:00:00.000Z";
}

function audit(action: AuditLogEntry["action"], summary: string, entityId = caseId): AuditLogEntry {
  return {
    id: `audit-v21-${action}-${entityId}`,
    tenantId: demoTenant.id,
    actorUserId: "user-conseiller-marie",
    action,
    entityType: action.startsWith("document") ? "document" : action.startsWith("data") ? "data_request" : "case",
    entityId,
    createdAt: nowIso(),
    summary,
  };
}

export function getRepositoryReadinessReport(): RepositoryReadinessReport {
  return {
    mode: "demo-fixtures",
    tenantIsolation: "enforced-in-repository-contract",
    persistenceTarget: "postgres",
    tablesReady: [
      "tenants",
      "users",
      "clients",
      "client_cases",
      "dossier_snapshots",
      "professional_documents",
      "data_requests",
      "private_document_metadata",
      "retention_policies",
      "audit_logs",
      "golden_cases",
    ],
    externalConnectorsRequired: ["DATABASE_URL", "BLOB_READ_WRITE_TOKEN", "auth_provider"],
    safeWithoutConnectors: true,
  };
}

export function getRetentionPolicy(): RetentionPolicy {
  return {
    id: "retention-policy-demo-v21",
    tenantId: demoTenant.id,
    scope: "pilot",
    personalDataMonths: 24,
    auditLogYears: 10,
    documentRetentionYears: 5,
    deletionRequiresProfessionalApproval: true,
    exportAvailable: true,
    lastReviewedAt: "2026-05-27",
  };
}

export function getPrivateDocumentMetadataFixture(input: Partial<PrivateDocumentMetadata> = {}): PrivateDocumentMetadata {
  return {
    id: input.id ?? "private-doc-meta-demo-v21",
    tenantId: input.tenantId ?? demoTenant.id,
    clientId: input.clientId ?? client.id,
    caseId: input.caseId ?? clientCase.id,
    kind: input.kind ?? "tax_notice",
    label: input.label ?? "Avis d'imposition - métadonnée privée",
    status: input.status ?? "to_review",
    storageProvider: "demo-private-metadata",
    visibility: "private",
    allowPublicUrl: false,
    sha256: input.sha256 ?? "demo-private-metadata-sha256-placeholder",
    createdAt: nowIso(),
    expectedAction: input.expectedAction ?? "Brancher Blob privé avant réception d'un fichier réel.",
  };
}

export function createPrivateDocumentMetadata(input: Partial<PrivateDocumentMetadata> = {}) {
  const metadata = getPrivateDocumentMetadataFixture(input);
  const auditResult = appendAuditEventToRepository(
    audit("document.metadata.created", `Métadonnée documentaire privée créée : ${metadata.label}`, metadata.id),
  );

  return { metadata, audit: auditResult };
}

export function createDataExportRequest(): DataRequest {
  const auditResult = appendAuditEventToRepository(
    audit("data.export.requested", "Export JSON dossier demandé par le cabinet", caseId),
  );

  return {
    id: "data-export-request-v21",
    tenantId: demoTenant.id,
    clientId: client.id,
    caseId,
    kind: "export",
    status: "completed",
    requestedAt: nowIso(),
    completedAt: nowIso(),
    exportFormat: "json",
    reason: "Exercice RGPD de portabilité en mode pilote.",
    auditLogId: auditResult.event.id,
  };
}

export function buildDataExportBundle(request = createDataExportRequest()): DataExportBundle {
  const taxRuns = getV2TaxRuns();

  return {
    id: "data-export-bundle-claire-marc-v21",
    tenantId: demoTenant.id,
    clientId: request.clientId,
    caseId: request.caseId,
    generatedAt: nowIso(),
    format: "json",
    sections: {
      client,
      case: clientCase,
      household: demoHousehold,
      simulations: taxRuns,
      reports: [
        {
          id: "report-export-v21",
          tenantId: demoTenant.id,
          caseId,
          version: "V2.1-export",
          status: "issued_for_review",
          generatedAt: nowIso(),
          simulationRunIds: taxRuns.map((run) => run.id),
          validationDecision: "pending",
          evidenceSourceIds: Array.from(new Set(taxRuns.flatMap((run) => run.evidenceSourceIds))),
          coverageLimitIds: Array.from(new Set(taxRuns.flatMap((run) => run.coverageLimitIds ?? []))),
        },
      ],
      documents: demoDocuments,
      audit: [...demoV1AuditLogs],
    },
    limitations: [
      "Export de démonstration sans données réelles.",
      "Les documents binaires ne sont pas inclus tant que Blob privé n'est pas branché.",
      "Les calculs restent indicatifs et soumis à validation professionnelle.",
    ],
  };
}

export function createDataDeletionRequest(user?: UserAccount): DataRequest {
  const auditResult = appendAuditEventToRepository(
    audit("data.deletion.requested", `Suppression demandée par ${user?.role ?? "conseiller"}`, caseId),
  );

  return {
    id: "data-deletion-request-v21",
    tenantId: demoTenant.id,
    clientId: client.id,
    caseId,
    kind: "deletion",
    status: "queued",
    requestedAt: nowIso(),
    reason: "Suppression placée en file de revue pour préserver audit et obligations cabinet.",
    auditLogId: auditResult.event.id,
  };
}

export function getPilotRepositoryState() {
  return {
    readiness: getRepositoryReadinessReport(),
    retention: getRetentionPolicy(),
    livingDossier: getLivingDossier(),
    professionalDocuments: generateProfessionalDocuments(),
    privateDocument: getPrivateDocumentMetadataFixture(),
  };
}
