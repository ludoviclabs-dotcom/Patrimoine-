export const managedPostgresMigrationMarker =
  "0010_pf07b_professional_review_signature";

export const managedPostgresRlsTables = [
  "tenants",
  "cabinets",
  "memberships",
  "users",
  "clients",
  "households",
  "client_cases",
  "assets",
  "liabilities",
  "documents",
  "simulation_runs",
  "calculation_steps",
  "simulation_rule_versions",
  "professional_reviews",
  "audit_logs",
  "report_versions",
  "dossier_snapshots",
  "professional_documents",
  "data_requests",
  "private_document_metadata",
  "retention_policies",
  "consents",
  "dpia_records",
  "rule_versions",
  "auth_provider_organizations",
  "auth_provider_memberships",
  "auth_webhook_events",
  "case_access_grants",
  "document_versions",
  "simulation_document_versions",
  "reports",
] as const;

export type DatabaseRuntimeRole = Readonly<{
  roleName: string;
  isSuperuser: boolean;
  bypassesRls: boolean;
  canAssumeApplicationRole: boolean;
  hasDirectTablePrivileges: boolean;
}>;

export function isProductionEnvironment(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

export function assertSafeDatabaseRuntimeRole(role: DatabaseRuntimeRole) {
  if (
    role.isSuperuser
    || role.bypassesRls
    || !role.canAssumeApplicationRole
    || role.hasDirectTablePrivileges
    || role.roleName === "patrimoine_app"
  ) {
    throw new Error("DATABASE_RUNTIME_ROLE_UNSAFE");
  }
}

/**
 * PF-07 — login identity behind CLERK_WEBHOOK_DATABASE_URL.
 *
 * The webhook leg is deliberately narrower than the application runtime: it
 * may assume patrimoine_webhook_service (whose only privilege is EXECUTE on
 * app_security.record_clerk_webhook_event) and nothing else. It must not be
 * the application runtime login, must not own a table, and must hold no direct
 * table privilege of its own — otherwise a compromised webhook endpoint would
 * reach tenant data that the SECURITY DEFINER function never exposes.
 */
export type DatabaseWebhookRole = Readonly<{
  roleName: string;
  isSuperuser: boolean;
  bypassesRls: boolean;
  canAssumeWebhookRole: boolean;
  canAssumeApplicationRole: boolean;
  hasDirectTablePrivileges: boolean;
  ownsTables: boolean;
}>;

export function assertSafeClerkWebhookRole(role: DatabaseWebhookRole) {
  if (
    role.isSuperuser
    || role.bypassesRls
    || !role.canAssumeWebhookRole
    || role.canAssumeApplicationRole
    || role.hasDirectTablePrivileges
    || role.ownsTables
    || role.roleName === "patrimoine_webhook_service"
  ) {
    throw new Error("CLERK_WEBHOOK_DATABASE_ROLE_UNSAFE");
  }
}
