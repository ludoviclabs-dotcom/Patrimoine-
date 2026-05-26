import { NextResponse } from "next/server";
import { demoCases, getDemoUser } from "@/lib/demo-data/v1";
import { filterByTenant } from "@/lib/security/access-control";

export function GET() {
  const user = getDemoUser("conseiller");
  const cases = filterByTenant(demoCases, user.tenantId);

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    cases,
  });
}
