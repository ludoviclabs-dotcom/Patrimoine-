import { NextResponse } from "next/server";
import {
  createPrivateDocumentMetadata,
  getPrivateDocumentMetadataFixture,
} from "@/lib/repositories/pilot-readiness";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";
import type { PrivateDocumentMetadata } from "@/lib/types";

export function GET(request: Request) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data: getPrivateDocumentMetadataFixture(),
  });
}

export async function POST(request: Request) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as Partial<PrivateDocumentMetadata>;
  const result = createPrivateDocumentMetadata(body);

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data: result,
  });
}
