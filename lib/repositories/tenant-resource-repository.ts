import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { withTenantTransaction } from "../db/tenant-transaction";
import {
  auditLogs,
  clientCases,
  documents,
  simulationRuns,
} from "../db/schema";
import type { TenantContext } from "../tenancy/tenant-context";

type Database = ReturnType<typeof getDatabase>;

function auditIdentity(context: TenantContext) {
  return {
    tenantId: context.tenantId,
    actorIdentityId: context.identityId,
    correlationId: context.correlationId,
  } as const;
}

export function createTenantResourceRepository(
  database: Database = getDatabase(),
) {
  return {
    findDossier(context: TenantContext, dossierId: string) {
      return withTenantTransaction(database, context, async (transaction) => {
        const [dossier] = await transaction
          .select({
            id: clientCases.id,
            tenantId: clientCases.tenantId,
            reference: clientCases.reference,
            title: clientCases.title,
            status: clientCases.status,
          })
          .from(clientCases)
          .where(
            and(
              eq(clientCases.tenantId, context.tenantId),
              eq(clientCases.id, dossierId),
            ),
          )
          .limit(1);

        return dossier ?? null;
      });
    },

    updateDossierTitle(
      context: TenantContext,
      dossierId: string,
      title: string,
    ) {
      return withTenantTransaction(database, context, async (transaction) => {
        const [updated] = await transaction
          .update(clientCases)
          .set({ title, updatedAt: new Date() })
          .where(
            and(
              eq(clientCases.tenantId, context.tenantId),
              eq(clientCases.id, dossierId),
            ),
          )
          .returning({ id: clientCases.id });

        if (!updated) {
          return false;
        }

        await transaction.insert(auditLogs).values({
          ...auditIdentity(context),
          action: "case.updated",
          entityType: "dossier",
          entityId: updated.id,
          summary: "Titre du dossier mis à jour.",
          metadata: { changedField: "title" },
        });

        return true;
      });
    },

    deleteDossier(context: TenantContext, dossierId: string) {
      return withTenantTransaction(database, context, async (transaction) => {
        const [deleted] = await transaction
          .update(clientCases)
          .set({
            status: "archived",
            archivedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(clientCases.tenantId, context.tenantId),
              eq(clientCases.id, dossierId),
            ),
          )
          .returning({ id: clientCases.id });

        if (!deleted) {
          return false;
        }

        await transaction.insert(auditLogs).values({
          ...auditIdentity(context),
          action: "case.deleted",
          entityType: "dossier",
          entityId: deleted.id,
          summary: "Dossier archivé par suppression logique.",
          metadata: { deletionMode: "soft_delete" },
        });

        return true;
      });
    },

    findDocumentMetadata(context: TenantContext, documentId: string) {
      return withTenantTransaction(database, context, async (transaction) => {
        const [document] = await transaction
          .select({
            id: documents.id,
            tenantId: documents.tenantId,
            caseId: documents.caseId,
            label: documents.label,
            status: documents.status,
            mimeType: documents.mimeType,
            byteSize: documents.byteSize,
            sha256: documents.sha256,
          })
          .from(documents)
          .where(
            and(
              eq(documents.tenantId, context.tenantId),
              eq(documents.id, documentId),
            ),
          )
          .limit(1);

        if (!document) {
          return null;
        }

        await transaction.insert(auditLogs).values({
          ...auditIdentity(context),
          action: "document.metadata.read",
          entityType: "document",
          entityId: document.id,
          summary: "Métadonnée documentaire consultée.",
          metadata: { scope: "metadata_only" },
        });

        return document;
      });
    },

    findSimulationRun(context: TenantContext, runId: string) {
      return withTenantTransaction(database, context, async (transaction) => {
        const [run] = await transaction
          .select({
            id: simulationRuns.id,
            tenantId: simulationRuns.tenantId,
            caseId: simulationRuns.caseId,
            status: simulationRuns.status,
          })
          .from(simulationRuns)
          .where(
            and(
              eq(simulationRuns.tenantId, context.tenantId),
              eq(simulationRuns.id, runId),
            ),
          )
          .limit(1);

        return run ?? null;
      });
    },

    listAuditLogs(context: TenantContext) {
      return withTenantTransaction(database, context, (transaction) =>
        transaction
          .select({
            id: auditLogs.id,
            tenantId: auditLogs.tenantId,
            actorIdentityId: auditLogs.actorIdentityId,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            entityId: auditLogs.entityId,
            correlationId: auditLogs.correlationId,
            requestId: auditLogs.requestId,
            metadata: auditLogs.metadata,
            createdAt: auditLogs.createdAt,
          })
          .from(auditLogs)
          .where(eq(auditLogs.tenantId, context.tenantId))
          .orderBy(desc(auditLogs.createdAt)),
      );
    },
  };
}
