import { describe, expect, it } from "vitest";
import { buildCabinetJourney, cabinetJourneyStepKeys } from "../../lib/cabinet/journey";
import { buildBlockers, type ReportConsoleState } from "../../lib/report/report-console";
import type { ReportReadiness } from "../../lib/report/report-service";

/**
 * PF-07 — the journey must be read from facts, never decorative.
 *
 * The product already had a stepper whose position was a hardcoded constant,
 * identical for every dossier. These cases pin the property that replaced it:
 * each stage reports what the stored facts actually say, a blocker is
 * distinguishable from a vigilance point, and the next action is always named.
 */

const dossier = {
  id: "44444444-4444-4444-8444-444444444444",
  reference: "DOS-CLAIRE-MARC-2026",
  title: "Claire et Marc",
  status: "review_required",
  fiscalYear: 2026,
};

function readiness(overrides: Partial<ReportReadiness> = {}): ReportReadiness {
  return {
    business: {} as ReportReadiness["business"],
    businessSha256: "a".repeat(64),
    blockingFlags: [],
    reviewFlags: [],
    evidenceCount: 2,
    simulationRunIds: ["run-1"],
    professionalReviewSigned: true,
    canValidateFinal: true,
    ...overrides,
  };
}

function consoleState(overrides: Partial<ReportConsoleState> = {}): ReportConsoleState {
  const base: ReportConsoleState = {
    role: "conseiller",
    capabilities: { generate: true, validate: false, download: true, signReview: false },
    reviews: [],
    dossiers: [dossier],
    selectedDossier: dossier,
    runs: [],
    selectedRunIds: ["run-1"],
    legalFreezeDate: "2026-08-18",
    versions: [],
    currentVersion: null,
    freshness: null,
    readiness: readiness(),
    blockers: [],
    storageConfigured: true,
    ...overrides,
  };

  return base;
}

function stepState(state: ReportConsoleState, key: string) {
  return buildCabinetJourney(state).steps.find((step) => step.key === key);
}

