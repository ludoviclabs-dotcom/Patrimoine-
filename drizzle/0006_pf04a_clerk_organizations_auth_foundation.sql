-- PF-04A keeps Clerk as an identity and organization UX provider. Internal
-- memberships remain the authorization source; no webhook can create one.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'patrimoine_webhook_service') THEN
    CREATE ROLE patrimoine_webhook_service
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

GRANT patrimoine_webhook_service TO CURRENT_USER;
GRANT USAGE ON SCHEMA app_security TO patrimoine_webhook_service;

CREATE TABLE IF NOT EXISTS auth_provider_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider varchar(32) NOT NULL,
  provider_organization_id varchar(191) NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE RESTRICT,
  slug varchar(191),
  display_name varchar(160),
  observed_status varchar(24) NOT NULL DEFAULT 'active',
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_provider_organizations_provider_org_unique
    UNIQUE (provider, provider_organization_id)
);
CREATE INDEX IF NOT EXISTS auth_provider_organizations_tenant_idx
  ON auth_provider_organizations (tenant_id);

CREATE TABLE IF NOT EXISTS auth_provider_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider varchar(32) NOT NULL,
  provider_organization_id varchar(191) NOT NULL,
  provider_subject varchar(191) NOT NULL,
  provider_role varchar(96),
  observed_status varchar(24) NOT NULL DEFAULT 'active',
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_provider_memberships_provider_org_subject_unique
    UNIQUE (provider, provider_organization_id, provider_subject)
);
CREATE INDEX IF NOT EXISTS auth_provider_memberships_provider_subject_idx
  ON auth_provider_memberships (provider, provider_subject);

CREATE TABLE IF NOT EXISTS auth_webhook_events (
  provider varchar(32) NOT NULL,
  event_id varchar(191) NOT NULL,
  event_type varchar(96) NOT NULL,
  payload_sha256 varchar(64) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_webhook_events_provider_event_pk PRIMARY KEY (provider, event_id),
  CONSTRAINT auth_webhook_events_sha256_check CHECK (payload_sha256 ~ '^[0-9a-f]{64}$')
);

REVOKE ALL ON TABLE auth_provider_organizations, auth_provider_memberships, auth_webhook_events FROM PUBLIC;
ALTER TABLE auth_provider_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_provider_organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE auth_provider_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_provider_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE auth_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_webhook_events FORCE ROW LEVEL SECURITY;

