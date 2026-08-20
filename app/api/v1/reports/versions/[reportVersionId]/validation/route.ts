import { NextResponse } from "next/server";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { getServerReportService, reportErrorResponse } from "@/lib/report/runtime";

export const runtime = "nodejs";

const decisions = ["approved", "changes_requested", "rejected"] as const;
type Decision = (typeof decisions)[number];

/**
 * Records a professional validation decision. The reviewed version is never
 * mutated: the decision is appended as a new immutable version n+1 carrying the
 * actor, timestamp, decision and comment.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ reportVersionId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { reportVersionId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | { decision?: unknown; comment?: unknown }
      | null;

    if (
      !body
      || !decisions.includes(body.decision as Decision)
      || typeof body.comment !== "string"
    ) {
      throw new Error("REPORT_REQUEST_INVALID");
    }

    const version = await getServerReportService().validateVersion(tenantContext, {
      reportVersionId,
      decision: body.decision as Decision,
      comment: body.comment,
    });

    return NextResponse.json({ data: version }, { status: 201 });
  } catch (error) {
    const { status, body } = reportErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
