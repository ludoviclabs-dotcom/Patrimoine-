import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "pilot", "paused"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "conseiller", "expert", "client"]);
export const userStatusEnum = pgEnum("user_status", ["active", "invited", "disabled"]);
export const caseStatusEnum = pgEnum("case_status", [
  "draft",
  "simulation_indicative",
  "review_required",
  "validated_by_professional",
  "archived",
]);
export const documentKindEnum = pgEnum("document_kind", [
  "tax_notice",
  "loan_contract",
  "company_statutes",
  "life_insurance",
  "real_estate_title",
  "transmission_family_record",
  "identity",
  "other",
]);
export const documentStatusEnum = pgEnum("document_status", [
  "missing",
  "received",
  "to_review",
  "validated",
]);
export const reviewDecisionEnum = pgEnum("review_decision", [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "case.created",
  "document.received",
  "simulation.run",
  "review.requested",
  "review.decided",
  "data.export.requested",
  "data.deletion.requested",
  "data.retention.checked",
  "document.metadata.created",
  "golden_case.reviewed",
  "source.checked",
  "source.changed",
  "rule.updated",
  "simulation.recalculation_required",
  "scenario.compared",
  "report.exported",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  status: tenantStatusEnum("status").notNull().default("pilot"),
  dataRegion: varchar("data_region", { length: 16 }).notNull().default("eu"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    role: userRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_tenant_idx").on(table.tenantId)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 180 }).notNull(),
    riskLevel: varchar("risk_level", { length: 24 }).notNull().default("standard"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("clients_tenant_idx").on(table.tenantId)],
);

export const households = pgTable(
  "households",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    name: varchar("name", { length: 180 }).notNull(),
    profile: text("profile").notNull(),
    members: jsonb("members").$type<string[]>().notNull(),
    children: integer("children").notNull().default(0),
    fiscalResidence: varchar("fiscal_residence", { length: 120 }).notNull(),
    professionalContext: text("professional_context").notNull(),
    objectives: jsonb("objectives").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("households_tenant_idx").on(table.tenantId)],
);

export const clientCases = pgTable(
  "client_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    title: varchar("title", { length: 220 }).notNull(),
    status: caseStatusEnum("status").notNull().default("draft"),
    assignedExpertUserId: uuid("assigned_expert_user_id").references(() => users.id),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cases_tenant_idx").on(table.tenantId), index("cases_client_idx").on(table.clientId)],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    label: varchar("label", { length: 180 }).notNull(),
    category: varchar("category", { length: 48 }).notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    ifiKind: varchar("ifi_kind", { length: 48 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assets_household_idx").on(table.householdId)],
);

export const liabilities = pgTable(
  "liabilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    label: varchar("label", { length: 180 }).notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    linkedCategory: varchar("linked_category", { length: 48 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("liabilities_household_idx").on(table.householdId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => clientCases.id),
    kind: documentKindEnum("kind").notNull(),
    label: varchar("label", { length: 220 }).notNull(),
    status: documentStatusEnum("status").notNull().default("missing"),
    storageProvider: varchar("storage_provider", { length: 64 }).notNull().default("demo-placeholder"),
    blobPath: text("blob_path"),
    required: boolean("required").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("documents_case_idx").on(table.caseId), index("documents_tenant_idx").on(table.tenantId)],
);

export const evidenceSources = pgTable("evidence_sources", {
  id: varchar("id", { length: 120 }).primaryKey(),
  title: text("title").notNull(),
  authority: varchar("authority", { length: 64 }).notNull(),
  url: text("url").notNull(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
  legalScope: varchar("legal_scope", { length: 80 }).notNull(),
  reliability: varchar("reliability", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  sourceVersion: varchar("source_version", { length: 120 }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  contentHash: varchar("content_hash", { length: 160 }),
  summary: text("summary"),
  linkedRuleIds: jsonb("linked_rule_ids").$type<string[]>(),
  lastControlAt: timestamp("last_control_at", { withTimezone: true }),
  snapshotStatus: varchar("snapshot_status", { length: 32 }),
});

export const ruleVersions = pgTable("rule_versions", {
  id: varchar("id", { length: 120 }).primaryKey(),
  ruleSet: varchar("rule_set", { length: 80 }).notNull(),
  version: varchar("version", { length: 64 }).notNull(),
  title: text("title").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  evidenceSourceIds: jsonb("evidence_source_ids").$type<string[]>().notNull(),
});

export const simulationRuns = pgTable(
  "simulation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => clientCases.id),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    scenario: varchar("scenario", { length: 80 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    inputSnapshotId: varchar("input_snapshot_id", { length: 160 }),
    ruleSnapshotId: varchar("rule_snapshot_id", { length: 160 }),
    coverageLimitIds: jsonb("coverage_limit_ids").$type<string[]>(),
    professionalValidationRequired: boolean("professional_validation_required").notNull().default(true),
    computedResult: jsonb("computed_result").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("simulation_runs_case_idx").on(table.caseId)],
);

export const calculationSteps = pgTable(
  "calculation_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    simulationRunId: uuid("simulation_run_id")
      .notNull()
      .references(() => simulationRuns.id),
    stepOrder: integer("step_order").notNull(),
    label: text("label").notNull(),
    inputValue: text("input_value").notNull(),
    formula: text("formula").notNull(),
    outputValue: text("output_value").notNull(),
    ruleVersionId: varchar("rule_version_id", { length: 120 })
      .notNull()
      .references(() => ruleVersions.id),
    evidenceSourceId: varchar("evidence_source_id", { length: 120 })
      .notNull()
      .references(() => evidenceSources.id),
    confidenceStatus: varchar("confidence_status", { length: 32 }).notNull(),
    usedData: jsonb("used_data").$type<string[]>().notNull().default([]),
    intermediateResult: text("intermediate_result"),
    coverageLimitIds: jsonb("coverage_limit_ids").$type<string[]>().notNull().default([]),
    nextAction: text("next_action"),
    displayStatus: varchar("display_status", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("calculation_steps_run_idx").on(table.simulationRunId)],
);

export const professionalReviews = pgTable(
  "professional_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => clientCases.id),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id),
    decision: reviewDecisionEnum("decision").notNull().default("pending"),
    summary: text("summary").notNull(),
    requiredActions: jsonb("required_actions").$type<string[]>().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reviews_case_idx").on(table.caseId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    action: auditActionEnum("action").notNull(),
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }).notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_tenant_created_idx").on(table.tenantId, table.createdAt)],
);

export const sourceSnapshots = pgTable(
  "source_snapshots",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    sourceId: varchar("source_id", { length: 120 })
      .notNull()
      .references(() => evidenceSources.id),
    sourceVersion: varchar("source_version", { length: 120 }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    contentHash: varchar("content_hash", { length: 160 }).notNull(),
    summary: text("summary").notNull(),
    linkedRuleIds: jsonb("linked_rule_ids").$type<string[]>().notNull(),
    status: varchar("status", { length: 32 }).notNull(),
  },
  (table) => [index("source_snapshots_source_idx").on(table.sourceId)],
);

export const ruleDiffs = pgTable(
  "rule_diffs",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    ruleVersionId: varchar("rule_version_id", { length: 120 })
      .notNull()
      .references(() => ruleVersions.id),
    sourceId: varchar("source_id", { length: 120 })
      .notNull()
      .references(() => evidenceSources.id),
    fromHash: varchar("from_hash", { length: 160 }).notNull(),
    toHash: varchar("to_hash", { length: 160 }).notNull(),
    impactedCaseIds: jsonb("impacted_case_ids").$type<string[]>().notNull(),
    recommendedAction: text("recommended_action").notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rule_diffs_source_idx").on(table.sourceId)],
);

export const reportVersions = pgTable(
  "report_versions",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => clientCases.id),
    version: varchar("version", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    simulationRunIds: jsonb("simulation_run_ids").$type<string[]>().notNull(),
    reviewerUserId: uuid("reviewer_user_id").references(() => users.id),
    validationDecision: reviewDecisionEnum("validation_decision").notNull().default("pending"),
    evidenceSourceIds: jsonb("evidence_source_ids").$type<string[]>().notNull(),
    coverageLimitIds: jsonb("coverage_limit_ids").$type<string[]>().notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("report_versions_case_idx").on(table.caseId)],
);

export const dossierSnapshots = pgTable(
  "dossier_snapshots",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => clientCases.id),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    assetIds: jsonb("asset_ids").$type<string[]>().notNull(),
    liabilityIds: jsonb("liability_ids").$type<string[]>().notNull(),
    objectiveLabels: jsonb("objective_labels").$type<string[]>().notNull(),
    dataQualityScore: integer("data_quality_score").notNull(),
    sourceVersionIds: jsonb("source_version_ids").$type<string[]>().notNull(),
  },
  (table) => [index("dossier_snapshots_case_idx").on(table.caseId)],
);

