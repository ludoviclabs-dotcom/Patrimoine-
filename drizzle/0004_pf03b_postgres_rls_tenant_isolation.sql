ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'case.updated';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'case.deleted';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'document.metadata.read';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'patrimoine_app') THEN
    CREATE ROLE patrimoine_app
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'patrimoine_fixture_service') THEN
    CREATE ROLE patrimoine_fixture_service
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;

-- The deployment identity is the only repository-managed principal allowed to
-- assume the demo fixture service role. Application logins are never granted it.
GRANT patrimoine_fixture_service TO CURRENT_USER;

CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO patrimoine_app, patrimoine_fixture_service;

CREATE OR REPLACE FUNCTION app_security.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_security.tenant_member_access(target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT
    target_tenant_id IS NOT NULL
    AND target_tenant_id = app_security.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.memberships AS membership
      WHERE membership.tenant_id = target_tenant_id
        AND membership.user_identity_id =
          NULLIF(current_setting('app.user_id', true), '')::uuid
        AND membership.role::text = NULLIF(current_setting('app.role', true), '')
        AND membership.status = 'active'
        AND membership.revoked_at IS NULL
    )
$$;

CREATE OR REPLACE FUNCTION app_security.demo_seed_access(target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    current_user = 'patrimoine_fixture_service'
    AND NULLIF(current_setting('app.service_operation', true), '') = 'demo_fixture_seed'
    AND target_tenant_id = app_security.current_tenant_id()
$$;

REVOKE ALL ON FUNCTION app_security.current_tenant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_security.tenant_member_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_security.demo_seed_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.current_tenant_id()
  TO patrimoine_app, patrimoine_fixture_service;
GRANT EXECUTE ON FUNCTION app_security.tenant_member_access(uuid) TO patrimoine_app;
GRANT EXECUTE ON FUNCTION app_security.demo_seed_access(uuid) TO patrimoine_fixture_service;

ALTER TABLE "client_cases"
  ADD CONSTRAINT "cases_tenant_assigned_expert_fk"
    FOREIGN KEY ("tenant_id", "assigned_expert_user_id")
    REFERENCES "users" ("tenant_id", "id") ON DELETE RESTRICT;

ALTER TABLE "professional_reviews"
  ADD CONSTRAINT "professional_reviews_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "professional_reviews_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "professional_reviews_tenant_reviewer_fk"
    FOREIGN KEY ("tenant_id", "reviewer_user_id")
    REFERENCES "users" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "reviews_tenant_case_idx"
  ON "professional_reviews" ("tenant_id", "case_id");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "audit_logs_tenant_actor_user_fk"
    FOREIGN KEY ("tenant_id", "actor_user_id")
    REFERENCES "users" ("tenant_id", "id") ON DELETE RESTRICT;

ALTER TABLE "report_versions"
  ADD CONSTRAINT "report_versions_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "report_versions_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "report_versions_tenant_reviewer_fk"
    FOREIGN KEY ("tenant_id", "reviewer_user_id")
    REFERENCES "users" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "report_versions_tenant_case_idx"
  ON "report_versions" ("tenant_id", "case_id");

ALTER TABLE "dossier_snapshots"
  ADD CONSTRAINT "dossier_snapshots_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "dossier_snapshots_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "dossier_snapshots_tenant_household_fk"
    FOREIGN KEY ("tenant_id", "household_id")
    REFERENCES "households" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "dossier_snapshots_tenant_case_idx"
  ON "dossier_snapshots" ("tenant_id", "case_id");

ALTER TABLE "professional_documents"
  ADD CONSTRAINT "professional_documents_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "professional_documents_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "professional_documents_tenant_case_idx"
  ON "professional_documents" ("tenant_id", "case_id");

ALTER TABLE "data_requests"
  ADD CONSTRAINT "data_requests_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "data_requests_tenant_client_fk"
    FOREIGN KEY ("tenant_id", "client_id")
    REFERENCES "clients" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "data_requests_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "data_requests_tenant_case_idx"
  ON "data_requests" ("tenant_id", "case_id");

ALTER TABLE "private_document_metadata"
  ADD CONSTRAINT "private_document_metadata_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "private_document_metadata_tenant_client_fk"
    FOREIGN KEY ("tenant_id", "client_id")
    REFERENCES "clients" ("tenant_id", "id") ON DELETE RESTRICT,
  ADD CONSTRAINT "private_document_metadata_tenant_case_fk"
    FOREIGN KEY ("tenant_id", "case_id")
    REFERENCES "client_cases" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "private_document_metadata_tenant_case_idx"
  ON "private_document_metadata" ("tenant_id", "case_id");

ALTER TABLE "consents"
  ADD CONSTRAINT "consents_tenant_id_unique" UNIQUE ("tenant_id", "id"),
  ADD CONSTRAINT "consents_tenant_client_fk"
    FOREIGN KEY ("tenant_id", "client_id")
    REFERENCES "clients" ("tenant_id", "id") ON DELETE RESTRICT;
CREATE INDEX "consents_tenant_client_idx"
  ON "consents" ("tenant_id", "client_id");

CREATE OR REPLACE FUNCTION validate_audit_actor_tenant()
RETURNS trigger AS $$
BEGIN
  IF NEW.actor_user_id IS NULL AND NEW.actor_identity_id IS NULL THEN
    RAISE EXCEPTION 'audit actor is required';
  END IF;

  IF NEW.actor_identity_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM memberships AS membership
    WHERE membership.tenant_id = NEW.tenant_id
      AND membership.user_identity_id = NEW.actor_identity_id
  ) THEN
    RAISE EXCEPTION 'audit actor identity does not belong to tenant';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS audit_logs_validate_actor_tenant ON "audit_logs";
