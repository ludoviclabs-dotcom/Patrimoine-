import {
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const tenantStatusEnum = pgEnum("tenant_status", ["active", "pilot", "paused"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "conseiller", "expert", "client", "auditeur"]);
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("tenants_tenant_id_unique").on(table.id)]);

export const cabinets = pgTable(
  "cabinets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    legalName: varchar("legal_name", { length: 180 }).notNull(),
    tradeName: varchar("trade_name", { length: 180 }),
    siren: varchar("siren", { length: 9 }),
    professionalType: varchar("professional_type", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("cabinets_tenant_unique").on(table.tenantId),
    unique("cabinets_tenant_id_unique").on(table.tenantId, table.id),
    index("cabinets_siren_idx").on(table.siren),
  ],
);

export const userIdentities = pgTable(
  "user_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: varchar("provider", { length: 32 }).notNull().default("internal"),
    providerSubject: varchar("provider_subject", { length: 191 }).notNull(),
    emailNormalized: varchar("email_normalized", { length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    locale: varchar("locale", { length: 16 }).notNull().default("fr-FR"),
    timeZone: varchar("time_zone", { length: 64 }).notNull().default("Europe/Paris"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("user_identities_provider_subject_unique").on(table.provider, table.providerSubject),
    unique("user_identities_email_unique").on(table.emailNormalized),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    userIdentityId: uuid("user_identity_id")
      .notNull()
      .references(() => userIdentities.id, { onDelete: "restrict" }),
    role: userRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    unique("memberships_tenant_identity_unique").on(table.tenantId, table.userIdentityId),
    unique("memberships_tenant_id_unique").on(table.tenantId, table.id),
    index("memberships_tenant_role_status_idx").on(table.tenantId, table.role, table.status),
  ],
);

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
  (table) => [
    index("users_tenant_idx").on(table.tenantId),
    unique("users_tenant_id_unique").on(table.tenantId, table.id),
  ],
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
    externalReference: varchar("external_reference", { length: 120 }),
    name: varchar("name", { length: 180 }).notNull(),
    riskLevel: varchar("risk_level", { length: 24 }).notNull().default("standard"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("clients_tenant_idx").on(table.tenantId),
    unique("clients_tenant_id_unique").on(table.tenantId, table.id),
    unique("clients_tenant_external_reference_unique").on(table.tenantId, table.externalReference),
    foreignKey({
      name: "clients_tenant_owner_user_fk",
      columns: [table.tenantId, table.ownerUserId],
      foreignColumns: [users.tenantId, users.id],
    }).onDelete("restrict"),
  ],
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
  (table) => [
    index("households_tenant_idx").on(table.tenantId),
    unique("households_tenant_id_unique").on(table.tenantId, table.id),
    foreignKey({
      name: "households_tenant_client_fk",
      columns: [table.tenantId, table.clientId],
      foreignColumns: [clients.tenantId, clients.id],
    }).onDelete("restrict"),
  ],
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
    reference: varchar("reference", { length: 120 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    status: caseStatusEnum("status").notNull().default("draft"),
    fiscalYear: integer("fiscal_year").notNull().default(2026),
    assignedExpertUserId: uuid("assigned_expert_user_id").references(() => users.id),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("cases_tenant_idx").on(table.tenantId),
    index("cases_client_idx").on(table.clientId),
    unique("cases_tenant_id_unique").on(table.tenantId, table.id),
    unique("cases_tenant_reference_unique").on(table.tenantId, table.reference),
    foreignKey({
      name: "cases_tenant_client_fk",
      columns: [table.tenantId, table.clientId],
      foreignColumns: [clients.tenantId, clients.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "cases_tenant_household_fk",
      columns: [table.tenantId, table.householdId],
      foreignColumns: [households.tenantId, households.id],
    }).onDelete("restrict"),
  ],
);

// A dossier is represented by the historical client_cases table. This alias
// keeps domain language explicit without a destructive table rename.
export const dossiers = clientCases;

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
    caseId: uuid("case_id").notNull(),
    label: varchar("label", { length: 180 }).notNull(),
    category: varchar("category", { length: 48 }).notNull(),
    value: numeric("value", { precision: 20, scale: 2 }).notNull(),
    ifiKind: varchar("ifi_kind", { length: 48 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("assets_household_idx").on(table.householdId),
    index("assets_tenant_case_idx").on(table.tenantId, table.caseId),
    unique("assets_tenant_id_unique").on(table.tenantId, table.id),
    foreignKey({
      name: "assets_tenant_household_fk",
      columns: [table.tenantId, table.householdId],
      foreignColumns: [households.tenantId, households.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "assets_tenant_case_fk",
      columns: [table.tenantId, table.caseId],
      foreignColumns: [clientCases.tenantId, clientCases.id],
    }).onDelete("restrict"),
  ],
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
    caseId: uuid("case_id").notNull(),
    label: varchar("label", { length: 180 }).notNull(),
    value: numeric("value", { precision: 20, scale: 2 }).notNull(),
    linkedCategory: varchar("linked_category", { length: 48 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("liabilities_household_idx").on(table.householdId),
    index("liabilities_tenant_case_idx").on(table.tenantId, table.caseId),
    unique("liabilities_tenant_id_unique").on(table.tenantId, table.id),
    foreignKey({
      name: "liabilities_tenant_household_fk",
      columns: [table.tenantId, table.householdId],
      foreignColumns: [households.tenantId, households.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "liabilities_tenant_case_fk",
      columns: [table.tenantId, table.caseId],
      foreignColumns: [clientCases.tenantId, clientCases.id],
    }).onDelete("restrict"),
  ],
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
    originalFileName: text("original_file_name"),
    mimeType: varchar("mime_type", { length: 160 }),
    byteSize: bigint("byte_size", { mode: "number" }),
    sha256: varchar("sha256", { length: 64 }),
    required: boolean("required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("documents_case_idx").on(table.caseId),
    index("documents_tenant_idx").on(table.tenantId),
    unique("documents_tenant_id_unique").on(table.tenantId, table.id),
    foreignKey({
      name: "documents_tenant_client_fk",
      columns: [table.tenantId, table.clientId],
      foreignColumns: [clients.tenantId, clients.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "documents_tenant_case_fk",
      columns: [table.tenantId, table.caseId],
      foreignColumns: [clientCases.tenantId, clientCases.id],
    }).onDelete("restrict"),
  ],
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

export const ruleVersions = pgTable(
  "rule_versions",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "restrict" }),
    ruleSet: varchar("rule_set", { length: 80 }).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    title: text("title").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    status: varchar("status", { length: 32 }).notNull(),
    sourceReference: text("source_reference").notNull(),
    evidenceSourceIds: jsonb("evidence_source_ids").$type<string[]>().notNull(),
    rulePayload: jsonb("rule_payload").$type<Record<string, unknown>>().notNull().default({}),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("rule_versions_rule_set_version_unique").on(table.ruleSet, table.version),
    index("rule_versions_effective_idx").on(table.ruleSet, table.status, table.effectiveFrom),
    index("rule_versions_tenant_idx").on(table.tenantId),
  ],
);

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
    engineKey: varchar("engine_key", { length: 80 }).notNull(),
    engineVersion: varchar("engine_version", { length: 64 }).notNull(),
    scenario: varchar("scenario", { length: 80 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    inputSnapshot: jsonb("input_snapshot").$type<Record<string, unknown>>().notNull(),
    inputSnapshotId: varchar("input_snapshot_id", { length: 160 }),
    ruleSnapshotId: varchar("rule_snapshot_id", { length: 160 }),
    coverageLimitIds: jsonb("coverage_limit_ids").$type<string[]>(),
    professionalValidationRequired: boolean("professional_validation_required").notNull().default(true),
    computedResult: jsonb("computed_result").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("simulation_runs_case_idx").on(table.caseId),
    index("simulation_runs_tenant_case_created_idx").on(table.tenantId, table.caseId, table.createdAt),
    unique("simulation_runs_tenant_id_unique").on(table.tenantId, table.id),
    unique("simulation_runs_tenant_idempotency_unique").on(table.tenantId, table.idempotencyKey),
    foreignKey({
      name: "simulation_runs_tenant_case_fk",
      columns: [table.tenantId, table.caseId],
      foreignColumns: [clientCases.tenantId, clientCases.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "simulation_runs_tenant_household_fk",
      columns: [table.tenantId, table.householdId],
      foreignColumns: [households.tenantId, households.id],
    }).onDelete("restrict"),
  ],
);

export const calculationSteps = pgTable(
  "calculation_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
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
  (table) => [
    index("calculation_steps_run_idx").on(table.simulationRunId),
    index("calculation_steps_tenant_run_idx").on(table.tenantId, table.simulationRunId),
    unique("calculation_steps_run_order_unique").on(table.simulationRunId, table.stepOrder),
    foreignKey({
      name: "calculation_steps_tenant_run_fk",
      columns: [table.tenantId, table.simulationRunId],
      foreignColumns: [simulationRuns.tenantId, simulationRuns.id],
    }).onDelete("restrict"),
  ],
);

export const simulationRuleVersions = pgTable(
  "simulation_rule_versions",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    simulationRunId: uuid("simulation_run_id").notNull(),
    ruleVersionId: varchar("rule_version_id", { length: 120 })
      .notNull()
      .references(() => ruleVersions.id, { onDelete: "restrict" }),
    purpose: varchar("purpose", { length: 80 }).notNull().default("calculation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.simulationRunId, table.ruleVersionId] }),
    index("simulation_rule_versions_rule_idx").on(table.ruleVersionId),
    index("simulation_rule_versions_tenant_run_idx").on(table.tenantId, table.simulationRunId),
    foreignKey({
      name: "simulation_rule_versions_tenant_run_fk",
      columns: [table.tenantId, table.simulationRunId],
      foreignColumns: [simulationRuns.tenantId, simulationRuns.id],
    }).onDelete("restrict"),
  ],
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
      .references(() => users.id),
    actorIdentityId: uuid("actor_identity_id").references(() => userIdentities.id, { onDelete: "restrict" }),
    action: auditActionEnum("action").notNull(),
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }).notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean>>(),
    correlationId: varchar("correlation_id", { length: 120 }),
    requestId: varchar("request_id", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("audit_correlation_idx").on(table.correlationId),
  ],
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
