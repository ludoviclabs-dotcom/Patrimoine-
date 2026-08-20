import { auditLogs } from "../db/schema";
import { withTenantTransaction, type TenantTransaction } from "../db/tenant-transaction";
import type { getDatabase } from "../db/client";
import type { TenantContext, TenantContextRole } from "../tenancy/tenant-context";

export const tenantActions = [
  "dossier.read",
  "dossier.write",
  "simulation.run",
  "simulation.review",
  "report.generate",
  "report.validate",
  "document.upload",
  "document.download",
  "member.invite",
  "rule.review",
  "admin.manage",
  "audit.read",
] as const;

export type TenantAction = (typeof tenantActions)[number];
export type AuthorizationResource = Readonly<{
  tenantId: string;
  type: "dossier" | "document" | "simulation" | "report" | "member" | "rule" | "tenant";
  id?: string;
}>;

const capabilityMatrix: Readonly<Record<TenantContextRole, readonly TenantAction[]>> = {
  admin: tenantActions,
  conseiller: [
    "dossier.read", "dossier.write", "simulation.run", "report.generate",
    "document.upload", "document.download", "audit.read",
  ],
  expert: [
    "dossier.read", "simulation.review", "report.generate", "report.validate",
    "document.download", "rule.review", "audit.read",
  ],
  client: ["dossier.read", "document.upload", "document.download"],
  // AUDITOR is retained because it already exists in the database role enum.
  auditeur: ["dossier.read", "document.download", "audit.read"],
};

export function can(
  actor: Pick<TenantContext, "tenantId" | "role">,
  action: TenantAction,
  resource: AuthorizationResource,
) {
  return actor.tenantId === resource.tenantId
    && capabilityMatrix[actor.role].includes(action);
}

/**
 * Enforces the central capability policy inside the active RLS transaction.
 * A denial is appended before the transaction is aborted, without request
 * payloads, tokens or secrets.
 */
type Database = ReturnType<typeof getDatabase>;

export async function withAuthorizedTenantTransaction<T>(
  database: Database,
  context: TenantContext,
  action: TenantAction,
  resource: AuthorizationResource,
  operation: (transaction: TenantTransaction) => Promise<T>,
) {
  if (can(context, action, resource)) {
    return withTenantTransaction(database, context, operation);
  }

  await withTenantTransaction(database, context, async (transaction) => {
    await transaction.insert(auditLogs).values({
      tenantId: context.tenantId,
      actorIdentityId: context.identityId,
      action: "authorization.denied",
      entityType: resource.type,
      entityId: resource.id ?? "tenant-scope",
      summary: "Autorisation refusée par la matrice RBAC.",
      correlationId: context.correlationId,
      metadata: { action, role: context.role },
    });
  });
  throw new Error("TENANT_AUTHORIZATION_DENIED");
}

export function listCapabilities(role: TenantContextRole) {
  return capabilityMatrix[role];
}
