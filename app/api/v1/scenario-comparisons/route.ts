import { NextResponse } from "next/server";
import { demoTenant } from "@/lib/demo-data/v1";
import { scenarioComparisons } from "@/lib/scenario-comparisons/comparisons";

export function GET() {
  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: demoTenant.id,
    generatedAt: new Date().toISOString(),
    data: scenarioComparisons,
  });
}
