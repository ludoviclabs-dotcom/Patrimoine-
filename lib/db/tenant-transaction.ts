import { and, eq, sql } from "drizzle-orm";
import type { getDatabase } from "./client";
import { memberships } from "./schema";
import { assertSafeDatabaseRuntimeRole } from "./managed-readiness";
import type { TenantContext } from "../tenancy/tenant-context";

type Database = ReturnType<typeof getDatabase>;
export type TenantTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function assumeApplicationRole(transaction: TenantTransaction) {
  const [runtimeRole] = await transaction.execute<{
    roleName: string;
    isSuperuser: boolean;
    bypassesRls: boolean;
    canAssumeApplicationRole: boolean;
    hasDirectTablePrivileges: boolean;
  }>(sql`
    select
      current_user as "roleName",
      role.rolsuper as "isSuperuser",
      role.rolbypassrls as "bypassesRls",
      pg_has_role(current_user, 'patrimoine_app', 'member') as "canAssumeApplicationRole",
      exists (
        select 1
        from pg_catalog.pg_class as relation
        cross join lateral pg_catalog.aclexplode(
          coalesce(relation.relacl, pg_catalog.acldefault('r', relation.relowner))
        ) as privilege
        where relation.relnamespace = 'public'::regnamespace
          and relation.relkind in ('r', 'p')
          and privilege.grantee = role.oid
      ) as "hasDirectTablePrivileges"
    from pg_roles as role
    where role.rolname = current_user
  `);

  if (!runtimeRole) throw new Error("DATABASE_RUNTIME_ROLE_UNSAFE");
  assertSafeDatabaseRuntimeRole(runtimeRole);
  await transaction.execute(sql.raw("set local role patrimoine_app"));
}

/** Opens a checked runtime transaction before a tenant context is known. */
export function withApplicationRoleTransaction<T>(
  database: Database,
  operation: (transaction: TenantTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => {
    await assumeApplicationRole(transaction);
    return operation(transaction);
  });
}

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
  return withApplicationRoleTransaction(database, async (transaction) => {
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
