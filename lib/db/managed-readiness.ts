export const managedPostgresMigrationMarker =
  "0005_pf03c_managed_postgresql_operational_readiness";

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
