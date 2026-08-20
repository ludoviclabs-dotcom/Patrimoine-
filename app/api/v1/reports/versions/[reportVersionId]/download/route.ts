import { NextResponse } from "next/server";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { getServerReportService, reportErrorResponse } from "@/lib/report/runtime";

export const runtime = "nodejs";

/**
 * Authorizes a report download and returns a short-lived signed grant plus the
 * integrity fingerprints. No permanent or public object URL is ever produced.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ reportVersionId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { reportVersionId } = await context.params;
    const authorization = await getServerReportService().authorizeDownload(
      tenantContext,
      reportVersionId,
    );
    const { token, ...metadata } = authorization;

    return NextResponse.json({
      data: {
        ...metadata,
        downloadUrl: `/api/v1/reports/versions/${reportVersionId}/download/stream?token=${encodeURIComponent(token)}`,
      },
    });
  } catch (error) {
    const { status, body } = reportErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
