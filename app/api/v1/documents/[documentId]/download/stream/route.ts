import { NextResponse } from "next/server";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { documentErrorResponse, getPrivateDocumentService } from "@/lib/documents/runtime";

export const runtime = "nodejs";

/**
 * Streams a private object through the server. The grant is bound to the
 * session identity, expires within seconds, and is re-checked against the
 * database; an expired, forged or replayed grant never reaches storage.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { documentId } = await context.params;
    const token = new URL(request.url).searchParams.get("token");

    if (!token) {
      throw new Error("DOCUMENT_DOWNLOAD_GRANT_MALFORMED");
    }

    const payload = await getPrivateDocumentService().openDownload(tenantContext, token);

    if (payload.documentId !== documentId) {
      throw new Error("DOCUMENT_DOWNLOAD_GRANT_SUBJECT_MISMATCH");
    }

    return new Response(payload.stream, {
      status: 200,
      headers: {
        "Content-Type": payload.mimeType,
        "Content-Length": String(payload.byteSize),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(payload.originalFileName)}`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
        "X-Document-Version": String(payload.versionNumber),
        "X-Document-Sha256": payload.sha256,
      },
    });
  } catch (error) {
    const { status, body } = documentErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
