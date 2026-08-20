import { createHash } from "node:crypto";

/**
 * Upload validation for private patrimonial documents.
 *
 * The browser-declared MIME type is never authoritative: it is only compared
 * with the type detected from the magic bytes of the payload. A mismatch, an
 * unknown signature or an oversized payload is refused; nothing is guessed.
 */

export const maxDocumentByteSize = 25 * 1024 * 1024;
export const maxOriginalFileNameLength = 180;

export type AllowedMediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/tiff";

type Signature = Readonly<{ mediaType: AllowedMediaType; bytes: readonly number[] }>;

/**
 * Closed allowlist. Only formats whose leading bytes can be verified are
 * accepted; container formats that cannot be distinguished from their magic
 * bytes alone (OOXML/ZIP) and signature-less text formats (CSV) stay refused
 * rather than being admitted on the browser's word.
 */
const signatures: readonly Signature[] = [
  { mediaType: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { mediaType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mediaType: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mediaType: "image/tiff", bytes: [0x49, 0x49, 0x2a, 0x00] },
  { mediaType: "image/tiff", bytes: [0x4d, 0x4d, 0x00, 0x2a] },
];

export const allowedDocumentMediaTypes: readonly AllowedMediaType[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
];

export function detectMediaType(bytes: Uint8Array): AllowedMediaType | null {
  for (const signature of signatures) {
    if (bytes.length < signature.bytes.length) {
      continue;
    }

    if (signature.bytes.every((byte, index) => bytes[index] === byte)) {
      return signature.mediaType;
    }
  }

  return null;
}

export function computeSha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Keeps the human-readable name in the database only. Directory separators,
 * traversal segments and control characters are refused rather than silently
 * rewritten, so a rejected name is never turned into a different valid one.
 */
export function sanitizeOriginalFileName(fileName: string) {
  const normalized = fileName.trim().normalize("NFC");

  if (!normalized || normalized.length > maxOriginalFileNameLength) {
    throw new Error("DOCUMENT_FILE_NAME_INVALID");
  }

  if (/[\\/]/.test(normalized) || normalized === "." || normalized === "..") {
    throw new Error("DOCUMENT_FILE_NAME_INVALID");
  }

  const hasControlCharacter = Array.from(normalized).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f;
  });

  if (hasControlCharacter) {
    throw new Error("DOCUMENT_FILE_NAME_INVALID");
  }

  return normalized;
}

export type UploadCandidate = Readonly<{
  fileName: string;
  declaredMimeType: string | null;
  bytes: Uint8Array;
}>;

export type ValidatedUpload = Readonly<{
  originalFileName: string;
  mimeType: AllowedMediaType;
  declaredMimeType: string | null;
  byteSize: number;
  sha256: string;
}>;

export function validateUploadCandidate(candidate: UploadCandidate): ValidatedUpload {
  const originalFileName = sanitizeOriginalFileName(candidate.fileName);
  const byteSize = candidate.bytes.byteLength;

  if (byteSize === 0) {
    throw new Error("DOCUMENT_UPLOAD_EMPTY");
  }

  if (byteSize > maxDocumentByteSize) {
    throw new Error("DOCUMENT_UPLOAD_TOO_LARGE");
  }

  const mimeType = detectMediaType(candidate.bytes);

  if (!mimeType) {
    throw new Error("DOCUMENT_MEDIA_TYPE_NOT_ALLOWED");
  }

  const declaredMimeType = candidate.declaredMimeType?.split(";")[0].trim().toLowerCase() || null;

  if (declaredMimeType && declaredMimeType !== mimeType) {
    throw new Error("DOCUMENT_MEDIA_TYPE_MISMATCH");
  }

  return {
    originalFileName,
    mimeType,
    declaredMimeType,
    byteSize,
    sha256: computeSha256(candidate.bytes),
  };
}
