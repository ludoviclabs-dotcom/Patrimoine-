import { NextResponse } from "next/server";
import { demoPersonas } from "@/lib/demo-data/personas";
import { demoTenant } from "@/lib/demo-data/v1";

export function GET() {
  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: demoTenant.id,
    generatedAt: new Date().toISOString(),
    data: demoPersonas,
  });
}
