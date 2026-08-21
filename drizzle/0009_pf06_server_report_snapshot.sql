-- PF-06: server-rendered fiscal reports built from an immutable snapshot.
-- The existing report_versions table stays authoritative and gains the
-- snapshot, hashes, private object pointer and validation provenance. A
-- validation never mutates a delivered version: it appends version n+1.
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'report.generated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'report.validated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'report.download.authorized';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'report.downloaded';

CREATE TABLE "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  "case_id" uuid NOT NULL,
  "title" varchar(220) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'draft',
  "current_version_number" integer NOT NULL DEFAULT 0,
  "created_by_identity_id" uuid NOT NULL
    REFERENCES "user_identities" ("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "archived_at" timestamptz,
  CONSTRAINT "reports_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "reports_tenant_case_unique" UNIQUE ("tenant_id", "case_id"),
  CONSTRAINT "reports_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT
);

CREATE INDEX "reports_tenant_case_idx" ON "reports" ("tenant_id", "case_id");

ALTER TABLE "report_versions"
  ADD COLUMN IF NOT EXISTS "report_id" uuid,
  ADD COLUMN IF NOT EXISTS "version_number" integer,
  ADD COLUMN IF NOT EXISTS "legal_freeze_date" date,
  ADD COLUMN IF NOT EXISTS "snapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "snapshot_sha256" varchar(64),
  ADD COLUMN IF NOT EXISTS "business_sha256" varchar(64),
  ADD COLUMN IF NOT EXISTS "pdf_blob_key" text,
  ADD COLUMN IF NOT EXISTS "pdf_sha256" varchar(64),
  ADD COLUMN IF NOT EXISTS "pdf_byte_size" bigint,
  ADD COLUMN IF NOT EXISTS "watermark" varchar(64),
  ADD COLUMN IF NOT EXISTS "validation_block" jsonb,
  ADD COLUMN IF NOT EXISTS "generator_version" varchar(64),
  ADD COLUMN IF NOT EXISTS "generated_by_identity_id" uuid
    REFERENCES "user_identities" ("id") ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "validated_by_identity_id" uuid
    REFERENCES "user_identities" ("id") ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "validated_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz;

ALTER TABLE "report_versions"
  ADD CONSTRAINT "report_versions_tenant_report_fk"
    FOREIGN KEY ("tenant_id", "report_id")
    REFERENCES "reports" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "report_versions_report_number_unique"
    UNIQUE ("report_id", "version_number"),
  ADD CONSTRAINT "report_versions_pdf_blob_key_unique" UNIQUE ("pdf_blob_key"),
  -- A server-generated version carries its complete provenance or does not
  -- exist. Legacy fixture rows keep report_id NULL and are never downloadable.
  ADD CONSTRAINT "report_versions_server_generated_check" CHECK (
    "report_id" IS NULL
    OR (
      "version_number" > 0
      AND "snapshot" IS NOT NULL
      AND "snapshot_sha256" ~ '^[0-9a-f]{64}$'
      AND "business_sha256" ~ '^[0-9a-f]{64}$'
      AND "pdf_sha256" ~ '^[0-9a-f]{64}$'
      AND "pdf_byte_size" > 0
      AND "pdf_blob_key" IS NOT NULL
      AND "validation_block" IS NOT NULL
      AND "generator_version" IS NOT NULL
      AND "generated_by_identity_id" IS NOT NULL
      AND "legal_freeze_date" IS NOT NULL
    )
  ),
  -- The object key carries identifiers only: never a client name, a dossier
  -- reference or any other personal data.
  ADD CONSTRAINT "report_versions_pdf_blob_key_shape_check" CHECK (
    "pdf_blob_key" IS NULL
    OR "pdf_blob_key" ~ ('^tenants/' || "tenant_id" || '/reports/' || "report_id"
      || '/versions/' || "id" || '$')
  );

CREATE INDEX "report_versions_report_idx"
  ON "report_versions" ("report_id", "version_number");

-- A delivered version is never mutated. Validation appends version n+1; the
-- validated version is a new immutable row, not an edit of the draft.
CREATE OR REPLACE FUNCTION enforce_report_version_immutability()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'report version rows are append-only';
  END IF;

  IF OLD."report_id" IS NOT NULL THEN
    RAISE EXCEPTION 'report version content is immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION enforce_report_version_immutability() FROM PUBLIC;

DROP TRIGGER IF EXISTS report_versions_immutability ON "report_versions";
CREATE TRIGGER report_versions_immutability
BEFORE UPDATE OR DELETE ON "report_versions"
FOR EACH ROW EXECUTE FUNCTION enforce_report_version_immutability();

REVOKE ALL ON TABLE "reports" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE "reports" TO patrimoine_app;
GRANT SELECT, INSERT, UPDATE ON TABLE "reports" TO patrimoine_fixture_service;

ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" FORCE ROW LEVEL SECURITY;

-- Professional reports are not a client capability (PF-04B).
CREATE POLICY reports_non_client_access ON "reports"
TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
)
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
);
CREATE POLICY reports_demo_seed_isolation ON "reports"
TO patrimoine_fixture_service
USING (app_security.demo_seed_access(tenant_id))
WITH CHECK (app_security.demo_seed_access(tenant_id));

CREATE OR REPLACE FUNCTION app_security.managed_postgres_readiness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT jsonb_build_object(
    'migration', '0009_pf06_server_report_snapshot',
    'rlsReady', (
      SELECT count(*) = 31
      FROM pg_catalog.pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relname = ANY (ARRAY[
          'tenants', 'cabinets', 'memberships', 'users', 'clients', 'households',
          'client_cases', 'assets', 'liabilities', 'documents', 'simulation_runs',
          'calculation_steps', 'simulation_rule_versions', 'professional_reviews',
          'audit_logs', 'report_versions', 'dossier_snapshots',
          'professional_documents', 'data_requests', 'private_document_metadata',
          'retention_policies', 'consents', 'dpia_records', 'rule_versions',
          'auth_provider_organizations', 'auth_provider_memberships', 'auth_webhook_events',
          'case_access_grants', 'document_versions', 'simulation_document_versions',
          'reports'
        ])
        AND relrowsecurity
        AND relforcerowsecurity
    )
  )
$$;

REVOKE ALL ON FUNCTION app_security.managed_postgres_readiness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.managed_postgres_readiness() TO patrimoine_app;
