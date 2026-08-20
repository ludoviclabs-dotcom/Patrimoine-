import postgres from "postgres";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { ClerkWebhookRecord } from "./clerk-webhook";

let cachedWebhookDatabase: ReturnType<typeof drizzle> | null = null;

function getWebhookDatabase() {
  const connectionUrl = process.env.CLERK_WEBHOOK_DATABASE_URL;
  if (!connectionUrl) throw new Error("CLERK_WEBHOOK_DATABASE_URL_REQUIRED");
  if (!cachedWebhookDatabase) {
    cachedWebhookDatabase = drizzle(postgres(connectionUrl, { prepare: false }));
  }
  return cachedWebhookDatabase;
}

export async function recordSignedClerkWebhook(record: ClerkWebhookRecord) {
  const database = getWebhookDatabase();
  return database.transaction(async (transaction) => {
    const [role] = await transaction.execute<{
      roleName: string;
      isSuperuser: boolean;
      bypassesRls: boolean;
      canAssumeWebhookRole: boolean;
    }>(sql`
      select current_user as "roleName", role.rolsuper as "isSuperuser",
        role.rolbypassrls as "bypassesRls",
        pg_has_role(current_user, 'patrimoine_webhook_service', 'member') as "canAssumeWebhookRole"
      from pg_roles as role where role.rolname = current_user
    `);
    if (!role || role.isSuperuser || role.bypassesRls || !role.canAssumeWebhookRole
      || role.roleName === "patrimoine_webhook_service") {
      throw new Error("CLERK_WEBHOOK_DATABASE_ROLE_UNSAFE");
    }

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
