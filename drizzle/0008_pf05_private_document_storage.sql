-- PF-05: private, versioned document storage bound to the PF-03 metadata model.
-- No parallel document model is introduced: documents/client_cases/tenant/audit
-- stay authoritative, and document_versions becomes the append-only evidence
-- record for the bytes actually stored in the private blob container.
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'document.version.created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'document.download.authorized';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'document.downloaded';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'document.quarantined';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'document.deleted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'document.evidence.linked';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_storage_status') THEN
    CREATE TYPE document_storage_status AS ENUM ('pending', 'available', 'quarantined', 'deleted');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_version_status') THEN
    CREATE TYPE document_version_status AS ENUM ('pending', 'available', 'quarantined', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_scan_status') THEN
    CREATE TYPE document_scan_status AS ENUM ('pending', 'clean', 'infected');
  END IF;
END $$;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "storage_status" document_storage_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "current_version_number" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;

-- An existing metadata-only row has no stored object; it must never be treated
-- as a downloadable document.
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_storage_pointer_check"
    CHECK (
      ("storage_status" = 'available' AND "blob_path" IS NOT NULL AND "current_version_number" > 0)
      OR ("storage_status" <> 'available')
    );

CREATE TABLE "document_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  "document_id" uuid NOT NULL,
  "case_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "blob_key" text NOT NULL,
  "storage_provider" varchar(64) NOT NULL DEFAULT 'vercel-blob-private',
  "visibility" varchar(16) NOT NULL DEFAULT 'private',
  "status" document_version_status NOT NULL DEFAULT 'pending',
  "scan_status" document_scan_status NOT NULL DEFAULT 'pending',
  "original_file_name" text NOT NULL,
  "mime_type" varchar(160) NOT NULL,
  "byte_size" bigint NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "uploaded_by_identity_id" uuid NOT NULL
    REFERENCES "user_identities" ("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "available_at" timestamptz,
  CONSTRAINT "document_versions_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "document_versions_document_number_unique" UNIQUE ("document_id", "version_number"),
  CONSTRAINT "document_versions_blob_key_unique" UNIQUE ("blob_key"),
  CONSTRAINT "document_versions_version_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "document_versions_byte_size_check" CHECK ("byte_size" > 0),
  CONSTRAINT "document_versions_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  -- No blob is ever public, and the object key carries identifiers only:
  -- never a file name, a client name or any other personal data.
  CONSTRAINT "document_versions_visibility_check" CHECK ("visibility" = 'private'),
  CONSTRAINT "document_versions_blob_key_shape_check" CHECK (
    "blob_key" ~ ('^tenants/' || "tenant_id" || '/dossiers/' || "case_id"
      || '/documents/' || "document_id" || '/versions/' || "id" || '$')
  ),
  CONSTRAINT "document_versions_tenant_document_fk"
    FOREIGN KEY ("tenant_id", "document_id")
    REFERENCES "documents" ("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "document_versions_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT
);

CREATE INDEX "document_versions_tenant_document_idx"
  ON "document_versions" ("tenant_id", "document_id", "version_number" DESC);
CREATE INDEX "document_versions_tenant_case_idx"
  ON "document_versions" ("tenant_id", "case_id");

-- A replacing justificatif never destroys the previous version: rows are
-- append-only and their stored bytes, hash and provenance are immutable.
CREATE OR REPLACE FUNCTION enforce_document_version_immutability()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'document version rows are append-only';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."tenant_id" IS DISTINCT FROM OLD."tenant_id"
    OR NEW."document_id" IS DISTINCT FROM OLD."document_id"
    OR NEW."case_id" IS DISTINCT FROM OLD."case_id"
    OR NEW."version_number" IS DISTINCT FROM OLD."version_number"
    OR NEW."blob_key" IS DISTINCT FROM OLD."blob_key"
    OR NEW."sha256" IS DISTINCT FROM OLD."sha256"
    OR NEW."byte_size" IS DISTINCT FROM OLD."byte_size"
    OR NEW."mime_type" IS DISTINCT FROM OLD."mime_type"
    OR NEW."original_file_name" IS DISTINCT FROM OLD."original_file_name"
    OR NEW."uploaded_by_identity_id" IS DISTINCT FROM OLD."uploaded_by_identity_id"
    OR NEW."storage_provider" IS DISTINCT FROM OLD."storage_provider"
    OR NEW."visibility" IS DISTINCT FROM OLD."visibility"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION 'document version content is immutable';
  END IF;

  IF OLD."status" <> 'pending' AND NEW."status" = 'pending' THEN
    RAISE EXCEPTION 'document version status cannot return to pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION enforce_document_version_immutability() FROM PUBLIC;

DROP TRIGGER IF EXISTS document_versions_immutability ON "document_versions";
CREATE TRIGGER document_versions_immutability
BEFORE UPDATE OR DELETE ON "document_versions"
FOR EACH ROW EXECUTE FUNCTION enforce_document_version_immutability();

-- A client may complete an upload on a dossier explicitly granted to them, but
-- may never edit the business metadata of the document, nor declare their own
-- upload virus-free. The capability matrix already refuses it; this trigger is
-- the database-side defence.
CREATE OR REPLACE FUNCTION enforce_client_document_scope()
RETURNS trigger AS $$
BEGIN
  IF NULLIF(current_setting('app.role', true), '') <> 'client' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'documents' THEN
    IF NEW."id" IS DISTINCT FROM OLD."id"
      OR NEW."tenant_id" IS DISTINCT FROM OLD."tenant_id"
      OR NEW."client_id" IS DISTINCT FROM OLD."client_id"
      OR NEW."case_id" IS DISTINCT FROM OLD."case_id"
      OR NEW."kind" IS DISTINCT FROM OLD."kind"
      OR NEW."label" IS DISTINCT FROM OLD."label"
      OR NEW."required" IS DISTINCT FROM OLD."required"
      OR NEW."deleted_at" IS DISTINCT FROM OLD."deleted_at"
    THEN
      RAISE EXCEPTION 'client role may only advance document storage state';
    END IF;
  ELSE
    IF NEW."scan_status" IS DISTINCT FROM OLD."scan_status" THEN
      RAISE EXCEPTION 'client role may not record a document scan outcome';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION enforce_client_document_scope() FROM PUBLIC;

DROP TRIGGER IF EXISTS documents_client_scope ON "documents";
CREATE TRIGGER documents_client_scope
BEFORE UPDATE ON "documents"
FOR EACH ROW EXECUTE FUNCTION enforce_client_document_scope();

DROP TRIGGER IF EXISTS document_versions_client_scope ON "document_versions";
CREATE TRIGGER document_versions_client_scope
BEFORE UPDATE ON "document_versions"
FOR EACH ROW EXECUTE FUNCTION enforce_client_document_scope();

CREATE POLICY documents_client_storage_update ON "documents"
FOR UPDATE TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') = 'client'
  AND app_security.client_case_access(tenant_id, case_id)
)
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') = 'client'
  AND app_security.client_case_access(tenant_id, case_id)
);

