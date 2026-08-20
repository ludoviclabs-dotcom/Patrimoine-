-- PF-04B: centralized RBAC plus explicit per-dossier client grants. Clerk
-- remains identity-only; PostgreSQL membership, grants and FORCE RLS decide.
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'session.mapped';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'authorization.denied';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'membership.changed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'member.invited';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'member.role.changed';

CREATE TABLE case_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL,
  user_identity_id uuid NOT NULL REFERENCES user_identities(id) ON DELETE RESTRICT,
  status varchar(24) NOT NULL DEFAULT 'active',
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT case_access_grants_tenant_case_identity_unique
    UNIQUE (tenant_id, case_id, user_identity_id),
  CONSTRAINT case_access_grants_tenant_case_fk
    FOREIGN KEY (tenant_id, case_id) REFERENCES client_cases(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT case_access_grants_status_check CHECK (status IN ('active', 'revoked'))
);
CREATE INDEX case_access_grants_identity_idx ON case_access_grants(user_identity_id);

REVOKE ALL ON TABLE case_access_grants FROM PUBLIC;
ALTER TABLE case_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_access_grants FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_security.client_case_access(
  p_tenant_id uuid,
  p_case_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT
    NULLIF(current_setting('app.role', true), '') <> 'client'
    OR EXISTS (
      SELECT 1
      FROM case_access_grants AS grant_record
      WHERE grant_record.tenant_id = p_tenant_id
        AND grant_record.case_id = p_case_id
        AND grant_record.user_identity_id =
          NULLIF(current_setting('app.user_id', true), '')::uuid
        AND grant_record.status = 'active'
        AND grant_record.revoked_at IS NULL
    )
$$;

REVOKE ALL ON FUNCTION app_security.client_case_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.client_case_access(uuid, uuid) TO patrimoine_app;

-- Clients can only read resources attached to a specifically granted dossier;
-- all mutations remain unavailable. Other roles retain membership-backed RLS.
DROP POLICY IF EXISTS tenant_member_isolation ON client_cases;
CREATE POLICY client_cases_read_by_grant ON client_cases
FOR SELECT TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND app_security.client_case_access(tenant_id, id)
);
CREATE POLICY client_cases_non_client_mutation ON client_cases
FOR ALL TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
)
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
);

DROP POLICY IF EXISTS tenant_member_isolation ON documents;
CREATE POLICY documents_read_by_grant ON documents
FOR SELECT TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND app_security.client_case_access(tenant_id, case_id)
);
CREATE POLICY documents_non_client_mutation ON documents
FOR ALL TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
)
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
);
CREATE POLICY documents_client_upload ON documents
FOR INSERT TO patrimoine_app
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') = 'client'
  AND app_security.client_case_access(tenant_id, case_id)
);

DROP POLICY IF EXISTS tenant_member_isolation ON private_document_metadata;
CREATE POLICY private_document_metadata_read_by_grant ON private_document_metadata
FOR SELECT TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND app_security.client_case_access(tenant_id, case_id)
);
CREATE POLICY private_document_metadata_non_client_mutation ON private_document_metadata
FOR ALL TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
)
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
);

-- Professional reports are not a client capability in PF-04B.
DROP POLICY IF EXISTS tenant_member_isolation ON report_versions;
CREATE POLICY report_versions_non_client_access ON report_versions
FOR ALL TO patrimoine_app
USING (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
)
WITH CHECK (
  app_security.tenant_member_access(tenant_id)
  AND NULLIF(current_setting('app.role', true), '') <> 'client'
);

CREATE OR REPLACE FUNCTION app_security.managed_postgres_readiness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT jsonb_build_object(
    'migration', '0007_pf04b_authenticated_tenant_rbac',
    'rlsReady', (
      SELECT count(*) = 28
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
          'case_access_grants'
        ])
        AND relrowsecurity
        AND relforcerowsecurity
    )
  )
$$;

REVOKE ALL ON FUNCTION app_security.managed_postgres_readiness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.managed_postgres_readiness() TO patrimoine_app;
