import { NextResponse } from "next/server";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { getServerReportService, reportErrorResponse } from "@/lib/report/runtime";

export const runtime = "nodejs";

/**
 * Streams the stored report PDF through the server after re-checking
 * membership, RBAC, tenant ownership and the grant. Every served byte is
 * preceded by an audit entry.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ reportVersionId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { reportVersionId } = await context.params;
    const token = new URL(request.url).searchParams.get("token");

    if (!token) {
      throw new Error("REPORT_DOWNLOAD_GRANT_MALFORMED");
    }

    const payload = await getServerReportService().openDownload(tenantContext, token);

    if (payload.reportVersionId !== reportVersionId) {
      throw new Error("REPORT_DOWNLOAD_GRANT_SUBJECT_MISMATCH");
    }

    return new Response(payload.stream, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(payload.byteSize),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(payload.fileName)}`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
        "X-Report-Version": String(payload.versionNumber),
        "X-Report-Status": payload.status,
        "X-Report-Pdf-Sha256": payload.pdfSha256,
        "X-Report-Snapshot-Sha256": payload.snapshotSha256,
      },
    });
  } catch (error) {
    const { status, body } = reportErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
