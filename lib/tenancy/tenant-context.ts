import { randomUUID } from "node:crypto";

const tenantContextBrand: unique symbol = Symbol("tenant-context");

export type TenantContextRole = "admin" | "conseiller" | "expert" | "client" | "auditeur";
export type TenantContextSource = "demo-fixture" | "internal-test" | "server-config" | "clerk-session";

export type TenantContext = Readonly<{
  tenantId: string;
  identityId: string;
  role: TenantContextRole;
  source: TenantContextSource;
  correlationId: string;
  [tenantContextBrand]: true;
}>;

type InternalTenantContextInput = {
  tenantId: string;
  identityId: string;
  role: TenantContextRole;
  source: TenantContextSource;
  correlationId?: string;
};

function required(value: string, code: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(code);
  }

  return normalized;
}

/**
 * Internal-only context constructor for server configuration, fixtures and tests.
 * Route bodies and browser-provided tenant identifiers must never be passed here.
 */
export function createInternalTenantContext(input: InternalTenantContextInput): TenantContext {
  return Object.freeze({
    tenantId: required(input.tenantId, "TENANT_CONTEXT_TENANT_REQUIRED"),
    identityId: required(input.identityId, "TENANT_CONTEXT_IDENTITY_REQUIRED"),
    role: input.role,
    source: input.source,
    correlationId: required(input.correlationId ?? randomUUID(), "TENANT_CONTEXT_CORRELATION_REQUIRED"),
    [tenantContextBrand]: true as const,
  });
}

export function createServerTenantContext(
  env: NodeJS.ProcessEnv = process.env,
): TenantContext {
  return createInternalTenantContext({
    tenantId: required(env.INTERNAL_TENANT_ID ?? "", "INTERNAL_TENANT_ID_REQUIRED"),
    identityId: required(env.INTERNAL_IDENTITY_ID ?? "", "INTERNAL_IDENTITY_ID_REQUIRED"),
    role: (env.INTERNAL_TENANT_ROLE as TenantContextRole | undefined) ?? "admin",
    source: "server-config",
  });
}

export function assertTenantOwnership(context: TenantContext, recordTenantId: string) {
  if (context.tenantId !== recordTenantId) {
    throw new Error("TENANT_OWNERSHIP_VIOLATION");
  }
}
