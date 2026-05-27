import { appendAuditEvent } from "./append-only";
import { demoV1AuditLogs } from "../demo-data/v1";
import type { AuditLogEntry } from "../types";

export type AuditRepositoryMode = "demo-memory" | "postgres-ready";

export type AuditAppendResult = {
  mode: AuditRepositoryMode;
  event: AuditLogEntry;
  events: readonly AuditLogEntry[];
  dbContract: {
    table: "audit_logs";
    allowedOperation: "insert_only";
    forbiddenOperations: ["update", "delete"];
  };
};

export function appendAuditEventToRepository(event: AuditLogEntry): AuditAppendResult {
  return {
    mode: process.env.DATABASE_URL ? "postgres-ready" : "demo-memory",
    event,
    events: appendAuditEvent(demoV1AuditLogs, event),
    dbContract: {
      table: "audit_logs",
      allowedOperation: "insert_only",
      forbiddenOperations: ["update", "delete"],
    },
  };
}

export function getAuditRepositoryContract(): AuditAppendResult["dbContract"] {
  return {
    table: "audit_logs",
    allowedOperation: "insert_only",
    forbiddenOperations: ["update", "delete"],
  };
}
