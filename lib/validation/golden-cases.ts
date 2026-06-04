import { appendAuditEventToRepository } from "../audit/repository";
import { demoTenant } from "../demo-data/v1";
import {
  getV2TaxRuns,
  simulateIrPfuCdhr,
  simulateTransmissionV2,
} from "../tax/v2-engines";
import type {
  GoldenCase,
  GoldenCaseCoverageBadge,
  GoldenCaseExecutionStatus,
  TaxModule,
  TaxRun,
  ValidationStatus,
} from "../types";

const executedAt = "2026-05-27T10:10:00.000Z";

function actualFromRun(run: TaxRun): Record<string, number | string | boolean | null> {
  switch (run.module) {
    case "ir-pfu-cdhr":
      return { resultAmount: run.resultAmount ?? null, cdhr: run.computedResult?.cdhr ?? null, pfuTax: run.computedResult?.pfuTax ?? null };
    case "plus-value-immo":
      return { estimatedTax: run.computedResult?.estimatedTax ?? null };
    case "transmission":
      return {
        indicativeRights: run.computedResult?.indicativeRights ?? null,
        bareOwnershipRate: run.computedResult?.bareOwnershipRate ?? null,
      };
    case "dutreil":
      return { exemptValue: run.computedResult?.exemptValue ?? null };
    case "apport-cession":
      return { requiredReinvestment: run.computedResult?.requiredReinvestment ?? null };
    case "holding-tax":
      return { holdingTax: run.computedResult?.holdingTax ?? null };
    default:
      return { resultAmount: run.resultAmount ?? null };
  }
}

function compareRecords(
  expected: GoldenCase["expected"],
  actual: GoldenCase["actual"],
  coverageBadge: GoldenCaseCoverageBadge,
): { executionStatus: GoldenCaseExecutionStatus; failureReason?: string } {
  if (coverageBadge !== "covered") {
    return {
      executionStatus: "needs_professional_review",
      failureReason: "Cas volontairement borné : couverture partielle ou exception non automatisée.",
    };
  }

  const mismatch = Object.entries(expected).find(([key, value]) => actual[key] !== value);

  return mismatch
    ? { executionStatus: "fail", failureReason: `${mismatch[0]} attendu ${mismatch[1]}, calculé ${actual[mismatch[0]]}` }
    : { executionStatus: "pass" };
}

function caseFromRun({
  run,
  expected,
  reviewer,
  title,
  coverageBadge = "covered",
}: {
  run: TaxRun;
  expected: GoldenCase["expected"];
  reviewer: GoldenCase["reviewer"];
  title?: string;
  coverageBadge?: GoldenCaseCoverageBadge;
}): GoldenCase {
  const actual = actualFromRun(run);
  const execution = compareRecords(expected, actual, coverageBadge);

  return {
    id: `golden-${run.module}-${title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "claire-marc-v22"}`,
    module: run.module,
    title: title ?? `${run.module} - Claire et Marc - cas live portfolio`,
    inputSnapshotId: run.dossierSnapshotId,
    expected,
    actual,
    executionStatus: execution.executionStatus,
    coverageBadge,
    failureReason: execution.failureReason,
    executedAt,
    sourceVersionIds: run.evidenceSourceIds,
    ruleVersionIds: Array.from(new Set(run.steps.map((step) => step.ruleVersionId))),
    validationStatus: execution.executionStatus === "pass" ? "pending_professional_review" : "pending_professional_review",
    reviewer,
    notes: [
      "Cas déterministe de démonstration exécuté en live.",
      "Aucun résultat n'est opposable avant revue professionnelle.",
      "Les sources et règles sont attachées au dossier de preuve.",
    ],
  };
}

function expectedFromRun(run: TaxRun) {
  return actualFromRun(run);
}

const baseGoldenCases = getV2TaxRuns().map((run) => {
  const reviewerByModule: Record<TaxModule, GoldenCase["reviewer"]> = {
    ifi: "cgp",
    "ir-pfu-cdhr": "avocat",
    "plus-value-immo": "avocat",
    transmission: "notaire",
    dutreil: "notaire",
    "apport-cession": "avocat",
    "holding-tax": "avocat",
    pea: "cgp",
    per: "cgp",
    "bank-import": "cgp",
    succession: "notaire",
    "per-exit": "cgp",
    "liquidity-stress": "notaire",
    "product-adequacy": "cgp",
  };

  return caseFromRun({
    run,
    expected: expectedFromRun(run),
    reviewer: reviewerByModule[run.module],
  });
});

const pfuAdversarialRun = simulateIrPfuCdhr({ capitalIncome: 120_000, pfuRate: 0.314 });
const dismembermentRun = simulateTransmissionV2({
  assetValue: 300_000,
  donorAge: 51,
  children: 2,
  useDismemberment: true,
});

export const goldenCases: GoldenCase[] = [
  ...baseGoldenCases,
  caseFromRun({
    run: pfuAdversarialRun,
    expected: { pfuTax: 37_680, cdhr: 0, resultAmount: 37_680 },
    reviewer: "avocat",
    title: "PFU 31,4 % - cas adversarial enveloppe standard",
  }),
  caseFromRun({
    run: pfuAdversarialRun,
    expected: {
      envelope: "assurance-vie / PEL / CEL",
      expectedStatus: "à vérifier manuellement",
    },
    reviewer: "avocat",
    title: "Assurance-vie PEL CEL - exception à 30 % à vérifier",
    coverageBadge: "not_covered_v1",
  }),
  caseFromRun({
    run: simulateIrPfuCdhr({ capitalIncome: 80_000, pfuRate: 0.314 }),
    expected: {
      fiscalResidence: "non-résident simple",
      expectedStatus: "périmètre fiscal à qualifier",
    },
    reviewer: "avocat",
    title: "Non-résident simple - périmètre fiscal borné",
    coverageBadge: "partially_covered",
  }),
  caseFromRun({
    run: dismembermentRun,
    expected: { indicativeRights: dismembermentRun.computedResult?.indicativeRights ?? null, bareOwnershipRate: 0.5 },
    reviewer: "notaire",
    title: "Démembrement - âge 51 ans et nue-propriété",
  }),
];

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
