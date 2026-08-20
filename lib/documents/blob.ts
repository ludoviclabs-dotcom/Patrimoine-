export type BlobStorageStatus = {
  provider: "vercel-blob-private";
  configured: boolean;
  mode: "ready" | "token_missing";
  uploadPolicy: "metadata-only-demo" | "private-blob";
};

export function getBlobStorageStatus(): BlobStorageStatus {
  const configured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return {
    provider: "vercel-blob-private",
    configured,
    mode: configured ? "ready" : "token_missing",
    uploadPolicy: configured ? "private-blob" : "metadata-only-demo",
  };
}

/**
 * Legacy demo helper kept for the fixture document checklist. It embeds a file
 * name and must never be used for a real stored object: PF-05 object keys are
 * built by buildDocumentVersionBlobKey and carry identifiers only.
 */
export function buildTenantBlobPath({
  tenantId,
  caseId,
  documentId,
  filename,
}: {
  tenantId: string;
  caseId: string;
  documentId: string;
  filename: string;
}) {
  const safeFilename = filename.toLowerCase().replace(/[^a-z0-9_.-]+/g, "-");

  return `tenants/${tenantId}/cases/${caseId}/documents/${documentId}/${safeFilename}`;
}

export const privateDocumentStorageProvider = "vercel-blob-private";
export const privateDocumentBlobAccess = "private";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const blobKeyPattern =
  /^tenants\/([0-9a-f-]{36})\/dossiers\/([0-9a-f-]{36})\/documents\/([0-9a-f-]{36})\/versions\/([0-9a-f-]{36})$/;

export type DocumentVersionBlobKeyParts = Readonly<{
  tenantId: string;
  caseId: string;
  documentId: string;
  versionId: string;
}>;

function assertUuid(value: string, code: string) {
  const normalized = value.trim().toLowerCase();

  if (!uuidPattern.test(normalized)) {
    throw new Error(code);
  }

  return normalized;
}

/**
 * Builds the only object key shape accepted by the database check constraint.
 * The key is composed of opaque identifiers: no file name, client name,
 * label or any other personal data ever reaches the storage provider path.
 */
export function buildDocumentVersionBlobKey(parts: DocumentVersionBlobKeyParts) {
  const tenantId = assertUuid(parts.tenantId, "DOCUMENT_BLOB_KEY_TENANT_INVALID");
  const caseId = assertUuid(parts.caseId, "DOCUMENT_BLOB_KEY_CASE_INVALID");
  const documentId = assertUuid(parts.documentId, "DOCUMENT_BLOB_KEY_DOCUMENT_INVALID");
  const versionId = assertUuid(parts.versionId, "DOCUMENT_BLOB_KEY_VERSION_INVALID");

  return `tenants/${tenantId}/dossiers/${caseId}/documents/${documentId}/versions/${versionId}`;
}

export function parseDocumentVersionBlobKey(key: string): DocumentVersionBlobKeyParts | null {
  const match = blobKeyPattern.exec(key);

  if (!match) {
    return null;
  }

  return {
    tenantId: match[1],
    caseId: match[2],
    documentId: match[3],
    versionId: match[4],
  };
}

/**
 * Last-line defence against a guessed or forged object key: the key must both
 * be well formed and belong to the tenant of the active server context.
 */
export function assertBlobKeyOwnedByTenant(key: string, tenantId: string) {
  const parts = parseDocumentVersionBlobKey(key);

  if (!parts) {
    throw new Error("DOCUMENT_BLOB_KEY_INVALID");
  }

  if (parts.tenantId !== tenantId.trim().toLowerCase()) {
    throw new Error("DOCUMENT_BLOB_KEY_TENANT_MISMATCH");
  }

  return parts;
}
