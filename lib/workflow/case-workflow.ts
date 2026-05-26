import { appendAuditEventToRepository } from "../audit/repository";
import { demoHousehold } from "../demo-data/household";
import {
  demoCases,
  demoClients,
  demoProfessionalReviews,
  demoTenant,
  getDemoUser,
} from "../demo-data/v1";
import { evidenceSources } from "../evidence/sources";
import { calculateIfi } from "../simulations/ifi";
import type {
  Asset,
  AuditLogEntry,
  CaseStatus,
  ClientCase,
  Liability,
  PersistedSimulationRun,
  ProfessionalReview,
  ReportVersion,
  ReviewDecision,
  SimulationReplay,
  UserAccount,
} from "../types";
import { requireCaseRecordAccess, requireCaseWrite, requireCaseAccess, canReviewCase } from "../security/access-control";

const CASE_ID = "case-claire-marc-2026";

function nowIso() {
  return "2026-05-26T13:00:00.000Z";
}

function createAudit(action: AuditLogEntry["action"], summary: string, entityId = CASE_ID): AuditLogEntry {
  return {
    id: `audit-v12-${action}-${entityId}`,
    tenantId: demoTenant.id,
    actorUserId: "user-conseiller-marie",
    action,
    entityType: action.startsWith("review") ? "review" : action.startsWith("simulation") ? "simulation" : "case",
    entityId,
    createdAt: nowIso(),
    summary,
  };
}

export function createDemoCase(input: { title: string }, user: UserAccount = getDemoUser("conseiller")) {
  const client = demoClients[0];
  const sourceCase = demoCases[0];
  requireCaseRecordAccess(user, sourceCase, client);

  if (!["admin", "conseiller"].includes(user.role)) {
    throw new Error("CASE_CREATE_DENIED");
  }

  const clientCase: ClientCase = {
    ...sourceCase,
    id: `case-demo-${slug(input.title)}`,
    title: input.title,
    status: "draft",
    openedAt: nowIso(),
    updatedAt: nowIso(),
  };

  const audit = appendAuditEventToRepository(
    createAudit("case.created", `Dossier cree en mode demo : ${input.title}`, clientCase.id),
  );

  return { clientCase, audit };
}

export function updateDemoCaseStatus({
  caseId = CASE_ID,
  status,
  user = getDemoUser("conseiller"),
}: {
  caseId?: string;
  status: CaseStatus;
  user?: UserAccount;
}) {
  const clientCase = demoCases.find((candidate) => candidate.id === caseId) ?? demoCases[0];
  requireCaseWrite(user, clientCase);

  const updatedCase: ClientCase = {
    ...clientCase,
    status,
    updatedAt: nowIso(),
  };

  const audit = appendAuditEventToRepository(
    createAudit("case.created", `Statut dossier mis a jour : ${status}`, updatedCase.id),
  );

  return { clientCase: updatedCase, audit };
}

export function createDemoAsset(input: Pick<Asset, "label" | "category" | "value" | "ifiKind">): Asset {
  return {
    id: `asset-demo-${slug(input.label)}`,
    label: input.label,
    category: input.category,
    value: input.value,
    ifiKind: input.ifiKind,
    dataQuality: {
      status: "user_declared",
      expectedAction: "Joindre un justificatif ou une source externe avant validation.",
      validationStatus: "not_started",
    },
  };
}

export function createDemoLiability(input: Pick<Liability, "label" | "value" | "linkedCategory">): Liability {
  return {
    id: `liability-demo-${slug(input.label)}`,
    label: input.label,
    value: input.value,
    linkedCategory: input.linkedCategory,
    dataQuality: {
      status: "user_declared",
      expectedAction: "Joindre le tableau d'amortissement et rattacher la dette a un actif.",
      validationStatus: "not_started",
    },
  };
}

export function persistIfiSimulation({
  caseId = CASE_ID,
  user = getDemoUser("conseiller"),
}: {
  caseId?: string;
  user?: UserAccount;
} = {}): PersistedSimulationRun {
  const clientCase = demoCases.find((candidate) => candidate.id === caseId) ?? demoCases[0];
  requireCaseAccess(user, clientCase);
  const run = calculateIfi(demoHousehold);

  return {
    ...run,
    id: "persisted-run-ifi-claire-marc-001",
    tenantId: clientCase.tenantId,
    caseId: clientCase.id,
    ruleSnapshotId: "snapshot-src-service-public-ifi-2026",
    inputSnapshotId: "input-snapshot-claire-marc-2026-05-26",
    replayable: true,
  };
}

export function replaySimulation(previousRun: PersistedSimulationRun = persistIfiSimulation()): SimulationReplay {
  const replayRun = persistIfiSimulation();
  const previousTaxableBase = previousRun.result.taxableBase;
  const replayTaxableBase = replayRun.result.taxableBase;
  const changedFields =
    previousTaxableBase === replayTaxableBase ? [] : ["result.taxableBase", "calculation_steps"];

  return {
    previousRunId: previousRun.id,
    replayRunId: `${previousRun.id}-replay`,
    changedFields,
    previousTaxableBase,
    replayTaxableBase,
    status: changedFields.length > 0 ? "changed" : "unchanged",
  };
}

export function decideProfessionalReview({
  reviewId = "review-claire-marc-fiscal",
  decision,
  summary,
  user = getDemoUser("expert"),
}: {
  reviewId?: string;
  decision: ReviewDecision;
  summary: string;
  user?: UserAccount;
}): ProfessionalReview {
  const review = demoProfessionalReviews.find((candidate) => candidate.id === reviewId) ?? demoProfessionalReviews[0];
  const clientCase = demoCases.find((candidate) => candidate.id === review.caseId) ?? demoCases[0];

  if (!canReviewCase(user, clientCase)) {
    throw new Error("REVIEW_DECISION_DENIED");
  }

  return {
    ...review,
    decision,
    summary,
    reviewedAt: nowIso(),
    requiredActions:
      decision === "approved"
        ? []
        : ["Corriger les donnees incompletes avant emission d'un rapport valide."],
  };
}

export function generateReportVersion({
  caseId = CASE_ID,
  run = persistIfiSimulation(),
}: {
  caseId?: string;
  run?: PersistedSimulationRun;
} = {}): ReportVersion {
  return {
    id: `report-version-${caseId}-v1`,
    tenantId: demoTenant.id,
    caseId,
    version: "RPT-2026.05-v1",
    status: "issued_for_review",
    generatedAt: nowIso(),
    simulationRunIds: [run.id],
    reviewerUserId: "user-expert-avocat",
    validationDecision: "pending",
    evidenceSourceIds: evidenceSources.map((source) => source.id),
    coverageLimitIds: run.steps.flatMap((step) => step.coverageLimitIds),
  };
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}