CREATE TRIGGER audit_logs_validate_actor_tenant
BEFORE INSERT ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION validate_audit_actor_tenant();

CREATE OR REPLACE FUNCTION validate_tenant_rule_version_linkage()
RETURNS trigger AS $$
DECLARE
  linked_rule_tenant_id uuid;
BEGIN
  SELECT tenant_id
  INTO linked_rule_tenant_id
  FROM rule_versions
  WHERE id = NEW.rule_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'linked rule version does not exist';
  END IF;

  IF linked_rule_tenant_id IS NOT NULL AND linked_rule_tenant_id <> NEW.tenant_id THEN
    RAISE EXCEPTION 'rule version tenant does not match persisted trace tenant';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off;

REVOKE ALL ON FUNCTION validate_tenant_rule_version_linkage() FROM PUBLIC;
DROP TRIGGER IF EXISTS calculation_steps_validate_rule_tenant ON "calculation_steps";
CREATE TRIGGER calculation_steps_validate_rule_tenant
BEFORE INSERT OR UPDATE OF tenant_id, rule_version_id ON "calculation_steps"
FOR EACH ROW EXECUTE FUNCTION validate_tenant_rule_version_linkage();
DROP TRIGGER IF EXISTS simulation_rule_versions_validate_rule_tenant
  ON "simulation_rule_versions";
CREATE TRIGGER simulation_rule_versions_validate_rule_tenant
BEFORE INSERT OR UPDATE OF tenant_id, rule_version_id ON "simulation_rule_versions"
FOR EACH ROW EXECUTE FUNCTION validate_tenant_rule_version_linkage();

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO patrimoine_app, patrimoine_fixture_service;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "tenants", "cabinets", "memberships", "users", "clients", "households",
  "client_cases", "assets", "liabilities", "documents", "simulation_runs",
  "calculation_steps", "simulation_rule_versions", "professional_reviews",
  "report_versions", "dossier_snapshots", "professional_documents",
  "data_requests", "private_document_metadata", "retention_policies",
  "consents", "dpia_records"
