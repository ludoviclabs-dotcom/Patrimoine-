import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-data/v1";
import { getDemoRoleFromRequest } from "@/lib/security/access-control";
import { createDemoLiability } from "@/lib/workflow/case-workflow";

export async function POST(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    value?: number;
    linkedCategory?: "real-estate" | "company" | "personal";
  };

  const liability = createDemoLiability({
    label: body.label ?? "Dette demo",
    value: Number(body.value ?? 0),
    linkedCategory: body.linkedCategory ?? "real-estate",
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: liability,
  });
}
