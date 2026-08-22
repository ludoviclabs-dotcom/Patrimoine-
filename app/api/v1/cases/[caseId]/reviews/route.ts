import { NextResponse } from "next/server";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { documentErrorResponse } from "@/lib/documents/runtime";
import {
  createProfessionalReviewService,
  parseProfessionalReviewRequest,
} from "@/lib/review/review-service";

export const runtime = "nodejs";

/**
 * PF-07B — signs a professional review for one dossier.
 *
 * The whole authorization chain is the existing one: Clerk session → internal
 * tenant context → central capability matrix (`simulation.review`, held by
 * admin and expert only) → RLS transaction → append-only audit. Nothing here
 * decides authorization itself, and nothing here computes a fiscal result.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { caseId } = await context.params;
    const body = await request.json().catch(() => null);
    const input = parseProfessionalReviewRequest(body);

    if (!input) throw new Error("PROFESSIONAL_REVIEW_REQUEST_INVALID");

    const review = await createProfessionalReviewService()
      .sign(tenantContext, { ...input, caseId });

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    const { status, body } = documentErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const tenantContext = await requireClerkTenantContext();
    const { caseId } = await context.params;
    const reviews = await createProfessionalReviewService().list(tenantContext, caseId);

    return NextResponse.json({ data: reviews });
  } catch (error) {
    const { status, body } = documentErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
