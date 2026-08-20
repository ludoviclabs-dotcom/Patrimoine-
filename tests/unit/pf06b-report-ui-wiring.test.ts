import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { can } from "../../lib/auth/authorization";
import {
  buildBlockers,
  describeUnavailable,
  isPrivateStorageConfigured,
  isServerPipelineEnabled,
} from "../../lib/report/report-console";
import {
  describeChangedSections,
  diffBusinessPayloads,
  evaluateFreshness,
} from "../../lib/report/freshness";
import {
  buildReportBusinessPayload,
  hashBusinessPayload,
  type ReportBusinessPayload,
} from "../../lib/report/snapshot";

const root = join(process.cwd());
const tenantId = "11111111-1111-4111-8111-111111111111";
const caseId = "33333333-3333-4333-8333-333333333333";
const runId = "77777777-7777-4777-8777-777777777771";

function businessPayload(overrides: {
  legalFreezeDate?: string;
  confidenceStatus?: string;
  reviewDecision?: string;
  documentSha?: string | null;
  runIds?: string[];
} = {}): ReportBusinessPayload {
  const runIds = overrides.runIds ?? [runId];

  return buildReportBusinessPayload({
    dossier: {
      tenantId,
      caseId,
      reference: "DOS-2026-001",
      title: "Dossier Claire et Marc",
      status: "review_required",
      fiscalYear: 2026,
    },
    legalFreezeDate: overrides.legalFreezeDate ?? "2026-08-18",
    runs: runIds.map((id) => ({
      id,
      engineKey: "ifi",
      engineVersion: "3",
      scenario: "reference",
      status: "completed",
      professionalValidationRequired: true,
      inputSnapshot: { netWealth: 1110000 },
      output: { taxDue: 1445 },
      coverageLimitIds: [],
      completedAt: "2026-08-18T09:00:00.000Z",
    })),
    ruleVersions: [{
      id: "rule-ifi-2026-v3",
      ruleSet: "ifi",
      version: "IFI-2026.08-V3",
      title: "IFI 2026",
      status: "active",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      sourceReference: "CGI art. 964",
      evidenceSourceIds: ["src-ifi"],
      checksumSha256: "a".repeat(64),
    }],
    calculationSteps: runIds.map((id) => ({
      simulationRunId: id,
      stepOrder: 1,
      label: "Base imposable IFI",
      inputValue: "2400000",
      formula: "actifs - dettes",
      outputValue: "1110000",
      ruleVersionId: "rule-ifi-2026-v3",
      evidenceSourceId: "src-ifi",
      confidenceStatus: overrides.confidenceStatus ?? "validated",
      displayStatus: "validated_calculation",
      coverageLimitIds: [],
      nextAction: null,
    })),
    evidenceSources: [{
      id: "src-ifi",
      title: "CGI — IFI",
      authority: "LEGIFRANCE",
      url: "https://www.legifrance.gouv.fr/",
      legalScope: "ifi",
      reliability: "official",
      status: "verified",
      checkedAt: "2026-08-18T00:00:00.000Z",
    }],
    documentReferences: overrides.documentSha === null ? [] : [{
      documentId: "88888888-8888-4888-8888-888888888881",
      documentVersionId: "88888888-8888-4888-8888-888888888882",
      versionNumber: 1,
      sha256: overrides.documentSha ?? "b".repeat(64),
      byteSize: 2048,
      mimeType: "application/pdf",
      purpose: "supporting-evidence",
      simulationRunId: runIds[0],
    }],
    professionalValidation: {
      required: true,
      decision: overrides.reviewDecision ?? "approved",
      reviewId: "review-1",
      reviewerUserId: "user-1",
      reviewedAt: "2026-08-18T10:00:00.000Z",
      summary: "Revue signée.",
      requiredActions: [],
    },
    limitations: ["Analyse indicative."],
  });
}

