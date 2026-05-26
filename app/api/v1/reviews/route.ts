import { NextResponse } from "next/server";
import { demoCases, demoProfessionalReviews, getDemoUser } from "@/lib/demo-data/v1";
import { canReviewCase, getDemoRoleFromRequest } from "@/lib/security/access-control";

export function GET(request: Request) {
  const expert = getDemoUser(getDemoRoleFromRequest(request) === "admin" ? "admin" : "expert");
  const reviews = demoProfessionalReviews.filter((review) => {
    const clientCase = demoCases.find((candidate) => candidate.id === review.caseId);
    return clientCase ? canReviewCase(expert, clientCase) : false;
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    tenantId: expert.tenantId,
    generatedAt: new Date().toISOString(),
    reviewerId: expert.id,
    data: reviews,
  });
}
