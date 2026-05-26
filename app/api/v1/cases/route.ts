import { NextResponse } from "next/server";
import { createDemoCase, updateDemoCaseStatus } from "@/lib/workflow/case-workflow";
import { demoCases, demoClients, getDemoUser } from "@/lib/demo-data/v1";
import { filterByTenant, getDemoRoleFromRequest, canAccessCaseRecord } from "@/lib/security/access-control";
import type { CaseStatus } from "@/lib/types";

export function GET(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request));
  const cases = filterByTenant(demoCases, user.tenantId).filter((clientCase) => {
    const client = demoClients.find((candidate) => candidate.id === clientCase.clientId);
    return client ? canAccessCaseRecord(user, clientCase, client) : false;
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: cases,
  });
}

export async function POST(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const result = createDemoCase({ title: body.title ?? "Nouveau dossier demo" }, user);

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: result,
  });
}

export async function PATCH(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as { caseId?: string; status?: CaseStatus };
  const result = updateDemoCaseStatus({
    caseId: body.caseId,
    status: body.status ?? "simulation_indicative",
    user,
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: result,
  });
}
