import { NextResponse } from "next/server";
import { buildRuleDiffImpact, controlAllEvidenceSources } from "@/lib/evidence/source-control";
import { getDemoUser } from "@/lib/demo-data/v1";
import { getDemoRoleFromRequest, requireEvidenceAdmin } from "@/lib/security/access-control";

export async function GET(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request) === "admin" ? "admin" : "expert");
  requireEvidenceAdmin(user);
  const results = await controlAllEvidenceSources({ liveEnabled: false });
  const diffs = results.map((result) => buildRuleDiffImpact(result));

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: diffs,
  });
}
