import { NextResponse } from "next/server";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { documentErrorResponse, getPrivateDocumentService } from "@/lib/documents/runtime";
import { maxDocumentByteSize } from "@/lib/documents/upload-validation";

export const runtime = "nodejs";

/**
 * Private upload endpoint: authenticated session, RBAC, dossier authorization,
 * server-side metadata validation, private object write, SHA-256 and audit.
 * The browser-declared MIME type is only a candidate; the stored type is the
 * one detected from the payload itself.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { documentId } = await context.params;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) {
      throw new Error("DOCUMENT_REQUEST_INVALID");
    }

    if (file.size > maxDocumentByteSize) {
      throw new Error("DOCUMENT_UPLOAD_TOO_LARGE");
    }

    const version = await getPrivateDocumentService().uploadNewVersion(tenantContext, {
      documentId,
      fileName: file.name,
      declaredMimeType: file.type || null,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });

    return NextResponse.json({ data: version }, { status: 201 });
  } catch (error) {
    const { status, body } = documentErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { documentId } = await context.params;
    const versions = await getPrivateDocumentService().listVersions(tenantContext, documentId);

    return NextResponse.json({ data: versions });
  } catch (error) {
    const { status, body } = documentErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
