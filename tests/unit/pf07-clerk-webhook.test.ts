import { describe, expect, it } from "vitest";
import {
  assertSafeClerkWebhookRole,
  type DatabaseWebhookRole,
} from "../../lib/db/managed-readiness";
import { toClerkWebhookRecord } from "../../lib/auth/clerk-webhook";

/**
 * PF-07 — the privilege contract behind CLERK_WEBHOOK_DATABASE_URL.
 *
 * The PostgreSQL suite proves the real login is narrow. These cases pin the
 * assertion itself, so a future relaxation fails here rather than silently
 * admitting an over-privileged webhook credential in production.
 */
const safeRole: DatabaseWebhookRole = {
  roleName: "patrimoine_webhook_login",
  isSuperuser: false,
  bypassesRls: false,
  canAssumeWebhookRole: true,
  canAssumeApplicationRole: false,
  hasDirectTablePrivileges: false,
  ownsTables: false,
};

describe("PF-07 — Clerk webhook role safety", () => {
  it("accepts a dedicated login that may assume only the webhook service role", () => {
    expect(() => assertSafeClerkWebhookRole(safeRole)).not.toThrow();
  });

  const rejected: ReadonlyArray<[string, Partial<DatabaseWebhookRole>]> = [
    ["a superuser", { isSuperuser: true }],
    ["a login bypassing RLS", { bypassesRls: true }],
    ["a login outside patrimoine_webhook_service", { canAssumeWebhookRole: false }],
    ["a login that can also become the application runtime", { canAssumeApplicationRole: true }],
    ["a login holding direct table privileges", { hasDirectTablePrivileges: true }],
    ["a login owning tables", { ownsTables: true }],
    ["the service role connecting directly", { roleName: "patrimoine_webhook_service" }],
  ];

  it.each(rejected)("refuses %s", (_label, override) => {
    expect(() => assertSafeClerkWebhookRole({ ...safeRole, ...override }))
      .toThrow("CLERK_WEBHOOK_DATABASE_ROLE_UNSAFE");
  });
});

describe("PF-07 — webhook idempotency key", () => {
  const membership = {
    type: "organizationMembership.created",
    data: {
      id: "orgmem_1",
      organization: { id: "org_1", slug: "cabinet-a", name: "CABINET_A" },
      public_user_data: { user_id: "user_1" },
      role: "org:member",
    },
  };

  it("uses the signed Svix delivery id, not a payload-controlled identifier", () => {
    const record = toClerkWebhookRecord(membership, "msg_signed_delivery");
    expect(record?.eventId).toBe("msg_signed_delivery");
  });

  it("keeps the delivery id stable across replays of the same payload", () => {
    const first = toClerkWebhookRecord(membership, "msg_replay");
    const second = toClerkWebhookRecord(membership, "msg_replay");
    expect(first?.eventId).toBe(second?.eventId);
    expect(first?.payloadSha256).toBe(second?.payloadSha256);
  });

  it("produces a different fingerprint when the payload changes", () => {
    const original = toClerkWebhookRecord(membership, "msg_a");
    const altered = toClerkWebhookRecord(
      { ...membership, data: { ...membership.data, role: "org:admin" } },
      "msg_a",
    );
    expect(original?.payloadSha256).not.toBe(altered?.payloadSha256);
  });

  it("refuses an event type outside the synchronization contract", () => {
    expect(toClerkWebhookRecord({ type: "session.created", data: { id: "sess_1" } }, "msg_b")).toBeNull();
  });

  it("refuses a delivery with no signed id", () => {
    expect(toClerkWebhookRecord(membership, null)).toBeNull();
  });
});
