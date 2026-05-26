import { NextResponse } from "next/server";
import { demoTenant } from "@/lib/demo-data/v1";
import { sourceSnapshots } from "@/lib/evidence/sources";

export function GET() {
  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: demoTenant.id,
    generatedAt: new Date().toISOString(),
    data: sourceSnapshots,
  });
}
