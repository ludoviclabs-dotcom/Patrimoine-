import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived, server-signed download grant.
 *
 * It replaces any permanent or public object URL: the grant expires, is bound
 * to one tenant, document, version and identity, and is never sufficient on
 * its own — the download route re-checks membership, RBAC and ownership in the
 * database before a single byte is streamed.
 */

export const downloadGrantTtlSeconds = 60;

export type DownloadGrantPayload = Readonly<{
  tenantId: string;
  documentId: string;
  versionId: string;
  identityId: string;
  expiresAtMs: number;
}>;

export type DownloadGrantVerification =
  | Readonly<{ status: "valid"; payload: DownloadGrantPayload }>
  | Readonly<{ status: "malformed" | "invalid_signature" | "expired" }>;

export function resolveDownloadSigningSecret(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const secret = env.DOCUMENT_DOWNLOAD_SIGNING_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error("DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED");
  }

  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(secret: string, encodedPayload: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function issueDownloadGrant(secret: string, payload: DownloadGrantPayload) {
  const encodedPayload = encode(JSON.stringify(payload));

  return `${encodedPayload}.${sign(secret, encodedPayload)}`;
}

function parsePayload(encodedPayload: string): DownloadGrantPayload | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    const fields = ["tenantId", "documentId", "versionId", "identityId"] as const;

    if (fields.some((field) => typeof candidate[field] !== "string" || !candidate[field])) {
      return null;
    }

    if (typeof candidate.expiresAtMs !== "number" || !Number.isFinite(candidate.expiresAtMs)) {
      return null;
    }

    return {
      tenantId: candidate.tenantId as string,
      documentId: candidate.documentId as string,
      versionId: candidate.versionId as string,
      identityId: candidate.identityId as string,
      expiresAtMs: candidate.expiresAtMs,
    };
  } catch {
    return null;
  }
}

export function verifyDownloadGrant(
  secret: string,
  token: string,
  nowMs: number,
): DownloadGrantVerification {
  const [encodedPayload, providedSignature, ...rest] = token.split(".");

  if (!encodedPayload || !providedSignature || rest.length > 0) {
    return { status: "malformed" };
  }

  const expected = Buffer.from(sign(secret, encodedPayload));
  const provided = Buffer.from(providedSignature);

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { status: "invalid_signature" };
  }

  const payload = parsePayload(encodedPayload);

  if (!payload) {
    return { status: "malformed" };
  }

  if (payload.expiresAtMs <= nowMs) {
    return { status: "expired" };
  }

  return { status: "valid", payload };
}
