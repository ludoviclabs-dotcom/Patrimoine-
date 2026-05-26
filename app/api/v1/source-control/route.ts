import { NextResponse } from "next/server";
import { controlAllEvidenceSources, getEvidenceAdminSummary } from "@/lib/evidence/source-control";
import { getDemoUser } from "@/lib/demo-data/v1";
import { getDemoRoleFromRequest, requireEvidenceAdmin } from "@/lib/security/access-control";

export async function GET(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request) === "admin" ? "admin" : "expert");
  requireEvidenceAdmin(user);

  const results = await controlAllEvidenceSources({
    liveEnabled: process.env.EVIDENCE_LIVE_CHECKS === "enabled",
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: {
      summary: getEvidenceAdminSummary(results),
      results,
    },
  });
}