TO patrimoine_app;
GRANT SELECT, INSERT ON TABLE "audit_logs" TO patrimoine_app;
GRANT SELECT ON TABLE "evidence_sources", "rule_versions" TO patrimoine_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "tenants", "cabinets", "user_identities", "memberships", "users", "clients",
  "households", "client_cases", "assets", "liabilities", "documents",
  "simulation_runs", "calculation_steps", "simulation_rule_versions",
  "professional_reviews", "report_versions", "dossier_snapshots",
  "professional_documents", "data_requests", "private_document_metadata",
  "retention_policies", "consents", "dpia_records"
TO patrimoine_fixture_service;
GRANT SELECT, INSERT ON TABLE "audit_logs" TO patrimoine_fixture_service;
GRANT SELECT ON TABLE "evidence_sources", "rule_versions" TO patrimoine_fixture_service;

DO $$
DECLARE
  tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'cabinets', 'memberships', 'users', 'clients', 'households', 'client_cases',
    'assets', 'liabilities', 'documents', 'simulation_runs', 'calculation_steps',
    'simulation_rule_versions', 'professional_reviews', 'report_versions',
    'dossier_snapshots', 'professional_documents', 'data_requests',
    'private_document_metadata', 'retention_policies', 'consents', 'dpia_records'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS tenant_member_isolation ON %I', tenant_table);
    EXECUTE format(
      'CREATE POLICY tenant_member_isolation ON %I TO patrimoine_app USING (app_security.tenant_member_access(tenant_id)) WITH CHECK (app_security.tenant_member_access(tenant_id))',
      tenant_table
    );
    EXECUTE format('DROP POLICY IF EXISTS demo_seed_isolation ON %I', tenant_table);
    EXECUTE format(
      'CREATE POLICY demo_seed_isolation ON %I TO patrimoine_fixture_service USING (app_security.demo_seed_access(tenant_id)) WITH CHECK (app_security.demo_seed_access(tenant_id))',
      tenant_table
    );
  END LOOP;
END $$;

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_member_isolation ON "tenants";
CREATE POLICY tenants_member_isolation ON "tenants"
TO patrimoine_app
USING (app_security.tenant_member_access(id))
WITH CHECK (app_security.tenant_member_access(id));
DROP POLICY IF EXISTS tenants_demo_seed_isolation ON "tenants";
CREATE POLICY tenants_demo_seed_isolation ON "tenants"
TO patrimoine_fixture_service
USING (app_security.demo_seed_access(id))
WITH CHECK (app_security.demo_seed_access(id));

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_member_select ON "audit_logs";
CREATE POLICY audit_logs_member_select ON "audit_logs"
FOR SELECT TO patrimoine_app
USING (app_security.tenant_member_access(tenant_id));
DROP POLICY IF EXISTS audit_logs_member_insert ON "audit_logs";
CREATE POLICY audit_logs_member_insert ON "audit_logs"
FOR INSERT TO patrimoine_app
WITH CHECK (app_security.tenant_member_access(tenant_id));
DROP POLICY IF EXISTS audit_logs_demo_seed_select ON "audit_logs";
CREATE POLICY audit_logs_demo_seed_select ON "audit_logs"
FOR SELECT TO patrimoine_fixture_service
USING (app_security.demo_seed_access(tenant_id));
DROP POLICY IF EXISTS audit_logs_demo_seed_insert ON "audit_logs";
CREATE POLICY audit_logs_demo_seed_insert ON "audit_logs"
FOR INSERT TO patrimoine_fixture_service
WITH CHECK (app_security.demo_seed_access(tenant_id));

ALTER TABLE "rule_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rule_versions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rule_versions_member_select ON "rule_versions";
CREATE POLICY rule_versions_member_select ON "rule_versions"
FOR SELECT TO patrimoine_app
USING (
  app_security.tenant_member_access(app_security.current_tenant_id())
  AND (tenant_id IS NULL OR tenant_id = app_security.current_tenant_id())
);
DROP POLICY IF EXISTS rule_versions_demo_seed_select ON "rule_versions";
CREATE POLICY rule_versions_demo_seed_select ON "rule_versions"
FOR SELECT TO patrimoine_fixture_service
USING (
  tenant_id IS NULL
  OR app_security.demo_seed_access(tenant_id)
);
