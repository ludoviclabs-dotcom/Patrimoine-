import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-data/v1";
import { getDemoRoleFromRequest } from "@/lib/security/access-control";
import { persistIfiSimulation } from "@/lib/workflow/case-workflow";

export async function POST(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as { caseId?: string };
  const run = persistIfiSimulation({ caseId: body.caseId, user });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: run,
  });
}
