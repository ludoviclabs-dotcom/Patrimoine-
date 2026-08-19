import { auth } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { withApplicationRoleTransaction } from "../db/tenant-transaction";
import {
  createInternalTenantContext,
  type TenantContext,
  type TenantContextRole,
} from "../tenancy/tenant-context";

export type ClerkSessionIdentity = Readonly<{
  userId: string | null;
  orgId: string | null;
}>;

type ClerkContextRow = Readonly<{
  tenantId: string;
  identityId: string;
  role: TenantContextRole;
}>;

const tenantRoles = new Set<TenantContextRole>([
  "admin",
  "conseiller",
  "expert",
  "client",
  "auditeur",
]);

export function createClerkTenantContext(
  session: ClerkSessionIdentity,
  resolved: readonly ClerkContextRow[],
): TenantContext {
  if (!session.userId) throw new Error("CLERK_SESSION_REQUIRED");
  if (!session.orgId) throw new Error("CLERK_ORGANIZATION_REQUIRED");
  if (resolved.length !== 1 || !tenantRoles.has(resolved[0].role)) {
    throw new Error("CLERK_TENANT_CONTEXT_DENIED");
  }

  return createInternalTenantContext({
    tenantId: resolved[0].tenantId,
    identityId: resolved[0].identityId,
    role: resolved[0].role,
    source: "clerk-session",
  });
}

/**
 * Resolves a Clerk server session to the only context repositories accept.
 * The Clerk organization is an input to a DB security-definer resolver, never
 * a tenant authority by itself.
 */
export async function requireClerkTenantContext(): Promise<TenantContext> {
  const session = await auth();
  if (!session.userId || !session.orgId) {
    return createClerkTenantContext({ userId: session.userId ?? null, orgId: session.orgId ?? null }, []);
  }

  const database = getDatabase();
  const resolved = await withApplicationRoleTransaction(database, async (transaction) => {
    return transaction.execute<ClerkContextRow>(sql`
      select
        tenant_id as "tenantId",
        identity_id as "identityId",
        role
      from app_security.resolve_clerk_context(${session.userId}, ${session.orgId})
    `);
  });

  return createClerkTenantContext(
    { userId: session.userId ?? null, orgId: session.orgId ?? null },
    resolved,
  );
}