describe("PF-06B staleness detection", () => {
  it("reports an unchanged dossier as current", () => {
    const freshness = evaluateFreshness({
      reportVersionId: "version-1",
      snapshotBusiness: businessPayload(),
      currentBusiness: businessPayload(),
    });

    expect(freshness.status).toBe("current");
    expect(freshness.changedSections).toEqual([]);
    expect(freshness.currentBusinessSha256).toBe(freshness.snapshotBusinessSha256);
  });

  it.each([
    ["a new simulation selection", { runIds: [runId, "77777777-7777-4777-8777-777777777772"] }, "runs"],
    ["a new professional validation", { reviewDecision: "pending" }, "professionalValidation"],
    ["a changed document version", { documentSha: "c".repeat(64) }, "documentReferences"],
    ["changed business data", { confidenceStatus: "needs_review" }, "calculationSteps"],
  ])("declares the report outdated after %s", (_label, overrides, expectedSection) => {
    const freshness = evaluateFreshness({
      reportVersionId: "version-1",
      snapshotBusiness: businessPayload(),
      currentBusiness: businessPayload(overrides),
    });

    expect(freshness.status).toBe("outdated");
    expect(freshness.reasonCode).toBe("REPORT_REGENERATION_REQUIRED");
    expect(freshness.changedSections).toContain(expectedSection);
    expect(freshness.reason).toContain("changé");
  });

  it("treats unreadable facts as outdated rather than silently current", () => {
    const freshness = evaluateFreshness({
      reportVersionId: "version-1",
      snapshotBusiness: businessPayload(),
      currentBusiness: null,
      unreadableReasonCode: "SIMULATION_RUN_NOT_FOUND",
    });

    expect(freshness.status).toBe("outdated");
    expect(freshness.reasonCode).toBe("SIMULATION_RUN_NOT_FOUND");
    expect(freshness.currentBusinessSha256).toBeNull();
  });

  it("names the sections that moved, in human terms", () => {
    const sections = diffBusinessPayloads(
      businessPayload(),
      businessPayload({ legalFreezeDate: "2026-01-01" }),
    );

    expect(sections).toContain("legalFreezeDate");
    expect(describeChangedSections(sections)).toContain("date de gel juridique");
    expect(describeChangedSections([])).toBeNull();
  });

  it("keeps the business hash the only staleness criterion", () => {
    expect(hashBusinessPayload(businessPayload())).toBe(hashBusinessPayload(businessPayload()));
    expect(hashBusinessPayload(businessPayload({ documentSha: "c".repeat(64) })))
      .not.toBe(hashBusinessPayload(businessPayload()));
  });
});