export const professionalDocuments = pgTable(
  "professional_documents",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => clientCases.id),
    kind: varchar("kind", { length: 64 }).notNull(),
    title: text("title").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    version: varchar("version", { length: 64 }).notNull(),
    hash: varchar("hash", { length: 160 }).notNull(),
    requiredInputs: jsonb("required_inputs").$type<string[]>().notNull(),
    professionalValidationRequired: boolean("professional_validation_required").notNull().default(true),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("professional_documents_case_idx").on(table.caseId)],
);

export const dataRequests = pgTable(
  "data_requests",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => clientCases.id),
    kind: varchar("kind", { length: 24 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    exportFormat: varchar("export_format", { length: 24 }),
    reason: text("reason").notNull(),
    auditLogId: varchar("audit_log_id", { length: 160 }).notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("data_requests_case_idx").on(table.caseId)],
);

export const privateDocumentMetadata = pgTable(
  "private_document_metadata",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => clientCases.id),
    kind: documentKindEnum("kind").notNull(),
    label: varchar("label", { length: 220 }).notNull(),
    status: documentStatusEnum("status").notNull().default("to_review"),
    storageProvider: varchar("storage_provider", { length: 80 }).notNull().default("demo-private-metadata"),
    visibility: varchar("visibility", { length: 24 }).notNull().default("private"),
    allowPublicUrl: boolean("allow_public_url").notNull().default(false),
    sha256: varchar("sha256", { length: 160 }),
    expectedAction: text("expected_action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("private_document_metadata_case_idx").on(table.caseId)],
);

