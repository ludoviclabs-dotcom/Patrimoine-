import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { withAuthorizedTenantTransaction } from "../auth/authorization";
import { getDatabase } from "../db/client";
import type { TenantTransaction } from "../db/tenant-transaction";
import {
  auditLogs,
  documentVersions,
  documents,
  simulationDocumentVersions,
  simulationRuns,
} from "../db/schema";
import type { TenantContext } from "../tenancy/tenant-context";
import {
  assertBlobKeyOwnedByTenant,
  buildDocumentVersionBlobKey,
  privateDocumentStorageProvider,
} from "./blob";
import {
  downloadGrantTtlSeconds,
  issueDownloadGrant,
  verifyDownloadGrant,
} from "./access-grant";
import type { PrivateDocumentStorage } from "./private-storage";
import { validateUploadCandidate } from "./upload-validation";

type Database = ReturnType<typeof getDatabase>;

export type PrivateDocumentServiceDependencies = Readonly<{
  database?: Database;
  storage: PrivateDocumentStorage;
  downloadSigningSecret: string;
  now?: () => Date;
}>;

export type UploadDocumentVersionInput = Readonly<{
  documentId: string;
  fileName: string;
  declaredMimeType: string | null;
  bytes: Uint8Array;
}>;

export type DocumentVersionSummary = Readonly<{
  documentId: string;
  versionId: string;
  versionNumber: number;
  mimeType: string;
  byteSize: number;
  sha256: string;
  status: "pending" | "available" | "quarantined" | "failed";
  scanStatus: "pending" | "clean" | "infected";
  originalFileName: string;
  createdAt: Date;
}>;

export type DownloadAuthorization = DocumentVersionSummary & Readonly<{
  token: string;
  expiresAt: string;
}>;

export type DownloadPayload = Readonly<{
  documentId: string;
  versionId: string;
  versionNumber: number;
  originalFileName: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  stream: ReadableStream<Uint8Array>;
}>;

/** Evidence descriptor a report can cite: one precise version and its hash. */
export type DocumentEvidenceReference = Readonly<{
  documentId: string;
  versionId: string;
  versionNumber: number;
  sha256: string;
  byteSize: number;
  mimeType: string;
  purpose: string;
  capturedAt: Date;
}>;

function auditIdentity(context: TenantContext) {
  return {
    tenantId: context.tenantId,
    actorIdentityId: context.identityId,
    correlationId: context.correlationId,
  } as const;
}

async function loadDocument(
  transaction: TenantTransaction,
  context: TenantContext,
  documentId: string,
) {
  const [document] = await transaction
    .select({
      id: documents.id,
      caseId: documents.caseId,
      status: documents.status,
      storageStatus: documents.storageStatus,
      currentVersionNumber: documents.currentVersionNumber,
      deletedAt: documents.deletedAt,
    })
    .from(documents)
    .where(and(eq(documents.tenantId, context.tenantId), eq(documents.id, documentId)))
    .limit(1);

  if (!document) {
    throw new Error("DOCUMENT_NOT_FOUND");
  }

  return document;
}

function assertDocumentWritable(document: { storageStatus: string; deletedAt: Date | null }) {
  if (document.deletedAt || document.storageStatus === "deleted") {
    throw new Error("DOCUMENT_DELETED");
  }

  if (document.storageStatus === "quarantined") {
    throw new Error("DOCUMENT_QUARANTINED");
  }
}

/**
 * Private, versioned document storage bound to the PF-03 metadata model.
 *
 * Every entry point goes through withAuthorizedTenantTransaction, so a request
 * crosses membership, RBAC, dossier grant and RLS before touching a row, and a
 * denial is audited and fails closed.
 */
