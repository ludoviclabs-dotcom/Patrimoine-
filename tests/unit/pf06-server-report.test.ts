import { describe, expect, it } from "vitest";
import { can, listCapabilities } from "../../lib/auth/authorization";
import {
  managedPostgresMigrationMarker,
  managedPostgresRlsTables,
} from "../../lib/db/managed-readiness";
import {
  assertReportBlobKeyOwnedByTenant,
  buildReportVersionBlobKey,
} from "../../lib/documents/blob";
import { renderReportPdf } from "../../lib/report/render";
import {
  assembleReportSnapshot,
  blockingFlags,
  buildReportBusinessPayload,
  canonicalJson,
  hashBusinessPayload,
  hashSnapshot,
  reportGeneratorVersion,
  resolveWatermark,
  type ReportBusinessPayload,
  type ReportProfessionalValidationState,
  type ReportSnapshot,
  type ReportValidationBlock,
} from "../../lib/report/snapshot";

const tenantId = "11111111-1111-4111-8111-111111111111";
const foreignTenantId = "22222222-2222-4222-8222-222222222222";
const caseId = "33333333-3333-4333-8333-333333333333";
const reportId = "44444444-4444-4444-8444-444444444444";
const reportVersionId = "55555555-5555-4555-8555-555555555555";
const identityId = "66666666-6666-4666-8666-666666666666";
const runId = "77777777-7777-4777-8777-777777777771";

const signedReview: ReportProfessionalValidationState = {
  required: true,
  decision: "approved",
  reviewId: "review-1",
  reviewerUserId: "user-1",
  reviewedAt: "2026-08-18T10:00:00.000Z",
  summary: "Revue signée.",
  requiredActions: [],
};

function businessPayload(overrides: {
  confidenceStatus?: string;
  ruleStatus?: string;
  professionalValidation?: ReportProfessionalValidationState;
  coverageLimitIds?: string[];
} = {}): ReportBusinessPayload {
  return buildReportBusinessPayload({
    dossier: {
      tenantId,
      caseId,
      reference: "DOS-2026-001",
      title: "Dossier Claire et Marc",
      status: "review_required",
      fiscalYear: 2026,
    },
    legalFreezeDate: "2026-08-18",
    runs: [{
      id: runId,
      engineKey: "ifi",
      engineVersion: "3",
      scenario: "reference",
      status: "completed",
      professionalValidationRequired: true,
      inputSnapshot: { grossWealth: 1, netWealth: 2 },
      output: { taxDue: 1110000 },
      coverageLimitIds: overrides.coverageLimitIds ?? [],
      completedAt: "2026-08-18T09:00:00.000Z",
    }],
    ruleVersions: [{
      id: "rule-ifi-complete-2026-v3",
      ruleSet: "ifi",
      version: "IFI-2026.08-V3",
      title: "IFI 2026",
      status: overrides.ruleStatus ?? "active",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      sourceReference: "CGI art. 964 et suivants",
      evidenceSourceIds: ["src-legifrance-ifi"],
      checksumSha256: "a".repeat(64),
    }],
    calculationSteps: [{
      simulationRunId: runId,
      stepOrder: 1,
      label: "Base imposable IFI",
      inputValue: "1300000",
      formula: "actifs - dettes admises",
      outputValue: "1110000",
      ruleVersionId: "rule-ifi-complete-2026-v3",
      evidenceSourceId: "src-legifrance-ifi",
      confidenceStatus: overrides.confidenceStatus ?? "validated",
      displayStatus: "validated_calculation",
      coverageLimitIds: [],
      nextAction: null,
    }],
    evidenceSources: [{
      id: "src-legifrance-ifi",
      title: "CGI — IFI",
      authority: "LEGIFRANCE",
      url: "https://www.legifrance.gouv.fr/",
      legalScope: "ifi",
      reliability: "official",
      status: "verified",
      checkedAt: "2026-08-18T00:00:00.000Z",
    }],
    documentReferences: [{
      documentId: "88888888-8888-4888-8888-888888888881",
      documentVersionId: "88888888-8888-4888-8888-888888888882",
      versionNumber: 2,
      sha256: "b".repeat(64),
      byteSize: 2048,
      mimeType: "application/pdf",
      purpose: "supporting-evidence",
      simulationRunId: runId,
    }],
    professionalValidation: overrides.professionalValidation ?? signedReview,
    limitations: ["Analyse indicative."],
  });
}

