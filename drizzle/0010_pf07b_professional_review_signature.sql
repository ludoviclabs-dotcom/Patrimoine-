-- PF-07B — let an authenticated professional sign a review.
--
-- professional_reviews was the last actor column still bound NOT NULL to the
-- v1 `users` table. Every actor column added since PF-03A points at
-- `user_identities` instead, because a Clerk session resolves to an identity
-- and there is no linkage between the two tables. The existing PF-06 tests only
-- insert a review because the demo fixture happens to give users[2] and
-- user_identities[2] the same UUID; a real authenticated expert has no such
-- coincidence, so the readiness gate could never be opened through the product.
--
-- This mirrors, line for line, what PF-03A already did to audit_logs
-- (drizzle/0003, "ALTER COLUMN actor_user_id DROP NOT NULL" +
-- "ADD COLUMN actor_identity_id"). It is additive: no row is rewritten, legacy
-- rows keep their reviewer_user_id, and no fiscal rule, rate, threshold,
-- effective date, calculation step or golden result is touched.

ALTER TABLE "professional_reviews"
  ALTER COLUMN "reviewer_user_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "reviewer_identity_id" uuid
    REFERENCES "user_identities"("id") ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS "signed_by_role" varchar(32);

-- A review always names who signed it, on one model or the other. A row with
-- neither reviewer is refused rather than stored as anonymous.
ALTER TABLE "professional_reviews"
  DROP CONSTRAINT IF EXISTS "professional_reviews_reviewer_present_check";
ALTER TABLE "professional_reviews"
  ADD CONSTRAINT "professional_reviews_reviewer_present_check"
  CHECK ("reviewer_user_id" IS NOT NULL OR "reviewer_identity_id" IS NOT NULL);

-- A decided review carries its decision timestamp; a pending one does not
-- pretend to have been signed.
ALTER TABLE "professional_reviews"
  DROP CONSTRAINT IF EXISTS "professional_reviews_decided_at_check";
ALTER TABLE "professional_reviews"
  ADD CONSTRAINT "professional_reviews_decided_at_check"
  CHECK ("decision" = 'pending' OR "reviewed_at" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "professional_reviews_reviewer_identity_idx"
  ON "professional_reviews" ("reviewer_identity_id");

-- PF-06 reads the newest review per dossier; this makes that read an index scan
-- rather than a sort over the dossier's whole review history.
CREATE INDEX IF NOT EXISTS "professional_reviews_tenant_case_created_idx"
  ON "professional_reviews" ("tenant_id", "case_id", "created_at" DESC);

CREATE OR REPLACE FUNCTION app_security.managed_postgres_readiness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT jsonb_build_object(
    'migration', '0010_pf07b_professional_review_signature',
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
