import { NextRequest, NextResponse } from "next/server";
import { createDataDeletionRequest } from "@/lib/repositories/pilot-readiness";
import { getDemoRoleFromRequest } from "@/lib/security/access-control";
import { getDemoUser } from "@/lib/demo-data/v1";

export async function POST(request: NextRequest) {
  const user = getDemoUser(getDemoRoleFromRequest(request));
  const data = createDataDeletionRequest(user);

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data,
  });
}
