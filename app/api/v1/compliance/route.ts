import { NextResponse } from "next/server";
import { aiGovernanceChecklist, dpiaSummary, processingRegister, retentionPolicy } from "@/lib/compliance/registry";

export function GET() {
  return NextResponse.json({
    processingRegister,
    dpiaSummary,
    retentionPolicy,
    aiGovernanceChecklist,
  });
}
