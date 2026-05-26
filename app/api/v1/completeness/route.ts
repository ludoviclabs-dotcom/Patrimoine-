import { NextResponse } from "next/server";
import { demoTenant } from "@/lib/demo-data/v1";
import { getCompletenessScore, getCriticalDataQuality } from "@/lib/quality/completeness";

export function GET() {
  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: demoTenant.id,
    generatedAt: new Date().toISOString(),
    data: {
      completeness: getCompletenessScore(),
      dataQuality: getCriticalDataQuality(),
    },
  });
}
