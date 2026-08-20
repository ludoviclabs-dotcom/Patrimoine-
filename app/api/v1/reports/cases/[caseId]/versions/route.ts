import { NextResponse } from "next/server";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { getServerReportService, reportErrorResponse } from "@/lib/report/runtime";

export const runtime = "nodejs";

type GenerateBody = {
  simulationRunIds?: unknown;
  legalFreezeDate?: unknown;
  title?: unknown;
  limitations?: unknown;
};

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.trim())
    ? (value as string[])
    : null;
}

/**
 * Generates a draft report version: snapshot first from database facts, then a
 * PDF rendered exclusively from that snapshot and stored privately.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { caseId } = await context.params;
    const body = (await request.json().catch(() => null)) as GenerateBody | null;
    const simulationRunIds = stringArray(body?.simulationRunIds);

    if (!body || !simulationRunIds || typeof body.legalFreezeDate !== "string") {
      throw new Error("REPORT_REQUEST_INVALID");
    }

    const version = await getServerReportService().generateDraft(tenantContext, {
      caseId,
      simulationRunIds,
      legalFreezeDate: body.legalFreezeDate,
      title: typeof body.title === "string" ? body.title : undefined,
      limitations: stringArray(body.limitations) ?? undefined,
    });

    return NextResponse.json({ data: version }, { status: 201 });
  } catch (error) {
    const { status, body } = reportErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { caseId } = await context.params;
    const versions = await getServerReportService().listVersions(tenantContext, caseId);

    return NextResponse.json({ data: versions });
  } catch (error) {
    const { status, body } = reportErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
