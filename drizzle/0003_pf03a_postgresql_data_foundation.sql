ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'auditeur';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'simulation.recalculation_required';
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "tenants"
  ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD CONSTRAINT "tenants_tenant_id_unique" UNIQUE ("id");

CREATE TABLE "cabinets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
  "legal_name" varchar(180) NOT NULL,
  "trade_name" varchar(180),
  "siren" varchar(9),
  "professional_type" varchar(64) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cabinets_tenant_unique" UNIQUE ("tenant_id"),
  CONSTRAINT "cabinets_tenant_id_unique" UNIQUE ("tenant_id", "id")
);
CREATE INDEX "cabinets_siren_idx" ON "cabinets" ("siren");

CREATE TABLE "user_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" varchar(32) NOT NULL DEFAULT 'internal',
  "provider_subject" varchar(191) NOT NULL,
  "email_normalized" varchar(320) NOT NULL,
  "display_name" varchar(160) NOT NULL,
  "locale" varchar(16) NOT NULL DEFAULT 'fr-FR',
  "time_zone" varchar(64) NOT NULL DEFAULT 'Europe/Paris',
  "disabled_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_identities_provider_subject_unique" UNIQUE ("provider", "provider_subject"),
  CONSTRAINT "user_identities_email_unique" UNIQUE ("email_normalized")
);

CREATE TABLE "memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
  "user_identity_id" uuid NOT NULL REFERENCES "user_identities"("id") ON DELETE RESTRICT,
  "role" "user_role" NOT NULL,
  "status" "user_status" NOT NULL DEFAULT 'invited',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "activated_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  CONSTRAINT "memberships_tenant_identity_unique" UNIQUE ("tenant_id", "user_identity_id"),
  CONSTRAINT "memberships_tenant_id_unique" UNIQUE ("tenant_id", "id")
);
CREATE INDEX "memberships_tenant_role_status_idx"
  ON "memberships" ("tenant_id", "role", "status");

ALTER TABLE "users"
  ADD CONSTRAINT "users_tenant_id_unique" UNIQUE ("tenant_id", "id");

ALTER TABLE "clients"
  ADD COLUMN "external_reference" varchar(120),
  ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD CONSTRAINT "clients_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "clients_tenant_external_reference_unique" UNIQUE ("tenant_id", "external_reference"),
  ADD CONSTRAINT "clients_tenant_owner_user_fk"
    FOREIGN KEY ("tenant_id", "owner_user_id")
    REFERENCES "users" ("tenant_id", "id") ON DELETE RESTRICT;

ALTER TABLE "households"
  ADD CONSTRAINT "households_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "households_tenant_client_fk"
    FOREIGN KEY ("tenant_id", "client_id")
    REFERENCES "clients" ("tenant_id", "id") ON DELETE RESTRICT;

ALTER TABLE "client_cases"
  ADD COLUMN "reference" varchar(120),
  ADD COLUMN "fiscal_year" integer NOT NULL DEFAULT 2026,
  ADD COLUMN "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN "archived_at" timestamp with time zone;

UPDATE "client_cases"
SET
  "reference" = 'DOS-' || upper(substring(replace("id"::text, '-', ''), 1, 12)),
  "created_at" = "opened_at"
WHERE "reference" IS NULL;

ALTER TABLE "client_cases"
  ALTER COLUMN "reference" SET NOT NULL,
  ADD CONSTRAINT "cases_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "cases_tenant_reference_unique" UNIQUE ("tenant_id", "reference"),
  ADD CONSTRAINT "cases_tenant_client_fk"
    FOREIGN KEY ("tenant_id", "client_id")
    REFERENCES "clients" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "cases_tenant_household_fk"
    FOREIGN KEY ("tenant_id", "household_id")
    REFERENCES "households" ("tenant_id", "id") ON DELETE RESTRICT;

ALTER TABLE "assets"
  ALTER COLUMN "value" TYPE numeric(20, 2),
  ADD COLUMN "case_id" uuid,
  ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now();

UPDATE "assets" AS asset
SET "case_id" = (
  SELECT dossier."id"
  FROM "client_cases" AS dossier
  WHERE dossier."tenant_id" = asset."tenant_id"
    AND dossier."household_id" = asset."household_id"
  ORDER BY dossier."opened_at", dossier."id"
  LIMIT 1
)
WHERE asset."case_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "assets" WHERE "case_id" IS NULL) THEN
    RAISE EXCEPTION 'PF-03A requires every existing asset to be linked to a dossier';
  END IF;
END $$;

ALTER TABLE "assets"
  ALTER COLUMN "case_id" SET NOT NULL,
  ADD CONSTRAINT "assets_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "assets_tenant_household_fk"
    FOREIGN KEY ("tenant_id", "household_id")
    REFERENCES "households" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "assets_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "assets_tenant_case_idx" ON "assets" ("tenant_id", "case_id");

ALTER TABLE "liabilities"
  ALTER COLUMN "value" TYPE numeric(20, 2),
  ADD COLUMN "case_id" uuid,
  ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now();

UPDATE "liabilities" AS liability
SET "case_id" = (
  SELECT dossier."id"
  FROM "client_cases" AS dossier
  WHERE dossier."tenant_id" = liability."tenant_id"
    AND dossier."household_id" = liability."household_id"
  ORDER BY dossier."opened_at", dossier."id"
  LIMIT 1
)
WHERE liability."case_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "liabilities" WHERE "case_id" IS NULL) THEN
    RAISE EXCEPTION 'PF-03A requires every existing liability to be linked to a dossier';
  END IF;
END $$;

