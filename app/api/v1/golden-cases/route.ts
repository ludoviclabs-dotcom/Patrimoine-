import { NextResponse } from "next/server";
import { getGoldenCases, reviewGoldenCase } from "@/lib/validation/golden-cases";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";
import type { ValidationStatus } from "@/lib/types";

export function GET(request: Request) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as ValidationStatus | null;

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data: getGoldenCases(status ?? undefined),
  });
}

export async function POST(request: Request) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    decision?: "professionally_reviewed" | "rejected";
  };

  const reviewed = reviewGoldenCase(
    body.id ?? "golden-ir-pfu-cdhr-claire-marc-v21",
    body.decision ?? "professionally_reviewed",
  );

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: new Date().toISOString(),
    data: reviewed,
  });
}
