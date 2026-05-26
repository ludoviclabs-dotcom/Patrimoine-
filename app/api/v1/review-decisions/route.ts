import { NextResponse } from "next/server";
import { getDemoUser } from "@/lib/demo-data/v1";
import { getDemoRoleFromRequest } from "@/lib/security/access-control";
import { decideProfessionalReview } from "@/lib/workflow/case-workflow";
import type { ReviewDecision } from "@/lib/types";

export async function POST(request: Request) {
  const user = getDemoUser(getDemoRoleFromRequest(request) === "admin" ? "admin" : "expert");
  const body = (await request.json().catch(() => ({}))) as {
    reviewId?: string;
    decision?: ReviewDecision;
    summary?: string;
  };

  const review = decideProfessionalReview({
    reviewId: body.reviewId,
    decision: body.decision ?? "changes_requested",
    summary: body.summary ?? "Decision de revue demo enregistree.",
    user,
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    generatedAt: new Date().toISOString(),
    data: review,
  });
}
