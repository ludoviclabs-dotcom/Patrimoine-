import { describe, expect, it } from "vitest";
import { can, listCapabilities } from "../../lib/auth/authorization";
import {
  managedPostgresMigrationMarker,
  managedPostgresRlsTables,
} from "../../lib/db/managed-readiness";
import {
  assertBlobKeyOwnedByTenant,
  buildDocumentVersionBlobKey,
  parseDocumentVersionBlobKey,
  privateDocumentBlobAccess,
} from "../../lib/documents/blob";
import {
  downloadGrantTtlSeconds,
  issueDownloadGrant,
  resolveDownloadSigningSecret,
  verifyDownloadGrant,
} from "../../lib/documents/access-grant";
import { createInMemoryPrivateDocumentStorage } from "../../lib/documents/private-storage";
import {
  allowedDocumentMediaTypes,
  computeSha256,
  detectMediaType,
  maxDocumentByteSize,
  sanitizeOriginalFileName,
  validateUploadCandidate,
} from "../../lib/documents/upload-validation";

const tenantId = "11111111-1111-4111-8111-111111111111";
const foreignTenantId = "22222222-2222-4222-8222-222222222222";
const caseId = "33333333-3333-4333-8333-333333333333";
const documentId = "44444444-4444-4444-8444-444444444444";
const versionId = "55555555-5555-4555-8555-555555555555";
const signingSecret = "pf05-test-signing-secret-0123456789";

function pdfBytes(payload = "avis d'imposition") {
  return new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d,
    ...Buffer.from(payload, "utf8"),
  ]);
}

describe("PF-05 private object keys", () => {
  it("builds a key from identifiers only, with no personal data", () => {
    const key = buildDocumentVersionBlobKey({ tenantId, caseId, documentId, versionId });

    expect(key).toBe(
      `tenants/${tenantId}/dossiers/${caseId}/documents/${documentId}/versions/${versionId}`,
    );
    expect(key).not.toMatch(/avis|claire|marc|\.pdf/i);
    expect(parseDocumentVersionBlobKey(key)).toEqual({
      tenantId,
      caseId,
      documentId,
      versionId,
    });
  });

  it("refuses a key segment that is not an opaque identifier", () => {
    expect(() => buildDocumentVersionBlobKey({
      tenantId,
      caseId,
      documentId,
      versionId: "avis-imposition-claire.pdf",
    })).toThrow("DOCUMENT_BLOB_KEY_VERSION_INVALID");
  });

  it("refuses a guessed or foreign object key", () => {
    const foreignKey = buildDocumentVersionBlobKey({
      tenantId: foreignTenantId,
      caseId,
      documentId,
      versionId,
    });

    expect(() => assertBlobKeyOwnedByTenant(foreignKey, tenantId))
      .toThrow("DOCUMENT_BLOB_KEY_TENANT_MISMATCH");
    expect(() => assertBlobKeyOwnedByTenant(`tenants/${tenantId}/guessed`, tenantId))
      .toThrow("DOCUMENT_BLOB_KEY_INVALID");
    expect(assertBlobKeyOwnedByTenant(
      buildDocumentVersionBlobKey({ tenantId, caseId, documentId, versionId }),
      tenantId,
    )).toMatchObject({ tenantId, documentId });
  });

  it("pins private access for every stored patrimonial object", () => {
    expect(privateDocumentBlobAccess).toBe("private");
  });
});

