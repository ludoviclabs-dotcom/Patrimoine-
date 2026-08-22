import { and, desc, eq } from "drizzle-orm";
import { withAuthorizedTenantTransaction } from "../auth/authorization";
import { getDatabase } from "../db/client";
import { auditLogs, clientCases, professionalReviews } from "../db/schema";
import type { TenantContext } from "../tenancy/tenant-context";

/**
 * PF-07B — signing a professional review.
 *
 * PF-06 already made an unsigned review a blocking flag on the readiness gate,
 * but exposed no way to sign one: the PostgreSQL suite signed it with raw SQL
 * and the E2E fixture pre-seeded it as approved. This is the missing server
 * action, and it is deliberately the *only* new capability surface — the
 * decision is recorded through the same authorization boundary, the same RLS
 * transaction and the same append-only audit table as every other PF-04+ write.
 *
 * It computes nothing fiscal. It records a human decision about work the
 * deterministic engine already produced, and never rewrites a historical
 * result: a decision appends a row, so the dossier keeps its full review
 * history and PF-06 reads the newest one.
 */

type Database = ReturnType<typeof getDatabase>;

/**
 * Only the two decisions the cabinet journey actually needs. `pending` is the
 * initial state, not something a professional signs, and `rejected` would be a
 * third workflow with its own consequences — neither is invented here.
 */
export const professionalReviewDecisions = ["approved", "changes_requested"] as const;
export type ProfessionalReviewDecision = (typeof professionalReviewDecisions)[number];

export type SignProfessionalReviewInput = Readonly<{
  caseId: string;
  decision: ProfessionalReviewDecision;
  comment: string;
  requiredActions?: readonly string[];
}>;

export type ProfessionalReviewRecord = Readonly<{
  id: string;
  caseId: string;
  decision: string;
  summary: string;
  requiredActions: readonly string[];
  reviewedAt: string | null;
  reviewerIdentityId: string | null;
  signedByRole: string | null;
  createdAt: string;
}>;

function isDecision(value: unknown): value is ProfessionalReviewDecision {
  return typeof value === "string"
    && (professionalReviewDecisions as readonly string[]).includes(value);
}

export function parseProfessionalReviewRequest(body: unknown): SignProfessionalReviewInput | null {
  if (typeof body !== "object" || body === null) return null;
  const payload = body as Record<string, unknown>;

  if (!isDecision(payload.decision)) return null;
  if (typeof payload.comment !== "string") return null;

  const requiredActions = Array.isArray(payload.requiredActions)
    ? payload.requiredActions.filter((entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0)
    : [];

  return {
    caseId: typeof payload.caseId === "string" ? payload.caseId : "",
    decision: payload.decision,
    comment: payload.comment,
    requiredActions,
  };
}

function serialise(row: typeof professionalReviews.$inferSelect): ProfessionalReviewRecord {
  return {
    id: row.id,
    caseId: row.caseId,
    decision: row.decision,
    summary: row.summary,
    requiredActions: row.requiredActions ?? [],
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reviewerIdentityId: row.reviewerIdentityId,
    signedByRole: row.signedByRole,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createProfessionalReviewService(options: {
  database?: Database;
  now?: () => Date;
} = {}) {
  const database = options.database ?? getDatabase();
  const now = options.now ?? (() => new Date());

  return {
    /**
     * Records a signed decision. `simulation.review` is held by admin and
     * expert only, so a conseiller, a client and an auditeur are all refused
     * by the central matrix — and the denial is audited before the transaction
     * fails closed.
     */
    async sign(context: TenantContext, input: SignProfessionalReviewInput) {
      const comment = input.comment.trim();
      // A professional decision is always motivated. An empty comment is
      // refused before any authorization work, so nothing is written.
      if (!comment) throw new Error("PROFESSIONAL_REVIEW_COMMENT_REQUIRED");
      if (!isDecision(input.decision)) throw new Error("PROFESSIONAL_REVIEW_DECISION_INVALID");
      if (!input.caseId) throw new Error("PROFESSIONAL_REVIEW_REQUEST_INVALID");

      return await withAuthorizedTenantTransaction(
        database,
        context,
        "simulation.review",
        { tenantId: context.tenantId, type: "dossier", id: input.caseId },
        async (transaction) => {
          // RLS already hides another cabinet's dossier; this turns an
          // invisible row into a named refusal instead of a silent no-op.
          const [dossier] = await transaction
            .select({ id: clientCases.id })
            .from(clientCases)
            .where(and(
              eq(clientCases.tenantId, context.tenantId),
              eq(clientCases.id, input.caseId),
            ))
            .limit(1);

          if (!dossier) throw new Error("DOSSIER_NOT_FOUND");

          const decidedAt = now();
          const [review] = await transaction
            .insert(professionalReviews)
            .values({
              tenantId: context.tenantId,
              caseId: input.caseId,
              // The identity model, not the legacy users table. Legacy rows
              // keep their reviewer_user_id; new signatures carry neither a
              // guessed user row nor an anonymous reviewer.
              reviewerIdentityId: context.identityId,
              signedByRole: context.role,
              decision: input.decision,
              summary: comment,
              requiredActions: [...(input.requiredActions ?? [])],
              reviewedAt: decidedAt,
            })
            .returning();

          await transaction.insert(auditLogs).values({
            tenantId: context.tenantId,
            actorIdentityId: context.identityId,
            action: "review.decided",
            entityType: "dossier",
            entityId: input.caseId,
            summary: "Revue professionnelle signée.",
            correlationId: context.correlationId,
            // The decision and the signing role are traceable; the comment is
            // not duplicated here, it lives on the review row itself.
            metadata: { decision: input.decision, role: context.role, reviewId: review.id },
          });

          return serialise(review);
        },
      );
    },

    /** The decision PF-06 reads: newest first, scoped to the tenant. */
    list(context: TenantContext, caseId: string) {
      return withAuthorizedTenantTransaction(
        database,
        context,
        "dossier.read",
        { tenantId: context.tenantId, type: "dossier", id: caseId },
        async (transaction) => {
          const rows = await transaction
            .select()
            .from(professionalReviews)
            .where(and(
              eq(professionalReviews.tenantId, context.tenantId),
              eq(professionalReviews.caseId, caseId),
            ))
            .orderBy(desc(professionalReviews.createdAt));

          return rows.map(serialise);
        },
      );
    },
  };
}