function snapshotFor(
  business: ReportBusinessPayload,
  validation: ReportValidationBlock,
  generatedAt: string,
  versionNumber = 1,
): ReportSnapshot {
  return assembleReportSnapshot({
    business,
    validation,
    generation: {
      reportId,
      reportVersionId,
      versionNumber,
      generatedAt,
      generatedByIdentityId: identityId,
      generatorVersion: reportGeneratorVersion,
      watermark: resolveWatermark(validation.status),
    },
  });
}

const draftValidation: ReportValidationBlock = {
  status: "draft",
  decision: "pending",
  validatedByIdentityId: null,
  validatedAt: null,
  comment: null,
};

const approvedValidation: ReportValidationBlock = {
  status: "validated",
  decision: "approved",
  validatedByIdentityId: identityId,
  validatedAt: "2026-08-20T12:00:00.000Z",
  comment: "Conclusions vérifiées.",
};

describe("PF-06 canonical snapshot", () => {
  it("serialises structurally identical payloads identically", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, 4] } })).toBe(
      canonicalJson({ a: { c: [3, 4], d: 2 }, b: 1 }),
    );
    expect(canonicalJson({ a: undefined, b: 1 })).toBe(`{"b":1}`);
    expect(canonicalJson({ at: new Date("2026-08-20T00:00:00.000Z") })).toBe(
      `{"at":"2026-08-20T00:00:00.000Z"}`,
    );
  });

  it("produces the same business hash for the same facts in any row order", () => {
    expect(hashBusinessPayload(businessPayload())).toBe(hashBusinessPayload(businessPayload()));
    expect(hashBusinessPayload(businessPayload())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the business hash stable while the snapshot hash follows generation", () => {
    const business = businessPayload();
    const first = snapshotFor(business, draftValidation, "2026-08-20T09:00:00.000Z");
    const second = snapshotFor(business, draftValidation, "2026-08-20T11:00:00.000Z");

    expect(hashBusinessPayload(first.business)).toBe(hashBusinessPayload(second.business));
    expect(hashSnapshot(first)).not.toBe(hashSnapshot(second));
  });

  it("keeps the business content identical when a draft is validated", () => {
    const business = businessPayload();
    const draft = snapshotFor(business, draftValidation, "2026-08-20T09:00:00.000Z", 1);
    const validated = snapshotFor(business, approvedValidation, "2026-08-20T12:00:00.000Z", 2);

    expect(hashBusinessPayload(validated.business)).toBe(hashBusinessPayload(draft.business));
    expect(hashSnapshot(validated)).not.toBe(hashSnapshot(draft));
    expect(validated.generation.versionNumber).toBe(2);
  });

  it("captures every element the task requires in the snapshot", () => {
    const snapshot = snapshotFor(businessPayload(), draftValidation, "2026-08-20T09:00:00.000Z");

    expect(snapshot.business.dossier.reference).toBe("DOS-2026-001");
    expect(snapshot.business.legalFreezeDate).toBe("2026-08-18");
    expect(snapshot.business.runs[0].inputSnapshot).toEqual({ grossWealth: 1, netWealth: 2 });
    expect(snapshot.business.simulationRunIds).toEqual([runId]);
    expect(snapshot.business.ruleVersions.map((rule) => rule.id)).toEqual(["rule-ifi-complete-2026-v3"]);
    expect(snapshot.business.calculationSteps).toHaveLength(1);
    expect(snapshot.business.professionalValidation.decision).toBe("approved");
    expect(snapshot.business.documentReferences[0].sha256).toBe("b".repeat(64));
    expect(snapshot.generation.generatedAt).toBe("2026-08-20T09:00:00.000Z");
    expect(snapshot.generation.generatorVersion).toBe(reportGeneratorVersion);
  });
});