ALTER TABLE "liabilities"
  ALTER COLUMN "case_id" SET NOT NULL,
  ADD CONSTRAINT "liabilities_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "liabilities_tenant_household_fk"
    FOREIGN KEY ("tenant_id", "household_id")
    REFERENCES "households" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "liabilities_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "liabilities_tenant_case_idx" ON "liabilities" ("tenant_id", "case_id");

ALTER TABLE "documents"
  ADD COLUMN "original_file_name" text,
  ADD COLUMN "mime_type" varchar(160),
  ADD COLUMN "byte_size" bigint,
  ADD COLUMN "sha256" varchar(64),
  ADD COLUMN "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD CONSTRAINT "documents_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "documents_tenant_client_fk"
    FOREIGN KEY ("tenant_id", "client_id")
    REFERENCES "clients" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "documents_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT;

ALTER TABLE "rule_versions"
  ADD COLUMN "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE RESTRICT,
  ADD COLUMN "effective_to" timestamp with time zone,
  ADD COLUMN "source_reference" text,
  ADD COLUMN "rule_payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "checksum_sha256" varchar(64),
  ADD COLUMN "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now();

UPDATE "rule_versions"
SET
  "source_reference" = 'evidence_sources:' || "evidence_source_ids"::text,
  "checksum_sha256" = encode(digest("id" || ':' || "version", 'sha256'), 'hex')
WHERE "source_reference" IS NULL OR "checksum_sha256" IS NULL;

ALTER TABLE "rule_versions"
  ALTER COLUMN "source_reference" SET NOT NULL,
  ALTER COLUMN "checksum_sha256" SET NOT NULL,
  ADD CONSTRAINT "rule_versions_rule_set_version_unique" UNIQUE ("rule_set", "version");
CREATE INDEX "rule_versions_effective_idx"
  ON "rule_versions" ("rule_set", "status", "effective_from");
CREATE INDEX "rule_versions_tenant_idx" ON "rule_versions" ("tenant_id");

ALTER TABLE "simulation_runs"
  ADD COLUMN "engine_key" varchar(80) NOT NULL DEFAULT 'legacy',
  ADD COLUMN "engine_version" varchar(64) NOT NULL DEFAULT 'legacy',
  ADD COLUMN "idempotency_key" varchar(160),
  ADD COLUMN "input_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN "completed_at" timestamp with time zone;

UPDATE "simulation_runs"
SET
  "idempotency_key" = "id"::text,
  "input_snapshot" = jsonb_build_object('snapshotId', "input_snapshot_id")
WHERE "idempotency_key" IS NULL;

ALTER TABLE "simulation_runs"
  ALTER COLUMN "idempotency_key" SET NOT NULL,
  ADD CONSTRAINT "simulation_runs_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "simulation_runs_tenant_idempotency_unique" UNIQUE ("tenant_id", "idempotency_key"),
  ADD CONSTRAINT "simulation_runs_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "simulation_runs_tenant_household_fk"
    FOREIGN KEY ("tenant_id", "household_id")
    REFERENCES "households" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "simulation_runs_tenant_case_created_idx"
  ON "simulation_runs" ("tenant_id", "case_id", "created_at");

ALTER TABLE "calculation_steps" ADD COLUMN "tenant_id" uuid;
UPDATE "calculation_steps" AS step
SET "tenant_id" = run."tenant_id"
FROM "simulation_runs" AS run
WHERE run."id" = step."simulation_run_id" AND step."tenant_id" IS NULL;
ALTER TABLE "calculation_steps"
  ALTER COLUMN "tenant_id" SET NOT NULL,
  ADD CONSTRAINT "calculation_steps_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "calculation_steps_run_order_unique" UNIQUE ("simulation_run_id", "step_order"),
  ADD CONSTRAINT "calculation_steps_tenant_run_fk"
    FOREIGN KEY ("tenant_id", "simulation_run_id")
    REFERENCES "simulation_runs" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "calculation_steps_tenant_run_idx"
  ON "calculation_steps" ("tenant_id", "simulation_run_id");

CREATE TABLE "simulation_rule_versions" (
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
  "simulation_run_id" uuid NOT NULL,
  "rule_version_id" varchar(120) NOT NULL REFERENCES "rule_versions"("id") ON DELETE RESTRICT,
  "purpose" varchar(80) NOT NULL DEFAULT 'calculation',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("simulation_run_id", "rule_version_id"),
  CONSTRAINT "simulation_rule_versions_tenant_run_fk"
    FOREIGN KEY ("tenant_id", "simulation_run_id")
    REFERENCES "simulation_runs" ("tenant_id", "id") ON DELETE RESTRICT
);
CREATE INDEX "simulation_rule_versions_rule_idx"
  ON "simulation_rule_versions" ("rule_version_id");
CREATE INDEX "simulation_rule_versions_tenant_run_idx"
  ON "simulation_rule_versions" ("tenant_id", "simulation_run_id");

INSERT INTO "simulation_rule_versions" ("tenant_id", "simulation_run_id", "rule_version_id", "purpose")
SELECT DISTINCT step."tenant_id", step."simulation_run_id", step."rule_version_id", 'calculation-step'
FROM "calculation_steps" AS step
ON CONFLICT DO NOTHING;

ALTER TABLE "audit_logs"
  ALTER COLUMN "actor_user_id" DROP NOT NULL,
  ADD COLUMN "actor_identity_id" uuid REFERENCES "user_identities"("id") ON DELETE RESTRICT,
  ADD COLUMN "correlation_id" varchar(120),
  ADD COLUMN "request_id" varchar(120);
CREATE INDEX "audit_correlation_idx" ON "audit_logs" ("correlation_id");
