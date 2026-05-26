import { NextResponse } from "next/server";
import { demoTenant } from "@/lib/demo-data/v1";
import { generateReportVersion } from "@/lib/workflow/case-workflow";

export async function POST() {
  const reportVersion = generateReportVersion();

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: demoTenant.id,
    generatedAt: new Date().toISOString(),
    data: reportVersion,
  });
}
