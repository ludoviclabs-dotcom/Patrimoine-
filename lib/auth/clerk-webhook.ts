import { createHash } from "node:crypto";

export const clerkWebhookEventTypes = [
  "user.created",
  "user.updated",
  "organization.created",
  "organization.updated",
  "organizationMembership.created",
  "organizationMembership.updated",
  "organizationMembership.deleted",
] as const;

export type ClerkWebhookEventType = (typeof clerkWebhookEventTypes)[number];

export type ClerkWebhookRecord = Readonly<{
  eventId: string;
  eventType: ClerkWebhookEventType;
  payloadSha256: string;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  organizationId: string | null;
  organizationSlug: string | null;
  organizationName: string | null;
  membershipStatus: "active" | "inactive" | null;
  membershipRole: string | null;
}>;

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function primaryEmail(data: JsonRecord) {
  const primaryId = string(data.primary_email_address_id);
  const addresses = Array.isArray(data.email_addresses) ? data.email_addresses : [];
  const candidate = addresses
    .map(record)
    .find((address) => address && (!primaryId || address.id === primaryId));
  return candidate ? string(candidate.email_address) : null;
}

/** Extracts only the fields required for the provider-neutral synchronization. */
export function toClerkWebhookRecord(event: unknown, deliveryId?: string | null): ClerkWebhookRecord | null {
  const envelope = record(event);
  const eventType = string(envelope?.type);
  const eventId = string(deliveryId) ?? string(envelope?.id);
  if (!eventType || !eventId || !clerkWebhookEventTypes.includes(eventType as ClerkWebhookEventType)) {
    return null;
  }

  const data = record(envelope?.data) ?? {};
  const organization = record(data.organization);
  const publicUser = record(data.public_user_data);
  const isUserEvent = eventType.startsWith("user.");
  const userId = isUserEvent
    ? string(data.id)
    : string(data.user_id) ?? string(publicUser?.user_id);
  const organizationId = string(data.organization_id) ?? string(organization?.id) ?? (
    eventType.startsWith("organization.") ? string(data.id) : null
  );
  const displayName = isUserEvent
    ? [string(data.first_name), string(data.last_name)].filter(Boolean).join(" ") || string(data.username) || "Clerk user"
    : null;
  const membershipStatus = eventType.startsWith("organizationMembership.")
    ? eventType.endsWith(".deleted") ? "inactive" : "active"
    : null;

  return {
    eventId,
    eventType: eventType as ClerkWebhookEventType,
    payloadSha256: createHash("sha256").update(JSON.stringify(envelope)).digest("hex"),
    userId,
    email: isUserEvent ? primaryEmail(data) : null,
    displayName,
    organizationId,
    organizationSlug: string(data.slug) ?? string(organization?.slug),
    organizationName: string(data.name) ?? string(organization?.name),
    membershipStatus,
    membershipRole: membershipStatus ? string(data.role) : null,
  };
}
