import { NextResponse } from "next/server";
import { getPilotRepositoryState } from "@/lib/repositories/pilot-readiness";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";

export function GET(request: Request) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data: getPilotRepositoryState(),
  });
}
