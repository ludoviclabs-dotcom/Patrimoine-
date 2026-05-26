import type { AuditLogEntry } from "../types";

export function appendAuditEvent(
  events: readonly AuditLogEntry[],
  event: AuditLogEntry,
): readonly AuditLogEntry[] {
  const frozenEvent = Object.freeze({ ...event, metadata: event.metadata ? { ...event.metadata } : undefined });

  return Object.freeze([frozenEvent, ...events]);
}

export function rejectAuditMutation(): never {
  throw new Error("AUDIT_APPEND_ONLY");
}

export function assertAuditTenantIntegrity(events: readonly AuditLogEntry[], tenantId: string) {
  const violation = events.find((event) => event.tenantId !== tenantId);

  if (violation) {
    throw new Error(`AUDIT_TENANT_SCOPE_VIOLATION:${violation.id}`);
  }
}
