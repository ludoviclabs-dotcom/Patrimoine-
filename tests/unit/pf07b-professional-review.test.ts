import { describe, expect, it } from "vitest";
import { can, listCapabilities } from "../../lib/auth/authorization";
import { describeError } from "../../lib/errors/error-catalog";
import {
  parseProfessionalReviewRequest,
  professionalReviewDecisions,
} from "../../lib/review/review-service";

/**
 * PF-07B — the contract around signing a professional review.
 *
 * The PostgreSQL suite proves the behaviour against a real cluster. These
 * cases pin the parts that must not drift silently: which roles may sign,
 * which decisions exist, and that a request is never accepted without a
 * motive.
 */

const tenantId = "11111111-1111-4111-8111-111111111111";
const resource = { tenantId, type: "dossier" } as const;

describe("PF-07B — who may sign a professional review", () => {
  it("allows exactly the professional roles the model already defines", () => {
    expect(can({ tenantId, role: "expert" }, "simulation.review", resource)).toBe(true);
    expect(can({ tenantId, role: "admin" }, "simulation.review", resource)).toBe(true);
  });

  it("refuses a conseiller, a client and an auditeur", () => {
    for (const role of ["conseiller", "client", "auditeur"] as const) {
      expect(can({ tenantId, role }, "simulation.review", resource), role).toBe(false);
    }
  });

  it("refuses a signer from another cabinet whatever their role", () => {
    for (const role of ["admin", "expert"] as const) {
      expect(
        can({ tenantId: "b0000000-0000-4000-8000-000000000000", role }, "simulation.review", resource),
        role,
      ).toBe(false);
    }
  });

  it("keeps signing and validating as two distinct capabilities", () => {
    // An expert holds both; a conseiller holds neither. Signing a review is
    // never implied by being able to generate a report.
    expect(listCapabilities("conseiller")).not.toContain("simulation.review");
    expect(listCapabilities("conseiller")).not.toContain("report.validate");
    expect(listCapabilities("expert")).toContain("simulation.review");
    expect(listCapabilities("expert")).toContain("report.validate");
  });
});

describe("PF-07B — the decision contract", () => {
  it("offers only the two decisions the journey needs", () => {
    expect([...professionalReviewDecisions]).toEqual(["approved", "changes_requested"]);
  });

  it("refuses a decision outside that set, including the enum's other values", () => {
    for (const decision of ["pending", "rejected", "APPROVED", "", "yes"]) {
      expect(parseProfessionalReviewRequest({ decision, comment: "Motif." }), decision).toBeNull();
    }
  });

  it("accepts an approval carrying a motive", () => {
    const parsed = parseProfessionalReviewRequest({
      decision: "approved",
      comment: "Conclusions vérifiées.",
    });

    expect(parsed?.decision).toBe("approved");
    expect(parsed?.comment).toBe("Conclusions vérifiées.");
    expect(parsed?.requiredActions).toEqual([]);
  });

  it("keeps only usable required actions", () => {
    const parsed = parseProfessionalReviewRequest({
      decision: "changes_requested",
      comment: "Compléter le dossier.",
      requiredActions: ["Fournir le tableau", "   ", 42, null, "Justifier la dette"],
    });

    expect(parsed?.requiredActions).toEqual(["Fournir le tableau", "Justifier la dette"]);
  });

  it("refuses a request with no comment field at all", () => {
    expect(parseProfessionalReviewRequest({ decision: "approved" })).toBeNull();
    expect(parseProfessionalReviewRequest({ decision: "approved", comment: 12 })).toBeNull();
    expect(parseProfessionalReviewRequest(null)).toBeNull();
    expect(parseProfessionalReviewRequest("approved")).toBeNull();
  });
});

describe("PF-07B — refusals stay explainable", () => {
  it("gives each review failure a title, an explanation and a next action", () => {
    for (const code of [
      "PROFESSIONAL_REVIEW_COMMENT_REQUIRED",
      "PROFESSIONAL_REVIEW_DECISION_INVALID",
      "PROFESSIONAL_REVIEW_REQUEST_INVALID",
    ]) {
      const descriptor = describeError(code);
      expect(descriptor.title, code).not.toBe("Action impossible");
      expect(descriptor.explanation.trim(), code).not.toBe("");
      expect(descriptor.nextAction.trim(), code).not.toBe("");
    }
  });

  it("points an unsigned review at the screen that can now sign it", () => {
    const descriptor = describeError("review.professional_not_signed");
    expect(descriptor.nextAction).toMatch(/Revue/);
    expect(descriptor.severity).toBe("blocking");
  });
});
