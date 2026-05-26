import { NextRequest, NextResponse } from "next/server";
import { generateProfessionalDocuments } from "@/lib/tax/v2-engines";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";

export async function POST(request: NextRequest) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as { caseId?: string };

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data: generateProfessionalDocuments(body.caseId),
  });
}