-- The resolver returns only an internal context after independently proving
-- the signed Clerk session's user and active organization against DB state.
CREATE OR REPLACE FUNCTION app_security.resolve_clerk_context(
  p_clerk_user_id text,
  p_clerk_organization_id text
)
RETURNS TABLE (tenant_id uuid, identity_id uuid, role user_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT organization.tenant_id, identity.id, membership.role
  FROM auth_provider_organizations AS organization
  JOIN user_identities AS identity
    ON identity.provider = 'clerk'
   AND identity.provider_subject = p_clerk_user_id
   AND identity.disabled_at IS NULL
  JOIN memberships AS membership
    ON membership.tenant_id = organization.tenant_id
   AND membership.user_identity_id = identity.id
   AND membership.status = 'active'
   AND membership.revoked_at IS NULL
  JOIN auth_provider_memberships AS provider_membership
    ON provider_membership.provider = 'clerk'
   AND provider_membership.provider_organization_id = organization.provider_organization_id
   AND provider_membership.provider_subject = p_clerk_user_id
   AND provider_membership.observed_status = 'active'
  WHERE organization.provider = 'clerk'
    AND organization.provider_organization_id = p_clerk_organization_id
    AND organization.tenant_id IS NOT NULL
    AND organization.observed_status = 'active'
$$;

REVOKE ALL ON FUNCTION app_security.resolve_clerk_context(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.resolve_clerk_context(text, text) TO patrimoine_app;

-- A dedicated webhook service role records signed Clerk observations. It does
-- not receive table grants and never creates, changes or revokes memberships.
CREATE OR REPLACE FUNCTION app_security.record_clerk_webhook_event(
  p_event_id text,
  p_event_type text,
  p_payload_sha256 text,
  p_user_id text,
  p_email text,
  p_display_name text,
  p_organization_id text,
  p_organization_slug text,
  p_organization_name text,
  p_membership_status text,
  p_membership_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  inserted_event_id text;
BEGIN
  IF p_event_id IS NULL OR length(trim(p_event_id)) = 0
    OR p_payload_sha256 IS NULL OR p_payload_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'CLERK_WEBHOOK_EVENT_INVALID';
  END IF;

  INSERT INTO auth_webhook_events (provider, event_id, event_type, payload_sha256)
  VALUES ('clerk', p_event_id, p_event_type, p_payload_sha256)
  ON CONFLICT (provider, event_id) DO NOTHING
  RETURNING event_id INTO inserted_event_id;

  IF inserted_event_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_user_id IS NOT NULL AND p_email IS NOT NULL AND p_display_name IS NOT NULL THEN
    INSERT INTO user_identities (provider, provider_subject, email_normalized, display_name)
    VALUES ('clerk', p_user_id, lower(p_email), p_display_name)
    ON CONFLICT (provider, provider_subject) DO UPDATE
      SET email_normalized = EXCLUDED.email_normalized,
          display_name = EXCLUDED.display_name,
          updated_at = now();
  END IF;

  IF p_organization_id IS NOT NULL THEN
    INSERT INTO auth_provider_organizations
      (provider, provider_organization_id, slug, display_name, observed_status, observed_at)
    VALUES ('clerk', p_organization_id, p_organization_slug, p_organization_name, 'active', now())
    ON CONFLICT (provider, provider_organization_id) DO UPDATE
      SET slug = COALESCE(EXCLUDED.slug, auth_provider_organizations.slug),
          display_name = COALESCE(EXCLUDED.display_name, auth_provider_organizations.display_name),
          observed_status = 'active',
          observed_at = now(),
          updated_at = now();
  END IF;

  IF p_organization_id IS NOT NULL AND p_user_id IS NOT NULL AND p_membership_status IS NOT NULL THEN
    INSERT INTO auth_provider_memberships
      (provider, provider_organization_id, provider_subject, provider_role, observed_status, observed_at)
    VALUES ('clerk', p_organization_id, p_user_id, p_membership_role, p_membership_status, now())
    ON CONFLICT (provider, provider_organization_id, provider_subject) DO UPDATE
      SET provider_role = EXCLUDED.provider_role,
          observed_status = EXCLUDED.observed_status,
          observed_at = now(),
          updated_at = now();
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION app_security.record_clerk_webhook_event(
  text, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.record_clerk_webhook_event(
  text, text, text, text, text, text, text, text, text, text, text
) TO patrimoine_webhook_service;

CREATE OR REPLACE FUNCTION app_security.managed_postgres_readiness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT jsonb_build_object(
    'migration', '0006_pf04a_clerk_organizations_auth_foundation',
    'rlsReady', (
      SELECT count(*) = 27
      FROM pg_catalog.pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relname = ANY (ARRAY[
          'tenants', 'cabinets', 'memberships', 'users', 'clients', 'households',
          'client_cases', 'assets', 'liabilities', 'documents', 'simulation_runs',
          'calculation_steps', 'simulation_rule_versions', 'professional_reviews',
          'audit_logs', 'report_versions', 'dossier_snapshots',
          'professional_documents', 'data_requests', 'private_document_metadata',
          'retention_policies', 'consents', 'dpia_records', 'rule_versions',
          'auth_provider_organizations', 'auth_provider_memberships', 'auth_webhook_events'
        ])
        AND relrowsecurity
        AND relforcerowsecurity
    )
  )
$$;

REVOKE ALL ON FUNCTION app_security.managed_postgres_readiness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.managed_postgres_readiness() TO patrimoine_app;
