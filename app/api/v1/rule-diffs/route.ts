import { NextResponse } from "next/server";
import { getPfuRegulatoryDiff } from "@/lib/evidence/pfu-rule-diff";
import { getDemoUser } from "@/lib/demo-data/v1";
import { getDemoRoleFromRequest, requireEvidenceAdmin } from "@/lib/security/access-control";

export async function GET(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request) === "admin" ? "admin" : "expert");
  requireEvidenceAdmin(user);

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: [getPfuRegulatoryDiff()],
  });
}
