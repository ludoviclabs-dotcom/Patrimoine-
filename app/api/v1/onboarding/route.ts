import { NextRequest, NextResponse } from "next/server";
import { createOnboardingDossier } from "@/lib/dossiers/v2-dossiers";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";
import type { OnboardingInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as Partial<OnboardingInput>;
  const data = createOnboardingDossier(body);

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data,
  });
}
