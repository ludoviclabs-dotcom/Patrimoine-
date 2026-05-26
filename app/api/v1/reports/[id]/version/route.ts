import { NextRequest, NextResponse } from "next/server";
import { getDossierSnapshot } from "@/lib/dossiers/v2-dossiers";
import { getV2TaxRuns } from "@/lib/tax/v2-engines";
import { getDemoRequestContext, getDemoRoleFromRequest } from "@/lib/security/access-control";
import type { ReportVersion } from "@/lib/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = getDemoRequestContext(getDemoRoleFromRequest(request));
  const { id } = await context.params;
  const snapshot = getDossierSnapshot(id);
  const runs = getV2TaxRuns();
  const data: ReportVersion = {
    id: `report-${id}-v2-001`,
    tenantId: actor.tenantId,
    caseId: id,
    version: "V2.0-draft",
    status: "issued_for_review",
    generatedAt: new Date().toISOString(),
    simulationRunIds: runs.map((run) => run.id),
    validationDecision: "pending",
    evidenceSourceIds: Array.from(new Set(runs.flatMap((run) => run.evidenceSourceIds))),
    coverageLimitIds: Array.from(new Set(runs.flatMap((run) => run.coverageLimitIds ?? []))),
  };

  return NextResponse.json({
    mode: actor.mode,
    tenantId: actor.tenantId,
    generatedAt: data.generatedAt,
    snapshotId: snapshot.id,
    data,
  });
}
