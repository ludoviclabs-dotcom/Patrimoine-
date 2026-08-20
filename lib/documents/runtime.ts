import { getDatabase } from "../db/client";
import { resolveDownloadSigningSecret } from "./access-grant";
import { createPrivateDocumentService } from "./document-service";
import { createVercelPrivateBlobStorage } from "./private-storage";

/**
 * Runtime wiring for the private document routes. Configuration is read from
 * the server environment only; nothing here accepts a browser-provided value.
 */
export function getPrivateDocumentService() {
  return createPrivateDocumentService({
    database: getDatabase(),
    storage: createVercelPrivateBlobStorage(),
    downloadSigningSecret: resolveDownloadSigningSecret(),
  });
}

const statusByCode: Readonly<Record<string, number>> = {
  CLERK_SESSION_REQUIRED: 401,
  CLERK_ORGANIZATION_REQUIRED: 401,
  CLERK_TENANT_CONTEXT_DENIED: 401,
  TENANT_MEMBERSHIP_REQUIRED: 401,
  TENANT_AUTHORIZATION_DENIED: 403,
  TENANT_OWNERSHIP_VIOLATION: 403,
  DOCUMENT_BLOB_KEY_INVALID: 403,
  DOCUMENT_BLOB_KEY_TENANT_MISMATCH: 403,
  DOCUMENT_DOWNLOAD_GRANT_MALFORMED: 403,
  DOCUMENT_DOWNLOAD_GRANT_INVALID_SIGNATURE: 403,
  DOCUMENT_DOWNLOAD_GRANT_EXPIRED: 403,
  DOCUMENT_DOWNLOAD_GRANT_SUBJECT_MISMATCH: 403,
  DOCUMENT_NOT_FOUND: 404,
  DOCUMENT_VERSION_NOT_FOUND: 404,
  DOCUMENT_DELETED: 404,
  DOCUMENT_OBJECT_NOT_FOUND: 404,
  SIMULATION_RUN_NOT_FOUND: 404,
  DOCUMENT_QUARANTINED: 409,
  DOCUMENT_VERSION_QUARANTINED: 409,
  DOCUMENT_NOT_AVAILABLE: 409,
  DOCUMENT_VERSION_NOT_AVAILABLE: 409,
  DOCUMENT_VERSION_AWAITING_VALIDATION: 409,
  DOCUMENT_UPLOAD_EMPTY: 400,
  DOCUMENT_FILE_NAME_INVALID: 400,
  DOCUMENT_REQUEST_INVALID: 400,
  DOCUMENT_UPLOAD_TOO_LARGE: 413,
  DOCUMENT_MEDIA_TYPE_NOT_ALLOWED: 415,
  DOCUMENT_MEDIA_TYPE_MISMATCH: 415,
  // PF-06 server reports share this private-resource error surface.
  REPORT_BLOB_KEY_INVALID: 403,
  REPORT_BLOB_KEY_TENANT_MISMATCH: 403,
  REPORT_DOWNLOAD_GRANT_MALFORMED: 403,
  REPORT_DOWNLOAD_GRANT_INVALID_SIGNATURE: 403,
  REPORT_DOWNLOAD_GRANT_EXPIRED: 403,
  REPORT_DOWNLOAD_GRANT_SUBJECT_MISMATCH: 403,
  REPORT_VERSION_NOT_FOUND: 404,
  REPORT_OBJECT_NOT_FOUND: 404,
  DOSSIER_NOT_FOUND: 404,
  REPORT_ALREADY_VALIDATED: 409,
  REPORT_VERSION_SUPERSEDED: 409,
  REPORT_READINESS_BLOCKED: 409,
  REPORT_LEGAL_FREEZE_DATE_REQUIRED: 400,
  REPORT_SIMULATION_RUN_REQUIRED: 400,
  REPORT_VALIDATION_COMMENT_REQUIRED: 400,
  REPORT_REQUEST_INVALID: 400,
};

/**
 * Maps a domain failure to a status code and a stable machine-readable code.
 * No message, tenant identifier, file name or provider detail is returned.
 */
export function documentErrorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "DOCUMENT_REQUEST_FAILED";
  const status = statusByCode[code] ?? 500;

  return {
    status,
    body: { error: status === 500 ? "DOCUMENT_REQUEST_FAILED" : code },
  } as const;
}