describe("PF-05 upload validation", () => {
  it("detects the media type from the payload, never from the declaration", () => {
    expect(detectMediaType(pdfBytes())).toBe("application/pdf");
    expect(detectMediaType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectMediaType(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )).toBe("image/png");
    expect(detectMediaType(Buffer.from("plain text, no signature"))).toBeNull();
  });

  it("stores the detected type when the browser declares nothing", () => {
    const validated = validateUploadCandidate({
      fileName: "avis-imposition.pdf",
      declaredMimeType: null,
      bytes: pdfBytes(),
    });

    expect(validated.mimeType).toBe("application/pdf");
    expect(allowedDocumentMediaTypes).toContain(validated.mimeType);
    expect(validated.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(validated.byteSize).toBe(pdfBytes().byteLength);
  });

  it("refuses a payload whose declared type contradicts its signature", () => {
    expect(() => validateUploadCandidate({
      fileName: "faux.pdf",
      declaredMimeType: "application/pdf",
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x01]),
    })).toThrow("DOCUMENT_MEDIA_TYPE_MISMATCH");
  });

  it("refuses an unsupported, empty or oversized payload", () => {
    expect(() => validateUploadCandidate({
      fileName: "tableur.csv",
      declaredMimeType: "text/csv",
      bytes: Buffer.from("montant;valeur\n1;2\n"),
    })).toThrow("DOCUMENT_MEDIA_TYPE_NOT_ALLOWED");

    expect(() => validateUploadCandidate({
      fileName: "vide.pdf",
      declaredMimeType: "application/pdf",
      bytes: new Uint8Array(0),
    })).toThrow("DOCUMENT_UPLOAD_EMPTY");

    expect(() => validateUploadCandidate({
      fileName: "enorme.pdf",
      declaredMimeType: "application/pdf",
      bytes: new Uint8Array(maxDocumentByteSize + 1),
    })).toThrow("DOCUMENT_UPLOAD_TOO_LARGE");
  });

  it("refuses a traversal, control-character or oversized file name", () => {
    expect(() => sanitizeOriginalFileName("../../etc/passwd")).toThrow("DOCUMENT_FILE_NAME_INVALID");
    expect(() => sanitizeOriginalFileName("dossier\\avis.pdf")).toThrow("DOCUMENT_FILE_NAME_INVALID");
    expect(() => sanitizeOriginalFileName(`avis${String.fromCharCode(0)}.pdf`))
      .toThrow("DOCUMENT_FILE_NAME_INVALID");
    expect(() => sanitizeOriginalFileName("")).toThrow("DOCUMENT_FILE_NAME_INVALID");
    expect(() => sanitizeOriginalFileName(`${"a".repeat(200)}.pdf`))
      .toThrow("DOCUMENT_FILE_NAME_INVALID");
    expect(sanitizeOriginalFileName("  Avis d'imposition 2026.pdf ")).toBe("Avis d'imposition 2026.pdf");
  });

  it("computes the SHA-256 of the stored bytes", () => {
    expect(computeSha256(Buffer.from("abc", "utf8"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("PF-05 short-lived download grants", () => {
  const payload = {
    tenantId,
    documentId,
    versionId,
    identityId: "66666666-6666-4666-8666-666666666666",
    expiresAtMs: 2_000_000,
  } as const;

  it("accepts an unexpired grant signed by the server secret", () => {
    const token = issueDownloadGrant(signingSecret, payload);

    expect(verifyDownloadGrant(signingSecret, token, 1_999_999)).toEqual({
      status: "valid",
      payload,
    });
  });

  it("refuses an expired, tampered, foreign-secret or malformed grant", () => {
    const token = issueDownloadGrant(signingSecret, payload);

    expect(verifyDownloadGrant(signingSecret, token, payload.expiresAtMs).status).toBe("expired");
    expect(verifyDownloadGrant(signingSecret, `${token}x`, 1).status).toBe("invalid_signature");
    expect(verifyDownloadGrant("another-secret-that-is-long-enough-32", token, 1).status)
      .toBe("invalid_signature");
    expect(verifyDownloadGrant(signingSecret, "not-a-grant", 1).status).toBe("malformed");
    expect(verifyDownloadGrant(signingSecret, "a.b.c", 1).status).toBe("malformed");
  });

  it("keeps the grant lifetime short and requires a real server secret", () => {
    expect(downloadGrantTtlSeconds).toBeLessThanOrEqual(300);
    expect(() => resolveDownloadSigningSecret({}))
      .toThrow("DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED");
    expect(() => resolveDownloadSigningSecret({
      DOCUMENT_DOWNLOAD_SIGNING_SECRET: "too-short",
    })).toThrow("DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED");
  });
});

describe("PF-05 storage port", () => {
  it("stores, streams back and refuses to overwrite an object key", async () => {
    const storage = createInMemoryPrivateDocumentStorage();
    const key = buildDocumentVersionBlobKey({ tenantId, caseId, documentId, versionId });
    const bytes = pdfBytes();

    await storage.put({ key, bytes, contentType: "application/pdf" });
    expect(storage.keys()).toEqual([key]);

    const stored = await storage.open(key);
    expect(stored?.byteSize).toBe(bytes.byteLength);
    expect(await storage.open("tenants/unknown/versions/unknown")).toBeNull();

    await expect(storage.put({ key, bytes, contentType: "application/pdf" }))
      .rejects.toThrow("DOCUMENT_BLOB_KEY_ALREADY_USED");
  });
});

describe("PF-05 authorization and readiness surface", () => {
  it("keeps document validation a cabinet capability", () => {
    expect(listCapabilities("admin")).toContain("document.validate");
    expect(listCapabilities("conseiller")).toContain("document.validate");
    expect(listCapabilities("expert")).toContain("document.validate");
    expect(listCapabilities("client")).not.toContain("document.validate");
    expect(listCapabilities("auditeur")).not.toContain("document.validate");
    expect(can(
      { tenantId, role: "client" },
      "document.validate",
      { tenantId, type: "document", id: documentId },
    )).toBe(false);
  });

  it("declares the PF-05 migration marker and the new protected tables", () => {
    expect(managedPostgresMigrationMarker).toBe("0008_pf05_private_document_storage");
    expect(managedPostgresRlsTables).toEqual(expect.arrayContaining([
      "documents",
      "document_versions",
      "simulation_document_versions",
    ]));
  });
});
