import { createHmac, createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * PF-07 — Clerk webhook persistence on a dedicated, minimally privileged login.
 *
 * PF-06C4 proved the signature layer but left the persistence leg BLOCKED:
 * CLERK_WEBHOOK_DATABASE_URL was never provisioned, so no signed delivery had
 * ever reached `app_security.record_clerk_webhook_event`.
 *
 * This suite closes that gap against a real cluster and through the real route
 * handler, so the chain proven here is the one that runs in production:
 *
 *   valid signature   → receipt persisted → provider observations persisted
 *   same delivery id  → idempotent replay, no second receipt
 *   tampered payload  → DENY, nothing written
 *   unsigned request  → DENY, nothing written
 *
 * It also pins the privilege boundary the task forbids widening: no SUPERUSER,
 * no BYPASSRLS, no table ownership, no direct table privilege, and no ability
 * to assume the application runtime role.
 */

const testDatabaseName = "pf07_clerk_webhook";
const webhookLogin = "pf07_webhook_login";
const webhookPassword = "pf07-webhook-password";
// Standard Webhooks secret: `whsec_` + base64 key material.
const signingSecret = `whsec_${Buffer.from("pf07-clerk-webhook-signing-key-000").toString("base64")}`;

type SqlClient = ReturnType<typeof postgres>;
let admin: SqlClient;
let webhookSql: SqlClient;
let webhookDatabaseUrl: string;

// Imported lazily: the route module resolves its connection from the
// environment, which only exists once the ephemeral cluster is up.
type WebhookRoute = typeof import("../../app/api/webhooks/clerk/route");
let route: WebhookRoute;
let NextRequest: typeof import("next/server").NextRequest;

async function applyMigrations(client: SqlClient) {
  const migrationDirectory = join(process.cwd(), "drizzle");
  const migrations = readdirSync(migrationDirectory)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort();

  for (const migration of migrations) {
    await client.unsafe(readFileSync(join(migrationDirectory, migration), "utf8"));
  }
}

function signedHeaders(deliveryId: string, payload: string, timestampSeconds: number) {
  const key = Buffer.from(signingSecret.replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", key)
    .update(`${deliveryId}.${timestampSeconds}.${payload}`)
    .digest("base64");

  return {
    "svix-id": deliveryId,
    "svix-timestamp": String(timestampSeconds),
    "svix-signature": `v1,${signature}`,
    "content-type": "application/json",
  };
}

function membershipEvent(overrides: {
  organizationId: string;
  userId: string;
  role?: string;
}) {
  return {
    type: "organizationMembership.created",
    object: "event",
    data: {
      id: `orgmem_${randomUUID().slice(0, 8)}`,
      organization: { id: overrides.organizationId, slug: "cabinet-a", name: "CABINET_A" },
      public_user_data: { user_id: overrides.userId },
      role: overrides.role ?? "org:member",
    },
  };
}

function postWebhook(payload: unknown, headers: Record<string, string>) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  return route.POST(
    new NextRequest("http://localhost/api/webhooks/clerk", {
      method: "POST",
      headers,
      body,
    }),
  );
}

async function receiptCount(eventId: string) {
  const [row] = await admin<{ total: number }[]>`
    select count(*)::int as total
    from auth_webhook_events
    where provider = 'clerk' and event_id = ${eventId}
  `;
  return row?.total ?? 0;
}

beforeAll(async () => {
  const rootUrl = process.env.PF03_TEST_DATABASE_URL;
  if (!rootUrl) throw new Error("PF03_TEST_DATABASE_URL_REQUIRED");

  const root = postgres(rootUrl, { max: 1, prepare: false, onnotice: () => {} });
  await root.unsafe(`CREATE DATABASE ${testDatabaseName}`);
  await root.end();

  const url = new URL(rootUrl);
  url.pathname = `/${testDatabaseName}`;
  admin = postgres(url.toString(), { max: 1, prepare: false, onnotice: () => {} });
  await applyMigrations(admin);

  // The webhook login owns nothing and holds no direct table grant: its only
  // reachable privilege is EXECUTE on the SECURITY DEFINER function, inherited
  // by explicitly assuming patrimoine_webhook_service.
  await admin.unsafe(`
    CREATE ROLE ${webhookLogin}
      LOGIN PASSWORD '${webhookPassword}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    GRANT patrimoine_webhook_service TO ${webhookLogin};
  `);

  const webhookUrl = new URL(url.toString());
  webhookUrl.username = webhookLogin;
  webhookUrl.password = webhookPassword;
  webhookDatabaseUrl = webhookUrl.toString();
  webhookSql = postgres(webhookDatabaseUrl, { max: 1, prepare: false, onnotice: () => {} });

  process.env.CLERK_WEBHOOK_DATABASE_URL = webhookDatabaseUrl;
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = signingSecret;
  ({ NextRequest } = await import("next/server"));
  route = await import("../../app/api/webhooks/clerk/route");
}, 180_000);

afterAll(async () => {
  await webhookSql?.end();
  await admin?.end();
});

describe("PF-07 — Clerk webhook login privilege boundary", () => {
  it("is not superuser, does not bypass RLS and cannot assume the application role", async () => {
    const [role] = await webhookSql<{
      roleName: string;
      isSuperuser: boolean;
      bypassesRls: boolean;
      canAssumeWebhookRole: boolean;
      canAssumeApplicationRole: boolean;
    }[]>`
      select
        current_user as "roleName",
        rolsuper as "isSuperuser",
        rolbypassrls as "bypassesRls",
        pg_has_role(current_user, 'patrimoine_webhook_service', 'member') as "canAssumeWebhookRole",
        pg_has_role(current_user, 'patrimoine_app', 'member') as "canAssumeApplicationRole"
      from pg_catalog.pg_roles where rolname = current_user
    `;

    expect(role.roleName).toBe(webhookLogin);
    expect(role.isSuperuser).toBe(false);
    expect(role.bypassesRls).toBe(false);
    expect(role.canAssumeWebhookRole).toBe(true);
    expect(role.canAssumeApplicationRole).toBe(false);
  });

  it("owns no table and holds no direct table privilege", async () => {
    const [ownership] = await webhookSql<{ owned: number; granted: number }[]>`
      select
        (
          select count(*)::int from pg_catalog.pg_class
          where relnamespace = 'public'::regnamespace and relkind in ('r', 'p')
            and relowner = (select oid from pg_catalog.pg_roles where rolname = current_user)
        ) as owned,
        (
          select count(*)::int
          from pg_catalog.pg_class as relation
          cross join lateral pg_catalog.aclexplode(
            coalesce(relation.relacl, pg_catalog.acldefault('r', relation.relowner))
          ) as privilege
          where relation.relnamespace = 'public'::regnamespace
            and relation.relkind in ('r', 'p')
            and privilege.grantee = (select oid from pg_catalog.pg_roles where rolname = current_user)
        ) as granted
    `;

    expect(ownership.owned).toBe(0);
    expect(ownership.granted).toBe(0);
  });

  it("cannot read tenant data even after assuming the webhook service role", async () => {
    await expect(
      webhookSql.begin(async (transaction) => {
        await transaction.unsafe("set local role patrimoine_webhook_service");
        return transaction`select count(*) from tenants`;
      }),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("PF-07 — signed delivery persistence", () => {
  it("persists the receipt and the provider observations for a valid signature", async () => {
    const deliveryId = `msg_${randomUUID()}`;
    const organizationId = `org_${randomUUID().slice(0, 8)}`;
    const userId = `user_${randomUUID().slice(0, 8)}`;
    const event = membershipEvent({ organizationId, userId });
    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await postWebhook(payload, signedHeaders(deliveryId, payload, timestamp));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, processed: true });

    const [receipt] = await admin<{ eventType: string; payloadSha256: string }[]>`
      select event_type as "eventType", payload_sha256 as "payloadSha256"
      from auth_webhook_events where provider = 'clerk' and event_id = ${deliveryId}
    `;
    expect(receipt.eventType).toBe("organizationMembership.created");
    // Only a fingerprint is retained; the payload itself is never stored.
    expect(receipt.payloadSha256).toMatch(/^[0-9a-f]{64}$/);

    const [membership] = await admin<{ observedStatus: string; providerRole: string }[]>`
      select observed_status as "observedStatus", provider_role as "providerRole"
      from auth_provider_memberships
      where provider = 'clerk' and provider_organization_id = ${organizationId}
        and provider_subject = ${userId}
    `;
    expect(membership.observedStatus).toBe("active");
    expect(membership.providerRole).toBe("org:member");

    const [organization] = await admin<{ observedStatus: string; tenantId: string | null }[]>`
      select observed_status as "observedStatus", tenant_id as "tenantId"
      from auth_provider_organizations
      where provider = 'clerk' and provider_organization_id = ${organizationId}
    `;
    expect(organization.observedStatus).toBe("active");
    // PF-04A invariant: an observation is never an authoritative tenant link.
    expect(organization.tenantId).toBeNull();
  });

  it("never creates an authoritative internal membership", async () => {
    const [row] = await admin<{ total: number }[]>`select count(*)::int as total from memberships`;
    expect(row.total).toBe(0);
  });

  it("is idempotent on replay of the same Svix delivery id", async () => {
    const deliveryId = `msg_${randomUUID()}`;
    const event = membershipEvent({
      organizationId: `org_${randomUUID().slice(0, 8)}`,
      userId: `user_${randomUUID().slice(0, 8)}`,
    });
    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = signedHeaders(deliveryId, payload, timestamp);

    const first = await postWebhook(payload, headers);
    await expect(first.json()).resolves.toEqual({ received: true, processed: true });

    const replay = await postWebhook(payload, headers);
    expect(replay.status).toBe(200);
    // Same delivery id → recorded once, reported as already processed.
    await expect(replay.json()).resolves.toEqual({ received: true, processed: false });
    expect(await receiptCount(deliveryId)).toBe(1);
  });
});

describe("PF-07 — signature denial", () => {
  it("refuses a tampered payload and writes nothing", async () => {
    const deliveryId = `msg_${randomUUID()}`;
    const organizationId = `org_${randomUUID().slice(0, 8)}`;
    const payload = JSON.stringify(membershipEvent({
      organizationId,
      userId: `user_${randomUUID().slice(0, 8)}`,
    }));
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = signedHeaders(deliveryId, payload, timestamp);

    // Signature computed over the original payload, body swapped afterwards.
    const tampered = JSON.stringify(membershipEvent({
      organizationId,
      userId: `user_${randomUUID().slice(0, 8)}`,
      role: "org:admin",
    }));

    const response = await postWebhook(tampered, headers);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_webhook" });
    expect(await receiptCount(deliveryId)).toBe(0);
  });

  it("refuses an unsigned request and writes nothing", async () => {
    const deliveryId = `msg_${randomUUID()}`;
    const payload = JSON.stringify(membershipEvent({
      organizationId: `org_${randomUUID().slice(0, 8)}`,
      userId: `user_${randomUUID().slice(0, 8)}`,
    }));

    const response = await postWebhook(payload, {
      "content-type": "application/json",
      "svix-id": deliveryId,
    });
    expect(response.status).toBe(400);
    expect(await receiptCount(deliveryId)).toBe(0);
  });

  it("refuses a signature produced with another secret", async () => {
    const deliveryId = `msg_${randomUUID()}`;
    const payload = JSON.stringify(membershipEvent({
      organizationId: `org_${randomUUID().slice(0, 8)}`,
      userId: `user_${randomUUID().slice(0, 8)}`,
    }));
    const timestamp = Math.floor(Date.now() / 1000);
    const foreignKey = Buffer.from("pf07-attacker-key-0000000000000000", "utf8");
    const forged = createHmac("sha256", foreignKey)
      .update(`${deliveryId}.${timestamp}.${payload}`)
      .digest("base64");

    const response = await postWebhook(payload, {
      "content-type": "application/json",
      "svix-id": deliveryId,
      "svix-timestamp": String(timestamp),
      "svix-signature": `v1,${forged}`,
    });

    expect(response.status).toBe(400);
    expect(await receiptCount(deliveryId)).toBe(0);
  });

  it("ignores a signed event type outside the synchronization contract", async () => {
    const deliveryId = `msg_${randomUUID()}`;
    const payload = JSON.stringify({ type: "session.created", object: "event", data: { id: "sess_1" } });
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await postWebhook(payload, signedHeaders(deliveryId, payload, timestamp));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ received: true, ignored: true });
    expect(await receiptCount(deliveryId)).toBe(0);
  });

  it("fingerprints the payload rather than storing it", async () => {
    const deliveryId = `msg_${randomUUID()}`;
    const event = membershipEvent({
      organizationId: `org_${randomUUID().slice(0, 8)}`,
      userId: `user_${randomUUID().slice(0, 8)}`,
    });
    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);

    await postWebhook(payload, signedHeaders(deliveryId, payload, timestamp));

    const [receipt] = await admin<{ payloadSha256: string }[]>`
      select payload_sha256 as "payloadSha256"
      from auth_webhook_events where provider = 'clerk' and event_id = ${deliveryId}
    `;
    // The route re-serialises the verified envelope; the fingerprint must be a
    // digest of that envelope and never the envelope itself.
    expect(receipt.payloadSha256).toHaveLength(64);
    expect(receipt.payloadSha256).not.toContain("org_");
    expect(receipt.payloadSha256).toBe(
      createHash("sha256").update(JSON.stringify({
        type: event.type,
        object: "event",
        data: event.data,
        event_attributes: undefined,
      })).digest("hex"),
    );
  });
});