describe("PF-06 review flags and readiness", () => {
  it("reports no blocking flag on complete, validated, signed facts", () => {
    expect(blockingFlags(businessPayload())).toEqual([]);
  });

  it("blocks on an unvalidated calculation step", () => {
    const flags = blockingFlags(businessPayload({ confidenceStatus: "needs_review" }));
    expect(flags.map((flag) => flag.code)).toContain("calculation.step_not_validated");
  });

  it("blocks on an archived rule version", () => {
    const flags = blockingFlags(businessPayload({ ruleStatus: "archived" }));
    expect(flags.map((flag) => flag.code)).toContain("rule.version_not_active");
  });

  it("blocks when the required professional review is not signed", () => {
    const flags = blockingFlags(businessPayload({
      professionalValidation: { ...signedReview, decision: "pending", reviewedAt: null },
    }));
    expect(flags.map((flag) => flag.code)).toContain("review.professional_not_signed");
  });

  it("raises a non-blocking flag for declared coverage limits", () => {
    const business = businessPayload({ coverageLimitIds: ["coverage-ifi-demembrement-complexe"] });
    expect(blockingFlags(business)).toEqual([]);
    expect(business.reviewFlags.map((flag) => flag.code)).toContain("coverage.limit");
    expect(business.coverageLimitIds).toEqual(["coverage-ifi-demembrement-complexe"]);
  });
});

describe("PF-06 watermark policy", () => {
  it("watermarks anything that is not validated and never a validated report", () => {
    expect(resolveWatermark("draft")).toBe("BROUILLON — NON VALIDÉ");
    expect(resolveWatermark("changes_requested")).toBe("À REVOIR");
    expect(resolveWatermark("validated")).toBeNull();
  });
});

describe("PF-06 server rendering", () => {
  it("renders a real PDF from the snapshot, reproducibly", async () => {
    const snapshot = snapshotFor(businessPayload(), draftValidation, "2026-08-20T09:00:00.000Z");
    const first = await renderReportPdf(snapshot);
    const second = await renderReportPdf(snapshot);

    expect(Buffer.from(first.bytes.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(first.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(second.sha256).toBe(first.sha256);
  }, 60_000);

  it("produces a different binary for a validated version of the same business facts", async () => {
    const business = businessPayload();
    const draft = await renderReportPdf(
      snapshotFor(business, draftValidation, "2026-08-20T09:00:00.000Z", 1),
    );
    const validated = await renderReportPdf(
      snapshotFor(business, approvedValidation, "2026-08-20T12:00:00.000Z", 2),
    );

    expect(validated.sha256).not.toBe(draft.sha256);
  }, 60_000);
});

describe("PF-06 report object keys and authorization", () => {
  it("builds identifier-only report keys and refuses a foreign one", () => {
    const key = buildReportVersionBlobKey({ tenantId, reportId, reportVersionId });

    expect(key).toBe(`tenants/${tenantId}/reports/${reportId}/versions/${reportVersionId}`);
    expect(key).not.toMatch(/claire|marc|dos-2026|\.pdf/i);
    expect(assertReportBlobKeyOwnedByTenant(key, tenantId)).toMatchObject({ reportId });
    expect(() => assertReportBlobKeyOwnedByTenant(key, foreignTenantId))
      .toThrow("REPORT_BLOB_KEY_TENANT_MISMATCH");
    expect(() => assertReportBlobKeyOwnedByTenant("tenants/guessed", tenantId))
      .toThrow("REPORT_BLOB_KEY_INVALID");
    expect(() => buildReportVersionBlobKey({
      tenantId,
      reportId,
      reportVersionId: "rapport-claire-marc.pdf",
    })).toThrow("REPORT_BLOB_KEY_VERSION_INVALID");
  });

  it("restricts validation to expert-equivalent roles", () => {
    const resource = { tenantId, type: "report", id: reportId } as const;

    expect(can({ tenantId, role: "expert" }, "report.validate", resource)).toBe(true);
    expect(can({ tenantId, role: "admin" }, "report.validate", resource)).toBe(true);
    expect(can({ tenantId, role: "conseiller" }, "report.validate", resource)).toBe(false);
    expect(can({ tenantId, role: "auditeur" }, "report.validate", resource)).toBe(false);
    expect(can({ tenantId, role: "client" }, "report.validate", resource)).toBe(false);
    expect(can({ tenantId, role: "conseiller" }, "report.generate", resource)).toBe(true);
    expect(can({ tenantId, role: "client" }, "report.download", resource)).toBe(false);
    expect(listCapabilities("auditeur")).toContain("report.download");
  });

  it("declares the PF-06 migration marker and the reports table", () => {
    expect(managedPostgresMigrationMarker).toBe("0009_pf06_server_report_snapshot");
    expect(managedPostgresRlsTables).toEqual(expect.arrayContaining([
      "reports",
      "report_versions",
    ]));
  });
});
