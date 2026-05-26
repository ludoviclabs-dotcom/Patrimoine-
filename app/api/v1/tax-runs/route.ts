import { NextRequest, NextResponse } from "next/server";
import { getV2TaxRuns } from "@/lib/tax/v2-engines";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";

export async function GET(request: NextRequest) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data: getV2TaxRuns(),
  });
}

export async function POST(request: NextRequest) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as { module?: string };
  const runs = getV2TaxRuns();
  const data = runs.find((run) => run.module === body.module) ?? runs[0];

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data,
  });
}
