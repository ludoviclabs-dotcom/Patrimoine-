import { NextRequest, NextResponse } from "next/server";
import { buildDataExportBundle, createDataExportRequest } from "@/lib/repositories/pilot-readiness";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";

export async function GET(request: NextRequest) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const exportRequest = createDataExportRequest();

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    request: exportRequest,
    data: buildDataExportBundle(exportRequest),
  });
}
