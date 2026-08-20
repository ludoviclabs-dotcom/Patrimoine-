import { and, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { auditLogs, memberships } from "../db/schema";
import type { TenantContext, TenantContextRole } from "../tenancy/tenant-context";
import { withAuthorizedTenantTransaction } from "./authorization";

type Database = ReturnType<typeof getDatabase>;

/** Server-only membership mutations. Clerk observations never call these. */
export function createMembershipService(database: Database = getDatabase()) {
  return {
    invite(context: TenantContext, identityId: string, role: TenantContextRole) {
      return withAuthorizedTenantTransaction(database, context, "member.invite", {
          tenantId: context.tenantId, type: "member", id: identityId,
        }, async (transaction) => {
        const [membership] = await transaction.insert(memberships).values({
          tenantId: context.tenantId, userIdentityId: identityId, role, status: "invited",
        }).returning({ id: memberships.id });
        await transaction.insert(auditLogs).values({
          tenantId: context.tenantId, actorIdentityId: context.identityId,
          action: "member.invited", entityType: "membership", entityId: membership.id,
          summary: "Invitation de membership créée.", correlationId: context.correlationId,
          metadata: { invitedRole: role },
        });
        return membership;
      });
    },

    changeRole(context: TenantContext, membershipId: string, role: TenantContextRole) {
      return withAuthorizedTenantTransaction(database, context, "admin.manage", {
          tenantId: context.tenantId, type: "member", id: membershipId,
        }, async (transaction) => {
        const [membership] = await transaction.update(memberships).set({ role, updatedAt: new Date() })
          .where(and(eq(memberships.tenantId, context.tenantId), eq(memberships.id, membershipId)))
          .returning({ id: memberships.id });
        if (membership) await transaction.insert(auditLogs).values({
          tenantId: context.tenantId, actorIdentityId: context.identityId,
          action: "member.role.changed", entityType: "membership", entityId: membership.id,
          summary: "Rôle de membership modifié.", correlationId: context.correlationId,
          metadata: { role },
        });
        return membership ?? null;
      });
    },

    revoke(context: TenantContext, membershipId: string) {
      return withAuthorizedTenantTransaction(database, context, "admin.manage", {
          tenantId: context.tenantId, type: "member", id: membershipId,
        }, async (transaction) => {
        const [membership] = await transaction.update(memberships).set({
          status: "disabled", revokedAt: new Date(), updatedAt: new Date(),
        }).where(and(eq(memberships.tenantId, context.tenantId), eq(memberships.id, membershipId)))
          .returning({ id: memberships.id });
        if (membership) await transaction.insert(auditLogs).values({
          tenantId: context.tenantId, actorIdentityId: context.identityId,
          action: "membership.changed", entityType: "membership", entityId: membership.id,
          summary: "Membership révoquée.", correlationId: context.correlationId,
          metadata: { status: "disabled" },
        });
        return membership ?? null;
      });
    },
  };
}
