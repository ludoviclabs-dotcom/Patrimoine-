import { NextResponse } from "next/server";
import { demoTenant } from "@/lib/demo-data/v1";
import { persistIfiSimulation, replaySimulation } from "@/lib/workflow/case-workflow";

export async function POST() {
  const replay = replaySimulation(persistIfiSimulation());

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: demoTenant.id,
    generatedAt: new Date().toISOString(),
    data: replay,
  });
}
