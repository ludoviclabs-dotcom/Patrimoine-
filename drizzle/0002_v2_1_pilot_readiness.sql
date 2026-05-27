ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'data.retention.checked';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'document.metadata.created';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'golden_case.reviewed';

ALTER TABLE "simulation_runs" ADD COLUMN IF NOT EXISTS "input_snapshot_id" varchar(160);
ALTER TABLE "simulation_runs" ADD COLUMN IF NOT EXISTS "rule_snapshot_id" varchar(160);
ALTER TABLE "simulation_runs" ADD COLUMN IF NOT EXISTS "coverage_limit_ids" jsonb;
ALTER TABLE "simulation_runs" ADD COLUMN IF NOT EXISTS "professional_validation_required" boolean NOT NULL DEFAULT true;
ALTER TABLE "simulation_runs" ADD COLUMN IF NOT EXISTS "computed_result" jsonb;

ALTER TABLE "calculation_steps" ADD COLUMN IF NOT EXISTS "used_data" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "calculation_steps" ADD COLUMN IF NOT EXISTS "intermediate_result" text;
ALTER TABLE "calculation_steps" ADD COLUMN IF NOT EXISTS "coverage_limit_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "calculation_steps" ADD COLUMN IF NOT EXISTS "next_action" text;
ALTER TABLE "calculation_steps" ADD COLUMN IF NOT EXISTS "display_status" varchar(64);

CREATE TABLE IF NOT EXISTS "dossier_snapshots" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "case_id" uuid NOT NULL REFERENCES "client_cases"("id"),
  "household_id" uuid NOT NULL REFERENCES "households"("id"),
  "captured_at" timestamp with time zone DEFAULT now() NOT NULL,
  "asset_ids" jsonb NOT NULL,
  "liability_ids" jsonb NOT NULL,
  "objective_labels" jsonb NOT NULL,
  "data_quality_score" integer NOT NULL,
  "source_version_ids" jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS "dossier_snapshots_case_idx" ON "dossier_snapshots" ("case_id");

CREATE TABLE IF NOT EXISTS "professional_documents" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "case_id" uuid NOT NULL REFERENCES "client_cases"("id"),
  "kind" varchar(64) NOT NULL,
  "title" text NOT NULL,
  "status" varchar(32) DEFAULT 'draft' NOT NULL,
  "version" varchar(64) NOT NULL,
  "hash" varchar(160) NOT NULL,
  "required_inputs" jsonb NOT NULL,
  "professional_validation_required" boolean DEFAULT true NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "professional_documents_case_idx" ON "professional_documents" ("case_id");

CREATE TABLE IF NOT EXISTS "data_requests" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "client_id" uuid NOT NULL REFERENCES "clients"("id"),
  "case_id" uuid NOT NULL REFERENCES "client_cases"("id"),
  "kind" varchar(24) NOT NULL,
  "status" varchar(32) DEFAULT 'queued' NOT NULL,
  "export_format" varchar(24),
  "reason" text NOT NULL,
  "audit_log_id" varchar(160) NOT NULL,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "data_requests_case_idx" ON "data_requests" ("case_id");

CREATE TABLE IF NOT EXISTS "private_document_metadata" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "client_id" uuid NOT NULL REFERENCES "clients"("id"),
  "case_id" uuid NOT NULL REFERENCES "client_cases"("id"),
  "kind" "document_kind" NOT NULL,
  "label" varchar(220) NOT NULL,
  "status" "document_status" DEFAULT 'to_review' NOT NULL,
  "storage_provider" varchar(80) DEFAULT 'demo-private-metadata' NOT NULL,
  "visibility" varchar(24) DEFAULT 'private' NOT NULL,
  "allow_public_url" boolean DEFAULT false NOT NULL,
  "sha256" varchar(160),
  "expected_action" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "private_document_metadata_case_idx" ON "private_document_metadata" ("case_id");

CREATE TABLE IF NOT EXISTS "retention_policies" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "scope" varchar(24) NOT NULL,
  "personal_data_months" integer NOT NULL,
  "audit_log_years" integer NOT NULL,
  "document_retention_years" integer NOT NULL,
  "deletion_requires_professional_approval" boolean DEFAULT true NOT NULL,
  "export_available" boolean DEFAULT true NOT NULL,
  "last_reviewed_at" timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "retention_policies_tenant_idx" ON "retention_policies" ("tenant_id");

CREATE TABLE IF NOT EXISTS "golden_cases" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "module" varchar(64) NOT NULL,
  "title" text NOT NULL,
  "input_snapshot_id" varchar(160) NOT NULL,
  "expected" jsonb NOT NULL,
  "source_version_ids" jsonb NOT NULL,
  "rule_version_ids" jsonb NOT NULL,
  "validation_status" varchar(64) NOT NULL,
  "reviewer" varchar(64),
  "reviewed_at" timestamp with time zone,
  "notes" jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS "golden_cases_module_idx" ON "golden_cases" ("module");

CREATE TABLE IF NOT EXISTS "offline_evidence_snapshots" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "source_id" varchar(120) NOT NULL REFERENCES "evidence_sources"("id"),
  "captured_at" timestamp with time zone NOT NULL,
  "canonical_content_hash" varchar(160) NOT NULL,
  "previous_hash" varchar(160) NOT NULL,
  "status" varchar(32) NOT NULL,
  "recommended_action" text NOT NULL
);
CREATE INDEX IF NOT EXISTS "offline_evidence_snapshots_source_idx" ON "offline_evidence_snapshots" ("source_id");

CREATE OR REPLACE FUNCTION prevent_audit_logs_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON "audit_logs";
DROP TRIGGER IF EXISTS audit_logs_no_delete ON "audit_logs";
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_logs_mutation();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_logs_mutation();