describe("PF-06B explicit blocker surface", () => {
  const configured = { storageConfigured: true, downloadSecretConfigured: true };

  it("names a missing legal freeze date and an empty run selection", () => {
    const blockers = buildBlockers({
      legalFreezeDate: null,
      selectedRunIds: [],
      readiness: null,
      readinessErrorCode: null,
      freshness: null,
      ...configured,
    });

    expect(blockers.map((blocker) => blocker.code)).toEqual([
      "REPORT_LEGAL_FREEZE_DATE_REQUIRED",
      "REPORT_SIMULATION_RUN_REQUIRED",
    ]);
    expect(blockers.every((blocker) => blocker.severity === "blocking")).toBe(true);
  });

  it("surfaces an unsigned review, a missing evidence set and a stale report", () => {
    const business = businessPayload({ reviewDecision: "pending", documentSha: null });
    const blockers = buildBlockers({
      legalFreezeDate: "2026-08-18",
      selectedRunIds: [runId],
      readiness: {
        business,
        businessSha256: hashBusinessPayload(business),
        blockingFlags: business.reviewFlags.filter((flag) => flag.severity === "blocking"),
        reviewFlags: business.reviewFlags.filter((flag) => flag.severity !== "blocking"),
        evidenceCount: 0,
        simulationRunIds: [runId],
        professionalReviewSigned: false,
        canValidateFinal: false,
      },
      readinessErrorCode: null,
      freshness: {
        reportVersionId: "version-1",
        status: "outdated",
        snapshotBusinessSha256: "a".repeat(64),
        currentBusinessSha256: "b".repeat(64),
        changedSections: ["calculationSteps"],
        reasonCode: "REPORT_REGENERATION_REQUIRED",
        reason: "Le dossier a changé depuis la génération : étapes de calcul.",
      },
      ...configured,
    });

    const codes = blockers.map((blocker) => blocker.code);
    expect(codes).toContain("review.professional_not_signed");
    expect(codes).toContain("REPORT_EVIDENCE_MISSING");
    expect(codes).toContain("REPORT_REGENERATION_REQUIRED");
    expect(blockers.find((blocker) => blocker.code === "REPORT_EVIDENCE_MISSING")?.severity)
      .toBe("review");
  });

  it("surfaces unreadable facts and missing private storage configuration", () => {
    const blockers = buildBlockers({
      legalFreezeDate: "2026-08-18",
      selectedRunIds: [runId],
      readiness: null,
      readinessErrorCode: "DOSSIER_NOT_FOUND",
      freshness: null,
      storageConfigured: false,
      downloadSecretConfigured: false,
    });

    const codes = blockers.map((blocker) => blocker.code);
    expect(codes).toContain("DOSSIER_NOT_FOUND");
    expect(codes).toContain("BLOB_READ_WRITE_TOKEN_REQUIRED");
    expect(codes).toContain("DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED");
    expect(blockers.every((blocker) => blocker.code && blocker.detail)).toBe(true);
  });

  it("refuses a dossier outside the tenant scope without falling back", () => {
    const blockers = buildBlockers({
      legalFreezeDate: null,
      selectedRunIds: [],
      readiness: null,
      readinessErrorCode: null,
      freshness: null,
      requestedDossierOutOfScope: true,
      ...configured,
    });

    expect(blockers[0]).toMatchObject({
      code: "REPORT_DOSSIER_NOT_ACCESSIBLE",
      severity: "blocking",
    });
  });

  it("describes every unavailability with its own code, never a generic toast", () => {
    for (const code of [
      "PERSISTENCE_MODE_FIXTURE",
      "CLERK_SESSION_REQUIRED",
      "CLERK_ORGANIZATION_REQUIRED",
      "CLERK_TENANT_CONTEXT_DENIED",
      "TENANT_MEMBERSHIP_REQUIRED",
      "TENANT_AUTHORIZATION_DENIED",
    ]) {
      const described = describeUnavailable(code);
      expect(described).toMatchObject({ available: false, code });
      expect(described.title.length).toBeGreaterThan(0);
      expect(described.detail.length).toBeGreaterThan(0);
    }

    expect(describeUnavailable("SOMETHING_UNEXPECTED").code).toBe("SOMETHING_UNEXPECTED");
  });

  it("gates the console on explicit runtime configuration", () => {
    expect(isServerPipelineEnabled({ PERSISTENCE_MODE: "FIXTURE" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isServerPipelineEnabled({
      PERSISTENCE_MODE: "DATABASE",
      DATABASE_URL: "postgres://example",
    } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isPrivateStorageConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(isPrivateStorageConfigured({ BLOB_READ_WRITE_TOKEN: " " } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isPrivateStorageConfigured({ BLOB_READ_WRITE_TOKEN: "token" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("PF-06B user-facing report flow", () => {
  const page = readFileSync(join(root, "app/report/page.tsx"), "utf8");
  const consoleComponent = readFileSync(
    join(root, "components/report/server-report-console.tsx"),
    "utf8",
  );
  const printButton = readFileSync(join(root, "components/report-print-button.tsx"), "utf8");

  it("makes the server pipeline the primary path on the existing report page", () => {
    expect(page).toContain("ServerReportConsole");
    expect(page).toContain("requireClerkTenantContext");
    expect(page).toContain("loadReportConsole");
  });

  it("keeps the browser rendering only as an explicitly non-final preview", () => {
    expect(page).toContain("Aperçu de travail — NON FINAL");
    expect(page).toMatch(/jamais le rapport cabinet/);
    expect(printButton).toContain("non final");
  });

  it("drives every action through the audited server routes", () => {
    expect(consoleComponent).toContain("/api/v1/reports/cases/");
    expect(consoleComponent).toContain("/versions");
    expect(consoleComponent).toContain("/validation");
    expect(consoleComponent).toContain("/download");
    expect(consoleComponent).not.toMatch(/@react-pdf\/renderer/);
  });

  it("shows the draft watermark and the validated evidence block", () => {
    expect(consoleComponent).toContain("BROUILLON — NON VALIDÉ");
    expect(consoleComponent).toContain("Empreinte snapshot");
    expect(consoleComponent).toContain("Empreinte PDF");
    expect(consoleComponent).toContain("Régénérer un brouillon");
  });

  it("offers validation only to roles the server would accept", () => {
    expect(consoleComponent).toContain("state.capabilities.validate");

    for (const role of ["client", "conseiller", "auditeur"] as const) {
      expect(can({ tenantId, role }, "report.validate", { tenantId, type: "report" })).toBe(false);
    }
    for (const role of ["admin", "expert"] as const) {
      expect(can({ tenantId, role }, "report.validate", { tenantId, type: "report" })).toBe(true);
    }
  });
});
