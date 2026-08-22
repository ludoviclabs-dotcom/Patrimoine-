import postgres from "postgres";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { assertSafeClerkWebhookRole, type DatabaseWebhookRole } from "../db/managed-readiness";
import type { ClerkWebhookRecord } from "./clerk-webhook";

let cachedWebhookDatabase: ReturnType<typeof drizzle> | null = null;
let cachedWebhookConnectionUrl: string | null = null;

function getWebhookDatabase() {
  const connectionUrl = process.env.CLERK_WEBHOOK_DATABASE_URL;
  if (!connectionUrl) throw new Error("CLERK_WEBHOOK_DATABASE_URL_REQUIRED");
  if (!cachedWebhookDatabase || cachedWebhookConnectionUrl !== connectionUrl) {
    cachedWebhookDatabase = drizzle(postgres(connectionUrl, { prepare: false }));
    cachedWebhookConnectionUrl = connectionUrl;
  }
  return cachedWebhookDatabase;
}

/**
 * Reads the privileges of the login actually connected, so an over-privileged
 * webhook credential fails closed instead of silently working.
 */
export const clerkWebhookRoleQuery = sql`
  select
    current_user as "roleName",
    pg_role.rolsuper as "isSuperuser",
    pg_role.rolbypassrls as "bypassesRls",
    pg_has_role(current_user, 'patrimoine_webhook_service', 'member') as "canAssumeWebhookRole",
    pg_has_role(current_user, 'patrimoine_app', 'member') as "canAssumeApplicationRole",
    exists (
      select 1
      from pg_catalog.pg_class as relation
      cross join lateral pg_catalog.aclexplode(
        coalesce(relation.relacl, pg_catalog.acldefault('r', relation.relowner))
      ) as privilege
      where relation.relnamespace = 'public'::regnamespace
        and relation.relkind in ('r', 'p')
        and privilege.grantee = pg_role.oid
    ) as "hasDirectTablePrivileges",
    exists (
      select 1
      from pg_catalog.pg_class as relation
      where relation.relnamespace = 'public'::regnamespace
        and relation.relkind in ('r', 'p')
        and relation.relowner = pg_role.oid
    ) as "ownsTables"
  from pg_catalog.pg_roles as pg_role
  where pg_role.rolname = current_user
`;

export async function recordSignedClerkWebhook(record: ClerkWebhookRecord) {
  const database = getWebhookDatabase();
  return database.transaction(async (transaction) => {
    const [role] = await transaction.execute<DatabaseWebhookRole>(clerkWebhookRoleQuery);
    if (!role) throw new Error("CLERK_WEBHOOK_DATABASE_ROLE_UNSAFE");
    assertSafeClerkWebhookRole(role);

    await transaction.execute(sql.raw("set local role patrimoine_webhook_service"));
    const [result] = await transaction.execute<{ processed: boolean }>(sql`
      select app_security.record_clerk_webhook_event(
        ${record.eventId}, ${record.eventType}, ${record.payloadSha256},
        ${record.userId}, ${record.email}, ${record.displayName},
        ${record.organizationId}, ${record.organizationSlug}, ${record.organizationName},
        ${record.membershipStatus}, ${record.membershipRole}
      ) as "processed"
    `);
    return result?.processed === true;
  });
}