export function createPrivateDocumentService(
  dependencies: PrivateDocumentServiceDependencies,
) {
  const database = dependencies.database ?? getDatabase();
  const storage = dependencies.storage;
  const secret = dependencies.downloadSigningSecret;
  const now = dependencies.now ?? (() => new Date());

  async function loadDownloadableVersion(
    transaction: TenantTransaction,
    context: TenantContext,
    documentId: string,
    selector: { versionId?: string; versionNumber?: number },
  ) {
    const document = await loadDocument(transaction, context, documentId);

    if (document.deletedAt || document.storageStatus === "deleted") {
      throw new Error("DOCUMENT_DELETED");
    }

    if (document.storageStatus === "quarantined") {
      throw new Error("DOCUMENT_QUARANTINED");
    }

    const filters = [
      eq(documentVersions.tenantId, context.tenantId),
      eq(documentVersions.documentId, documentId),
    ];

    if (selector.versionId) {
      filters.push(eq(documentVersions.id, selector.versionId));
    }

    if (typeof selector.versionNumber === "number") {
      filters.push(eq(documentVersions.versionNumber, selector.versionNumber));
    }

    const [version] = await transaction
      .select()
      .from(documentVersions)
      .where(and(...filters))
      .orderBy(desc(documentVersions.versionNumber))
      .limit(1);

    if (!version) {
      throw new Error("DOCUMENT_VERSION_NOT_FOUND");
    }

    if (version.status === "quarantined" || version.scanStatus === "infected") {
      throw new Error("DOCUMENT_VERSION_QUARANTINED");
    }

    if (version.status !== "available") {
      throw new Error("DOCUMENT_VERSION_NOT_AVAILABLE");
    }

    if (version.scanStatus !== "clean") {
      throw new Error("DOCUMENT_VERSION_AWAITING_VALIDATION");
    }

    return version;
  }

  function toSummary(version: typeof documentVersions.$inferSelect): DocumentVersionSummary {
    return {
      documentId: version.documentId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      mimeType: version.mimeType,
      byteSize: version.byteSize,
      sha256: version.sha256,
      status: version.status,
      scanStatus: version.scanStatus,
      originalFileName: version.originalFileName,
      createdAt: version.createdAt,
    };
  }

  return {
    /**
     * Uploads a new version in three phases so a failed object write can never
     * leave the metadata model claiming a document that is not stored, and a
     * failed metadata write can never be masked by a successful object write.
     */
    async uploadNewVersion(
      context: TenantContext,
      input: UploadDocumentVersionInput,
    ): Promise<DocumentVersionSummary> {
      const validated = validateUploadCandidate({
        fileName: input.fileName,
        declaredMimeType: input.declaredMimeType,
        bytes: input.bytes,
      });
      const versionId = randomUUID();

      const reservation = await withAuthorizedTenantTransaction(
        database,
        context,
        "document.upload",
        { tenantId: context.tenantId, type: "document", id: input.documentId },
        async (transaction) => {
          const document = await loadDocument(transaction, context, input.documentId);
          assertDocumentWritable(document);

          const [{ nextVersionNumber }] = await transaction
            .select({
              nextVersionNumber: sql<number>`coalesce(max(${documentVersions.versionNumber}), 0) + 1`,
            })
            .from(documentVersions)
            .where(
              and(
                eq(documentVersions.tenantId, context.tenantId),
                eq(documentVersions.documentId, input.documentId),
              ),
            );

          const blobKey = buildDocumentVersionBlobKey({
            tenantId: context.tenantId,
            caseId: document.caseId,
            documentId: input.documentId,
            versionId,
          });

          await transaction.insert(documentVersions).values({
            id: versionId,
            tenantId: context.tenantId,
            documentId: input.documentId,
            caseId: document.caseId,
            versionNumber: Number(nextVersionNumber),
            blobKey,
            storageProvider: storage.provider,
            visibility: "private",
            status: "pending",
            scanStatus: "pending",
            originalFileName: validated.originalFileName,
            mimeType: validated.mimeType,
            byteSize: validated.byteSize,
            sha256: validated.sha256,
            uploadedByIdentityId: context.identityId,
          });

          return {
            blobKey,
            caseId: document.caseId,
            versionNumber: Number(nextVersionNumber),
            businessStatus: document.status,
          };
        },
      );

      try {
        await storage.put({
          key: reservation.blobKey,
          bytes: input.bytes,
          contentType: validated.mimeType,
        });
      } catch (error) {
        await withAuthorizedTenantTransaction(
          database,
          context,
          "document.upload",
          { tenantId: context.tenantId, type: "document", id: input.documentId },
          async (transaction) => {
            await transaction
              .update(documentVersions)
              .set({ status: "failed" })
              .where(
                and(
                  eq(documentVersions.tenantId, context.tenantId),
                  eq(documentVersions.id, versionId),
                ),
              );
          },
        );
        throw error;
      }

      return withAuthorizedTenantTransaction(
        database,
        context,
        "document.upload",
        { tenantId: context.tenantId, type: "document", id: input.documentId },
        async (transaction) => {
          const [version] = await transaction
            .update(documentVersions)
            .set({ status: "available", availableAt: now() })
            .where(
              and(
                eq(documentVersions.tenantId, context.tenantId),
                eq(documentVersions.id, versionId),
              ),
            )
            .returning();

          if (!version) {
            throw new Error("DOCUMENT_VERSION_NOT_FOUND");
          }

          await transaction
            .update(documents)
            .set({
              blobPath: reservation.blobKey,
              storageProvider: storage.provider,
              mimeType: validated.mimeType,
              byteSize: validated.byteSize,
              sha256: validated.sha256,
              storageStatus: "available",
              currentVersionNumber: reservation.versionNumber,
              status: reservation.businessStatus === "missing"
                ? "received"
                : reservation.businessStatus,
              updatedAt: now(),
            })
            .where(
              and(
                eq(documents.tenantId, context.tenantId),
                eq(documents.id, input.documentId),
              ),
            );

          await transaction.insert(auditLogs).values({
            ...auditIdentity(context),
            action: "document.version.created",
            entityType: "document_version",
            entityId: version.id,
            summary: "Nouvelle version de justificatif stockée en conteneur privé.",
            metadata: {
              documentId: input.documentId,
              versionNumber: version.versionNumber,
              sha256: version.sha256,
              byteSize: version.byteSize,
              mimeType: version.mimeType,
              storageProvider: storage.provider,
              visibility: "private",
            },
          });

          return toSummary(version);
        },
      );
    },

    listVersions(context: TenantContext, documentId: string) {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "document.download",
        { tenantId: context.tenantId, type: "document", id: documentId },
        async (transaction) => {
          const versions = await transaction
            .select()
            .from(documentVersions)
            .where(
              and(
                eq(documentVersions.tenantId, context.tenantId),
                eq(documentVersions.documentId, documentId),
              ),
            )
            .orderBy(asc(documentVersions.versionNumber));

          return versions.map(toSummary);
        },
      );
    },

    /**
     * Records the antivirus or professional validation outcome. Until a version
     * is explicitly declared clean it stays undownloadable; an infected outcome
     * quarantines both the version and the document.
     */
    recordScanOutcome(
      context: TenantContext,
      input: { documentId: string; versionId: string; outcome: "clean" | "infected"; reason?: string },
    ) {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "document.validate",
        { tenantId: context.tenantId, type: "document", id: input.documentId },
        async (transaction) => {
          const [version] = await transaction
            .update(documentVersions)
            .set({
              scanStatus: input.outcome,
              status: input.outcome === "infected" ? "quarantined" : undefined,
            })
            .where(
              and(
                eq(documentVersions.tenantId, context.tenantId),
                eq(documentVersions.documentId, input.documentId),
                eq(documentVersions.id, input.versionId),
              ),
            )
            .returning();

          if (!version) {
            throw new Error("DOCUMENT_VERSION_NOT_FOUND");
          }

          if (input.outcome === "infected") {
            await transaction
              .update(documents)
              .set({ storageStatus: "quarantined", updatedAt: now() })
              .where(
                and(
                  eq(documents.tenantId, context.tenantId),
                  eq(documents.id, input.documentId),
                ),
              );

            await transaction.insert(auditLogs).values({
              ...auditIdentity(context),
              action: "document.quarantined",
              entityType: "document_version",
              entityId: version.id,
              summary: "Version documentaire mise en quarantaine.",
              metadata: {
                documentId: input.documentId,
                versionNumber: version.versionNumber,
                reason: input.reason ?? "scan_outcome_infected",
              },
            });
          }

          return toSummary(version);
        },
      );
    },

    /** Soft delete only: stored versions and their hashes are preserved. */
    softDeleteDocument(context: TenantContext, documentId: string) {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "dossier.write",
        { tenantId: context.tenantId, type: "document", id: documentId },
        async (transaction) => {
          const [deleted] = await transaction
            .update(documents)
            .set({ storageStatus: "deleted", deletedAt: now(), updatedAt: now() })
            .where(and(eq(documents.tenantId, context.tenantId), eq(documents.id, documentId)))
            .returning({ id: documents.id });

          if (!deleted) {
            return false;
          }

          await transaction.insert(auditLogs).values({
            ...auditIdentity(context),
            action: "document.deleted",
            entityType: "document",
            entityId: deleted.id,
            summary: "Document archivé par suppression logique.",
            metadata: { deletionMode: "soft_delete", versionsPreserved: true },
          });

          return true;
        },
      );
    },

    /**
     * Issues a short-lived signed grant instead of any durable object URL.
     * The grant alone never authorizes a download; it only narrows an already
     * authorized session to one version for a few seconds.
     */
    async authorizeDownload(
      context: TenantContext,
      input: { documentId: string; versionNumber?: number },
    ): Promise<DownloadAuthorization> {
      const version = await withAuthorizedTenantTransaction(
        database,
        context,
        "document.download",
        { tenantId: context.tenantId, type: "document", id: input.documentId },
        async (transaction) => {
          const resolved = await loadDownloadableVersion(transaction, context, input.documentId, {
            versionNumber: input.versionNumber,
          });

          await transaction.insert(auditLogs).values({
            ...auditIdentity(context),
            action: "document.download.authorized",
            entityType: "document_version",
            entityId: resolved.id,
            summary: "Accès temporaire à une version documentaire autorisé.",
            metadata: {
              documentId: input.documentId,
              versionNumber: resolved.versionNumber,
              ttlSeconds: downloadGrantTtlSeconds,
            },
          });

          return resolved;
        },
      );

      const expiresAtMs = now().getTime() + downloadGrantTtlSeconds * 1000;

      return {
        ...toSummary(version),
        token: issueDownloadGrant(secret, {
          tenantId: context.tenantId,
          documentId: input.documentId,
          versionId: version.id,
          identityId: context.identityId,
          expiresAtMs,
        }),
        expiresAt: new Date(expiresAtMs).toISOString(),
      };
    },

    async openDownload(context: TenantContext, token: string): Promise<DownloadPayload> {
      const verification = verifyDownloadGrant(secret, token, now().getTime());

      if (verification.status !== "valid") {
        throw new Error(`DOCUMENT_DOWNLOAD_GRANT_${verification.status.toUpperCase()}`);
      }

      const { payload } = verification;

      if (payload.tenantId !== context.tenantId || payload.identityId !== context.identityId) {
        throw new Error("DOCUMENT_DOWNLOAD_GRANT_SUBJECT_MISMATCH");
      }

      const version = await withAuthorizedTenantTransaction(
        database,
        context,
        "document.download",
        { tenantId: context.tenantId, type: "document", id: payload.documentId },
        async (transaction) => {
          const resolved = await loadDownloadableVersion(transaction, context, payload.documentId, {
            versionId: payload.versionId,
          });

          await transaction.insert(auditLogs).values({
            ...auditIdentity(context),
            action: "document.downloaded",
            entityType: "document_version",
            entityId: resolved.id,
            summary: "Version documentaire téléchargée.",
            metadata: {
              documentId: payload.documentId,
              versionNumber: resolved.versionNumber,
              sha256: resolved.sha256,
              byteSize: resolved.byteSize,
            },
          });

          return resolved;
        },
      );

      assertBlobKeyOwnedByTenant(version.blobKey, context.tenantId);
      const object = await storage.open(version.blobKey);

      if (!object) {
        throw new Error("DOCUMENT_OBJECT_NOT_FOUND");
      }

      return {
        documentId: version.documentId,
        versionId: version.id,
        versionNumber: version.versionNumber,
        originalFileName: version.originalFileName,
        mimeType: version.mimeType,
        byteSize: version.byteSize,
        sha256: version.sha256,
        stream: object.stream,
      };
    },

    /** Attaches one precise version to a simulation trace as supporting evidence. */
    linkVersionToSimulation(
      context: TenantContext,
      input: { simulationRunId: string; documentVersionId: string; purpose?: string },
    ) {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "report.generate",
        { tenantId: context.tenantId, type: "simulation", id: input.simulationRunId },
        async (transaction) => {
          const [run] = await transaction
            .select({ id: simulationRuns.id })
            .from(simulationRuns)
            .where(
              and(
                eq(simulationRuns.tenantId, context.tenantId),
                eq(simulationRuns.id, input.simulationRunId),
              ),
            )
            .limit(1);

          if (!run) {
            throw new Error("SIMULATION_RUN_NOT_FOUND");
          }

          const [version] = await transaction
            .select({ id: documentVersions.id, versionNumber: documentVersions.versionNumber })
            .from(documentVersions)
            .where(
              and(
                eq(documentVersions.tenantId, context.tenantId),
                eq(documentVersions.id, input.documentVersionId),
              ),
            )
            .limit(1);

          if (!version) {
            throw new Error("DOCUMENT_VERSION_NOT_FOUND");
          }

          await transaction
            .insert(simulationDocumentVersions)
            .values({
              tenantId: context.tenantId,
              simulationRunId: input.simulationRunId,
              documentVersionId: input.documentVersionId,
              purpose: input.purpose ?? "supporting-evidence",
            })
            .onConflictDoNothing();

          await transaction.insert(auditLogs).values({
            ...auditIdentity(context),
            action: "document.evidence.linked",
            entityType: "simulation",
            entityId: input.simulationRunId,
            summary: "Version documentaire rattachée à une trace de simulation.",
            metadata: {
              documentVersionId: input.documentVersionId,
              versionNumber: version.versionNumber,
            },
          });

          return true;
        },
      );
    },

    listSimulationEvidence(
      context: TenantContext,
      simulationRunId: string,
    ): Promise<readonly DocumentEvidenceReference[]> {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "dossier.read",
        { tenantId: context.tenantId, type: "simulation", id: simulationRunId },
        async (transaction) => {
          const rows = await transaction
            .select({
              documentId: documentVersions.documentId,
              versionId: documentVersions.id,
              versionNumber: documentVersions.versionNumber,
              sha256: documentVersions.sha256,
              byteSize: documentVersions.byteSize,
              mimeType: documentVersions.mimeType,
              purpose: simulationDocumentVersions.purpose,
              capturedAt: simulationDocumentVersions.createdAt,
            })
            .from(simulationDocumentVersions)
            .innerJoin(
              documentVersions,
              and(
                eq(simulationDocumentVersions.tenantId, documentVersions.tenantId),
                eq(simulationDocumentVersions.documentVersionId, documentVersions.id),
              ),
            )
            .where(
              and(
                eq(simulationDocumentVersions.tenantId, context.tenantId),
                eq(simulationDocumentVersions.simulationRunId, simulationRunId),
              ),
            )
            .orderBy(asc(documentVersions.versionNumber));

          return rows;
        },
      );
    },
  };
}

export { privateDocumentStorageProvider };