export const retentionPolicies = pgTable(
  "retention_policies",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    scope: varchar("scope", { length: 24 }).notNull(),
    personalDataMonths: integer("personal_data_months").notNull(),
    auditLogYears: integer("audit_log_years").notNull(),
    documentRetentionYears: integer("document_retention_years").notNull(),
    deletionRequiresProfessionalApproval: boolean("deletion_requires_professional_approval").notNull().default(true),
    exportAvailable: boolean("export_available").notNull().default(true),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("retention_policies_tenant_idx").on(table.tenantId)],
);

export const goldenCases = pgTable(
  "golden_cases",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    module: varchar("module", { length: 64 }).notNull(),
    title: text("title").notNull(),
    inputSnapshotId: varchar("input_snapshot_id", { length: 160 }).notNull(),
    expected: jsonb("expected").$type<Record<string, string | number | boolean | null>>().notNull(),
    sourceVersionIds: jsonb("source_version_ids").$type<string[]>().notNull(),
    ruleVersionIds: jsonb("rule_version_ids").$type<string[]>().notNull(),
    validationStatus: varchar("validation_status", { length: 64 }).notNull(),
    reviewer: varchar("reviewer", { length: 64 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    notes: jsonb("notes").$type<string[]>().notNull(),
  },
  (table) => [index("golden_cases_module_idx").on(table.module)],
);

export const offlineEvidenceSnapshots = pgTable(
  "offline_evidence_snapshots",
  {
    id: varchar("id", { length: 160 }).primaryKey(),
    sourceId: varchar("source_id", { length: 120 })
      .notNull()
      .references(() => evidenceSources.id),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    canonicalContentHash: varchar("canonical_content_hash", { length: 160 }).notNull(),
    previousHash: varchar("previous_hash", { length: 160 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    recommendedAction: text("recommended_action").notNull(),
  },
  (table) => [index("offline_evidence_snapshots_source_idx").on(table.sourceId)],
);

export const consents = pgTable(
  "consents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    purpose: varchar("purpose", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("consents_client_idx").on(table.clientId)],
);

export const dpiaRecords = pgTable(
  "dpia_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: varchar("title", { length: 220 }).notNull(),
    riskLevel: varchar("risk_level", { length: 24 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    mitigations: jsonb("mitigations").$type<string[]>().notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("dpia_tenant_idx").on(table.tenantId)],
);
