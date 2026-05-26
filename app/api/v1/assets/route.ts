import { NextResponse } from "next/server";
import { createDemoAsset } from "@/lib/workflow/case-workflow";
import { getDemoRoleFromRequest } from "@/lib/security/access-control";
import { getDemoUser } from "@/lib/demo-data/v1";
import type { AssetCategory } from "@/lib/types";

export async function POST(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request));
  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    category?: AssetCategory;
    value?: number;
  };

  const asset = createDemoAsset({
    label: body.label ?? "Actif demo",
    category: body.category ?? "financial",
    value: Number(body.value ?? 0),
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: asset,
  });
}