describe("PF-07 — cabinet journey", () => {
  it("exposes the six declared stages, in order", () => {
    const journey = buildCabinetJourney(consoleState());
    expect(journey.steps.map((step) => step.key)).toEqual([...cabinetJourneyStepKeys]);
  });

  it("names the dossier the professional is working in", () => {
    const journey = buildCabinetJourney(consoleState());
    expect(journey.dossierReference).toBe("DOS-CLAIRE-MARC-2026");
    expect(stepState(consoleState(), "qualification")?.detail).toContain("2026");
  });

  it("blocks the hypotheses stage when the legal freeze date is missing", () => {
    const step = stepState(consoleState({ legalFreezeDate: null }), "hypotheses");
    expect(step?.state).toBe("blocked");
    expect(step?.code).toBe("REPORT_LEGAL_FREEZE_DATE_REQUIRED");
    expect(step?.nextAction).toMatch(/AAAA-MM-JJ/);
  });

  it("blocks the simulation stage when no run is retained", () => {
    const step = stepState(consoleState({ selectedRunIds: [] }), "simulation");
    expect(step?.state).toBe("blocked");
    expect(step?.code).toBe("REPORT_SIMULATION_RUN_REQUIRED");
  });

  it("blocks the simulation stage on an unvalidated calculation step", () => {
    const step = stepState(
      consoleState({
        readiness: readiness({
          blockingFlags: [{
            code: "calculation.step_not_validated",
            severity: "blocking",
            detail: "Une étape reste indicative.",
          }],
        }),
      }),
      "simulation",
    );

    expect(step?.state).toBe("blocked");
    expect(step?.code).toBe("calculation.step_not_validated");
  });

  it("treats missing evidence as vigilance, not as a stop", () => {
    const state = consoleState({ readiness: readiness({ evidenceCount: 0 }) });
    const step = stepState(state, "preuves");

    expect(step?.state).toBe("review");
    expect(step?.code).toBe("REPORT_EVIDENCE_MISSING");
    // A vigilance point is reported but never becomes the next thing blocking.
    expect(buildCabinetJourney(state).blockingCount).toBe(0);
    expect(buildCabinetJourney(state).reviewCount).toBe(1);
  });

  it("blocks the review stage until the professional review is signed", () => {
    const state = consoleState({ readiness: readiness({ professionalReviewSigned: false }) });
    const step = stepState(state, "revue");

    expect(step?.state).toBe("blocked");
    expect(step?.code).toBe("review.professional_not_signed");
    expect(buildCabinetJourney(state).activeStep).toBe("revue");
    expect(buildCabinetJourney(state).nextAction).toMatch(/signer|habilité/i);
  });

  it("marks a draft report as in progress, never as finished", () => {
    const step = stepState(
      consoleState({
        currentVersion: {
          reportId: "r1",
          reportVersionId: "v1",
          versionNumber: 1,
          status: "draft",
          decision: "pending",
          watermark: "BROUILLON — NON VALIDÉ",
          snapshotSha256: "s".repeat(64),
          businessSha256: "b".repeat(64),
          pdfSha256: "p".repeat(64),
          pdfByteSize: 11058,
          generatedAt: "2026-08-21T09:00:00.000Z",
          blockingFlagCount: 0,
        },
      }),
      "rapport",
    );

    expect(step?.state).toBe("active");
    expect(step?.detail).toMatch(/brouillon/i);
    expect(step?.detail).toMatch(/filigran/i);
  });

  it("marks a validated and current report as finished", () => {
    const journey = buildCabinetJourney(consoleState({
      currentVersion: {
        reportId: "r1",
        reportVersionId: "v3",
        versionNumber: 3,
        status: "validated",
        decision: "approved",
        watermark: null,
        snapshotSha256: "s".repeat(64),
        businessSha256: "b".repeat(64),
        pdfSha256: "p".repeat(64),
        pdfByteSize: 10603,
        generatedAt: "2026-08-21T10:00:00.000Z",
        blockingFlagCount: 0,
      },
      freshness: {
        reportVersionId: "v3",
        status: "current",
        snapshotBusinessSha256: "b".repeat(64),
        currentBusinessSha256: "b".repeat(64),
        changedSections: [],
        reasonCode: null,
        reason: null,
      },
    }));

    expect(journey.steps.every((step) => step.state === "done")).toBe(true);
    expect(journey.blockingCount).toBe(0);
    expect(journey.activeStep).toBeNull();
  });

  it("reopens the report stage when the delivered version went stale", () => {
    const state = consoleState({
      currentVersion: {
        reportId: "r1",
        reportVersionId: "v1",
        versionNumber: 1,
        status: "validated",
        decision: "approved",
        watermark: null,
        snapshotSha256: "s".repeat(64),
        businessSha256: "b".repeat(64),
        pdfSha256: "p".repeat(64),
        pdfByteSize: 10603,
        generatedAt: "2026-08-21T10:00:00.000Z",
        blockingFlagCount: 0,
      },
      freshness: {
        reportVersionId: "v1",
        status: "outdated",
        snapshotBusinessSha256: "b".repeat(64),
        currentBusinessSha256: "c".repeat(64),
        changedSections: ["reviewFlags"],
        reasonCode: "REPORT_REGENERATION_REQUIRED",
        reason: "Les faits du dossier ont changé.",
      },
    });

    const step = stepState(state, "rapport");
    expect(step?.state).toBe("blocked");
    expect(step?.code).toBe("REPORT_REGENERATION_REQUIRED");
    // Regenerating is the remedy; the delivered PDF is never rewritten.
    expect(step?.nextAction).toMatch(/[Rr]égénérez/);
  });

  it("refuses to fall back to another dossier when one is out of scope", () => {
    const state = consoleState({
      selectedDossier: null,
      blockers: buildBlockers({
        legalFreezeDate: null,
        selectedRunIds: [],
        readiness: null,
        readinessErrorCode: null,
        freshness: null,
        storageConfigured: true,
        downloadSecretConfigured: true,
        requestedDossierOutOfScope: true,
      }),
      readiness: null,
    });

    const step = stepState(state, "qualification");
    expect(step?.state).toBe("blocked");
    expect(step?.code).toBe("REPORT_DOSSIER_NOT_ACCESSIBLE");
    expect(buildCabinetJourney(state).dossierReference).toBeNull();
  });

  it("always names a next action while anything remains open", () => {
    for (const state of [
      consoleState({ legalFreezeDate: null }),
      consoleState({ selectedRunIds: [] }),
      consoleState({ readiness: readiness({ professionalReviewSigned: false }) }),
      consoleState(),
    ]) {
      const journey = buildCabinetJourney(state);
      if (journey.activeStep) expect(journey.nextAction ?? "").not.toBe("");
    }
  });

  it("reports the first genuine stop, not the first vigilance point", () => {
    const journey = buildCabinetJourney(consoleState({
      readiness: readiness({ evidenceCount: 0, professionalReviewSigned: false }),
    }));

    expect(journey.activeStep).toBe("revue");
    expect(journey.nextActionCode).toBe("review.professional_not_signed");
  });
});
