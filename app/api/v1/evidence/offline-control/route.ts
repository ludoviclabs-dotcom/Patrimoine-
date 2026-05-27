import { NextResponse } from "next/server";
import { controlOfflineEvidenceSources } from "@/lib/evidence/offline-control";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";

export function GET(request: Request) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data: controlOfflineEvidenceSources(),
  });
}
