import { NextRequest, NextResponse } from "next/server";
import { instantiatePersona } from "@/lib/dossiers/v2-dossiers";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const { id } = await context.params;
  const data = instantiatePersona(id);

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data,
  });
}
