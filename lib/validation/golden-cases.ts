import { appendAuditEventToRepository } from "../audit/repository";
import { demoTenant } from "../demo-data/v1";
import { getV2TaxRuns } from "../tax/v2-engines";
import type { GoldenCase, TaxRun, ValidationStatus } from "../types";

function caseFromRun(run: TaxRun, expected: GoldenCase["expected"], reviewer: GoldenCase["reviewer"]): GoldenCase {
  return {
    id: `golden-${run.module}-claire-marc-v21`,
    module: run.module,
    title: `${run.module} - Claire et Marc - cas pilote V2.1`,
    inputSnapshotId: run.dossierSnapshotId,
    expected,
    sourceVersionIds: run.evidenceSourceIds,
    ruleVersionIds: Array.from(new Set(run.steps.map((step) => step.ruleVersionId))),
    validationStatus: "pending_professional_review",
    reviewer,
    notes: [
      "Cas déterministe de démonstration.",
      "Aucun résultat n'est opposable avant revue professionnelle.",
      "Les sources et règles sont attachées au dossier de preuve.",
    ],
  };
}

export const goldenCases: GoldenCase[] = getV2TaxRuns().map((run) => {
  switch (run.module) {
    case "ir-pfu-cdhr":
      return caseFromRun(run, { resultAmount: run.resultAmount ?? null, cdhr: run.computedResult?.cdhr ?? null }, "avocat");
    case "plus-value-immo":
      return caseFromRun(run, { estimatedTax: run.computedResult?.estimatedTax ?? null }, "avocat");
    case "transmission":
      return caseFromRun(run, { indicativeRights: run.computedResult?.indicativeRights ?? null }, "notaire");
    case "dutreil":
      return caseFromRun(run, { exemptValue: run.computedResult?.exemptValue ?? null }, "notaire");
    case "apport-cession":
      return caseFromRun(run, { requiredReinvestment: run.computedResult?.requiredReinvestment ?? null }, "avocat");
    case "holding-tax":
      return caseFromRun(run, { holdingTax: run.computedResult?.holdingTax ?? null }, "avocat");
    default:
      return caseFromRun(run, { resultAmount: run.resultAmount ?? null }, "cgp");
  }
});

export function getGoldenCases(status?: ValidationStatus) {
  return status ? goldenCases.filter((goldenCase) => goldenCase.validationStatus === status) : goldenCases;
}

export function reviewGoldenCase(id: string, decision: Extract<ValidationStatus, "professionally_reviewed" | "rejected">) {
  const goldenCase = goldenCases.find((candidate) => candidate.id === id) ?? goldenCases[0];
  appendAuditEventToRepository({
    id: `audit-v21-golden-case-${goldenCase.id}`,
    tenantId: demoTenant.id,
    actorUserId: "user-expert-avocat",
    action: "golden_case.reviewed",
    entityType: "simulation",
    entityId: goldenCase.id,
    createdAt: "2026-05-27T09:30:00.000Z",
    summary: `Golden case ${decision === "professionally_reviewed" ? "revu" : "rejete"} : ${goldenCase.title}`,
  });

  return {
    ...goldenCase,
    validationStatus: decision,
    reviewedAt: "2026-05-27T09:30:00.000Z",
    notes:
      decision === "professionally_reviewed"
        ? [...goldenCase.notes, "Revue professionnelle simulée en mode pilote."]
        : [...goldenCase.notes, "Cas rejeté et à corriger avant usage pilote."],
  } satisfies GoldenCase;
}

export function assertSimulationHasProof(run: TaxRun) {
  if (!run.evidenceSourceIds.length || !run.coverageLimitIds?.length || !run.ruleSnapshotId) {
    throw new Error("SIMULATION_PROOF_INCOMPLETE");
  }

  for (const step of run.steps) {
    if (!step.evidenceSourceId || !step.ruleVersionId || !step.displayStatus || !step.coverageLimitIds.length) {
      throw new Error("CALCULATION_STEP_PROOF_INCOMPLETE");
    }
  }

  return true;
}
