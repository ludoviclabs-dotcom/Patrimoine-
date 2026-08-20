import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClerkTenantContext } from "../../lib/auth/clerk-tenant-context";
import { toClerkWebhookRecord } from "../../lib/auth/clerk-webhook";

const root = process.cwd();

describe("PF-04A Clerk authentication boundary", () => {
  it("fails closed without a session, organization, internal identity or active DB membership", () => {
    expect(() => createClerkTenantContext({ userId: null, orgId: "org_a" }, [])).toThrow("CLERK_SESSION_REQUIRED");
    expect(() => createClerkTenantContext({ userId: "user_a", orgId: null }, [])).toThrow("CLERK_ORGANIZATION_REQUIRED");
    expect(() => createClerkTenantContext({ userId: "unknown", orgId: "org_a" }, [])).toThrow("CLERK_TENANT_CONTEXT_DENIED");
    expect(() => createClerkTenantContext({ userId: "user_a", orgId: "org_wrong" }, [])).toThrow("CLERK_TENANT_CONTEXT_DENIED");
    expect(() => createClerkTenantContext({ userId: "user_a", orgId: "org_a" }, [
      { tenantId: "tenant_a", identityId: "identity_a", role: "conseiller" },
      { tenantId: "tenant_b", identityId: "identity_a", role: "conseiller" },
    ])).toThrow("CLERK_TENANT_CONTEXT_DENIED");
  });

  it("creates context only from a uniquely resolved internal membership", () => {
    const context = createClerkTenantContext({ userId: "user_a", orgId: "org_a" }, [{
      tenantId: "tenant_a", identityId: "identity_a", role: "conseiller",
    }]);
    expect(context).toMatchObject({
      tenantId: "tenant_a", identityId: "identity_a", role: "conseiller", source: "clerk-session",
    });
  });

  it("uses the signed delivery id for webhook idempotence and stores no raw payload", () => {
    const record = toClerkWebhookRecord({
      type: "organizationMembership.created",
      data: {
        id: "orgmem_a",
        organization: { id: "org_a", slug: "cabinet-a", name: "Cabinet A" },
        public_user_data: { user_id: "user_a" }, role: "org:member",
      },
    }, "msg_delivery_a");
    expect(record).toMatchObject({
      eventId: "msg_delivery_a", organizationId: "org_a", userId: "user_a", membershipStatus: "active",
    });
    expect(record?.payloadSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(toClerkWebhookRecord({ type: "user.created", data: { id: "user_a" } })).toBeNull();
  });

  it("ships a signed, idempotent webhook path with a separated NOBYPASSRLS service role", () => {
    const migration = readFileSync(join(root, "drizzle/0006_pf04a_clerk_organizations_auth_foundation.sql"), "utf8");
    const route = readFileSync(join(root, "app/api/webhooks/clerk/route.ts"), "utf8");
    const resolver = readFileSync(join(root, "lib/auth/clerk-tenant-context.ts"), "utf8");
    expect(route).toContain("verifyWebhook");
    expect(route).toContain("svix-id");
    expect(migration).toMatch(/CREATE ROLE patrimoine_webhook_service[\s\S]+NOBYPASSRLS/);
    expect(migration).toContain("ON CONFLICT (provider, event_id) DO NOTHING");
    expect(migration).toContain("membership.status = 'active'");
    expect(migration).toContain("membership.revoked_at IS NULL");
    expect(migration).toContain("record_clerk_webhook_event");
    expect(resolver).toContain("resolve_clerk_context");
    expect(resolver).toContain("session.mapped");
  });
});
