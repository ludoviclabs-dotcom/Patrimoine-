import { and, eq, sql } from "drizzle-orm";
import type { getDatabase } from "./client";
import { memberships } from "./schema";
import type { TenantContext } from "../tenancy/tenant-context";

type Database = ReturnType<typeof getDatabase>;
export type TenantTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Opens the only application transaction shape allowed for tenant-owned data.
 * The application login has no direct table grants; it must assume the fixed
 * patrimoine_app role and establish transaction-local, server-derived context.
 */
export function withTenantTransaction<T>(
  database: Database,
  context: TenantContext,
  operation: (transaction: TenantTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql.raw("set local role patrimoine_app"));
    await transaction.execute(
      sql`select set_config('app.tenant_id', ${context.tenantId}, true)`,
    );
    await transaction.execute(
      sql`select set_config('app.user_id', ${context.identityId}, true)`,
    );
    await transaction.execute(
      sql`select set_config('app.role', ${context.role}, true)`,
    );

    const [membership] = await transaction
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, context.tenantId),
          eq(memberships.userIdentityId, context.identityId),
          eq(memberships.role, context.role),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new Error("TENANT_MEMBERSHIP_REQUIRED");
    }

    return operation(transaction);
  });
}
