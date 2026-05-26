ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'source.changed';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'rule.updated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'scenario.compared';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'report.exported';

ALTER TABLE "evidence_sources" ADD COLUMN IF NOT EXISTS "source_version" varchar(120);
ALTER TABLE "evidence_sources" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;
ALTER TABLE "evidence_sources" ADD COLUMN IF NOT EXISTS "content_hash" varchar(160);
ALTER TABLE "evidence_sources" ADD COLUMN IF NOT EXISTS "summary" text;
ALTER TABLE "evidence_sources" ADD COLUMN IF NOT EXISTS "linked_rule_ids" jsonb;
ALTER TABLE "evidence_sources" ADD COLUMN IF NOT EXISTS "last_control_at" timestamp with time zone;
ALTER TABLE "evidence_sources" ADD COLUMN IF NOT EXISTS "snapshot_status" varchar(32);

CREATE TABLE IF NOT EXISTS "source_snapshots" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "source_id" varchar(120) NOT NULL REFERENCES "evidence_sources"("id"),
  "source_version" varchar(120) NOT NULL,
  "captured_at" timestamp with time zone NOT NULL,
  "content_hash" varchar(160) NOT NULL,
  "summary" text NOT NULL,
  "linked_rule_ids" jsonb NOT NULL,
  "status" varchar(32) NOT NULL
);

CREATE INDEX IF NOT EXISTS "source_snapshots_source_idx" ON "source_snapshots" ("source_id");

CREATE TABLE IF NOT EXISTS "rule_diffs" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "rule_version_id" varchar(120) NOT NULL REFERENCES "rule_versions"("id"),
  "source_id" varchar(120) NOT NULL REFERENCES "evidence_sources"("id"),
  "from_hash" varchar(160) NOT NULL,
  "to_hash" varchar(160) NOT NULL,
  "impacted_case_ids" jsonb NOT NULL,
  "recommended_action" text NOT NULL,
  "status" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "rule_diffs_source_idx" ON "rule_diffs" ("source_id");

CREATE TABLE IF NOT EXISTS "report_versions" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "case_id" uuid NOT NULL REFERENCES "client_cases"("id"),
  "version" varchar(64) NOT NULL,
  "status" varchar(32) NOT NULL,
  "simulation_run_ids" jsonb NOT NULL,
  "reviewer_user_id" uuid REFERENCES "users"("id"),
  "validation_decision" "review_decision" DEFAULT 'pending' NOT NULL,
  "evidence_source_ids" jsonb NOT NULL,
  "coverage_limit_ids" jsonb NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "report_versions_case_idx" ON "report_versions" ("case_id");
