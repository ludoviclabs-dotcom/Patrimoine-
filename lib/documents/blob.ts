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
