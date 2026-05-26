import { NextResponse } from "next/server";
import { demoCases, demoProfessionalReviews, getDemoUser } from "@/lib/demo-data/v1";
import { canReviewCase } from "@/lib/security/access-control";

export function GET() {
  const expert = getDemoUser("expert");
  const reviews = demoProfessionalReviews.filter((review) => {
    const clientCase = demoCases.find((candidate) => candidate.id === review.caseId);
    return clientCase ? canReviewCase(expert, clientCase) : false;
  });

  return NextResponse.json({
    mode: "demo-fixtures",
    reviewerId: expert.id,
    reviews,
  });
}