-- Evidence linkage reuses the existing simulation trace shape
-- (see simulation_rule_versions) so a future report can cite one precise
-- document version and its hash.
CREATE TABLE "simulation_document_versions" (
  "tenant_id" uuid NOT NULL REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  "simulation_run_id" uuid NOT NULL,
  "document_version_id" uuid NOT NULL,
  "purpose" varchar(80) NOT NULL DEFAULT 'supporting-evidence',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "simulation_document_versions_pk"
    PRIMARY KEY ("simulation_run_id", "document_version_id"),
  CONSTRAINT "simulation_document_versions_tenant_run_fk"
    FOREIGN KEY ("tenant_id", "simulation_run_id")
    REFERENCES "simulation_runs" ("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "simulation_document_versions_tenant_version_fk"
    FOREIGN KEY ("tenant_id", "document_version_id")
    REFERENCES "document_versions" ("tenant_id", "id") ON DELETE RESTRICT
);

CREATE INDEX "simulation_document_versions_tenant_run_idx"
  ON "simulation_document_versions" ("tenant_id", "simulation_run_id");

REVOKE ALL ON TABLE "document_versions", "simulation_document_versions" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE "document_versions" TO patrimoine_app;
GRANT SELECT, INSERT ON TABLE "simulation_document_versions" TO patrimoine_app;
GRANT SELECT, INSERT, UPDATE ON TABLE "document_versions" TO patrimoine_fixture_service;
GRANT SELECT, INSERT ON TABLE "simulation_document_versions" TO patrimoine_fixture_service;

ALTER TABLE "document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "simulation_document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "simulation_document_versions" FORCE ROW LEVEL SECURITY;

-- Same predicate family as documents (PF-04B): membership plus, for a client,
-- an explicit non-revoked dossier grant.
CREATE POLICY document_versions_read_by_grant ON "document_versions"
FOR SELECT TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND app_security.client_case_access(tenant_id, case_id)
);
CREATE POLICY document_versions_non_client_mutation ON "document_versions"
FOR ALL TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
)
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
);
CREATE POLICY document_versions_client_upload ON "document_versions"
FOR INSERT TO patrimoine_app
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') = 'client'
  AND app_security.client_case_access(tenant_id, case_id)
);
CREATE POLICY document_versions_client_publish ON "document_versions"
FOR UPDATE TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') = 'client'
  AND app_security.client_case_access(tenant_id, case_id)
  AND uploaded_by_identity_id = NULLIF(current_setting('app.user_id', true), '')::uuid
)
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') = 'client'
  AND app_security.client_case_access(tenant_id, case_id)
  AND uploaded_by_identity_id = NULLIF(current_setting('app.user_id', true), '')::uuid
);
CREATE POLICY document_versions_demo_seed_isolation ON "document_versions"
TO patrimoine_fixture_service
USING (app_security.demo_seed_access(tenant_id))
WITH CHECK (app_security.demo_seed_access(tenant_id));

CREATE POLICY simulation_document_versions_member_isolation ON "simulation_document_versions"
TO patrimoine_app
USING (app_security.tenant_member_access(tenant_id))
WITH CHECK (app_security.tenant_member_access(tenant_id));
CREATE POLICY simulation_document_versions_demo_seed_isolation ON "simulation_document_versions"
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
    'migration', '0008_pf05_private_document_storage',
    'rlsReady', (
      SELECT count(*) = 30
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
          'case_access_grants', 'document_versions', 'simulation_document_versions'
        ])
        AND relrowsecurity
        AND relforcerowsecurity
    )
  )
$$;

REVOKE ALL ON FUNCTION app_security.managed_postgres_readiness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.managed_postgres_readiness() TO patrimoine_app;
