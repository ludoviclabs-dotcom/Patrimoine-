import { NextResponse } from "next/server";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { documentErrorResponse, getPrivateDocumentService } from "@/lib/documents/runtime";

export const runtime = "nodejs";

/**
 * Authorizes a download and returns a short-lived, server-signed access grant.
 * No permanent or public object URL is ever produced: the returned path points
 * back at this application, and the grant is re-verified against membership,
 * RBAC, dossier grant and document state before any byte is streamed.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { documentId } = await context.params;
    const requestedVersion = new URL(request.url).searchParams.get("version");
    const versionNumber = requestedVersion ? Number(requestedVersion) : undefined;

    if (versionNumber !== undefined && !Number.isInteger(versionNumber)) {
      throw new Error("DOCUMENT_REQUEST_INVALID");
    }

    const authorization = await getPrivateDocumentService().authorizeDownload(tenantContext, {
      documentId,
      versionNumber,
    });

    const { token, ...metadata } = authorization;

    return NextResponse.json({
      data: {
        ...metadata,
        downloadUrl: `/api/v1/documents/${documentId}/download/stream?token=${encodeURIComponent(token)}`,
      },
    });
  } catch (error) {
    const { status, body } = documentErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
