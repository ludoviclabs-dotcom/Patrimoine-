import type { TenantContextRole } from "../tenancy/tenant-context";

/**
 * PF-07 — the single declaration of the authenticated E2E matrix.
 *
 * The Clerk provisioning script, the database seed and the Playwright specs
 * all read this file, so a role can never drift between the identity provider,
 * the authoritative PostgreSQL membership and the journey that asserts it.
 *
 * These identities are automation-only. They carry `+clerk_test` addresses,
 * which Clerk treats as non-deliverable test addresses on a development
 * instance, and they never hold a password: sign-in goes through a short-lived
 * Backend-API ticket.
 */

export type E2EFixtureTenantKey = "CABINET_A" | "CABINET_B";
export type E2EFixtureRoleKey =
  | "E2E_ADVISER_A"
  | "E2E_EXPERT_A"
  | "E2E_CLIENT_A"
  | "E2E_EXPERT_B";

export type E2EFixtureTenant = Readonly<{
  key: E2EFixtureTenantKey;
  /** Internal tenant id seeded in PostgreSQL. */
  tenantId: string;
  cabinetId: string;
  clerkOrganizationName: string;
  organizationIdEnv: string;
}>;

export type E2EFixtureRole = Readonly<{
  key: E2EFixtureRoleKey;
  tenantKey: E2EFixtureTenantKey;
  email: string;
  firstName: string;
  lastName: string;
  /** Clerk organization role. Never an authorization source by itself. */
  clerkRole: string;
  /** Authoritative internal role, held in PostgreSQL. */
  internalRole: TenantContextRole;
  identityId: string;
  userIdEnv: string;
  /** Only a client needs an explicit dossier grant to see anything. */
  requiresCaseGrant: boolean;
}>;

const cabinetA: E2EFixtureTenant = {
  key: "CABINET_A",
  // Same tenant as the Claire & Marc demo fixture, so the journey exercises
  // the seeded dossier instead of an empty cabinet.
  tenantId: "11111111-1111-4111-8111-111111111111",
  cabinetId: "11111111-1111-4111-8111-111111111112",
  clerkOrganizationName: "CABINET_A",
  organizationIdEnv: "E2E_CLERK_ORG_CABINET_A",
};

const cabinetB: E2EFixtureTenant = {
  key: "CABINET_B",
  tenantId: "e2e0b000-0000-4000-8000-00000000000b",
  cabinetId: "e2e0b000-0000-4000-8000-00000000000c",
  clerkOrganizationName: "CABINET_B",
  organizationIdEnv: "E2E_CLERK_ORG_CABINET_B",
};

export const e2eClerkFixturePlan = {
  tenants: [cabinetA, cabinetB] as const,
  roles: [
    {
      key: "E2E_ADVISER_A",
      tenantKey: "CABINET_A",
      email: "pf07-adviser-a+clerk_test@example.com",
      firstName: "E2E",
      lastName: "Adviser A",
      clerkRole: "org:admin",
      internalRole: "conseiller",
      identityId: "e2e1a000-0000-4000-8000-000000000001",
      userIdEnv: "E2E_CLERK_USER_ADVISER_A",
      requiresCaseGrant: false,
    },
    {
      key: "E2E_EXPERT_A",
      tenantKey: "CABINET_A",
      email: "pf07-expert-a+clerk_test@example.com",
      firstName: "E2E",
      lastName: "Expert A",
      clerkRole: "org:member",
      internalRole: "expert",
      identityId: "e2e1a000-0000-4000-8000-000000000002",
      userIdEnv: "E2E_CLERK_USER_EXPERT_A",
      requiresCaseGrant: false,
    },
    {
      key: "E2E_CLIENT_A",
      tenantKey: "CABINET_A",
      email: "pf07-client-a+clerk_test@example.com",
      firstName: "E2E",
      lastName: "Client A",
      clerkRole: "org:member",
      internalRole: "client",
      identityId: "e2e1a000-0000-4000-8000-000000000003",
      userIdEnv: "E2E_CLERK_USER_CLIENT_A",
      requiresCaseGrant: true,
    },
    {
      key: "E2E_EXPERT_B",
      tenantKey: "CABINET_B",
      email: "pf07-expert-b+clerk_test@example.com",
      firstName: "E2E",
      lastName: "Expert B",
      clerkRole: "org:admin",
      internalRole: "expert",
      identityId: "e2e0b000-0000-4000-8000-000000000001",
      userIdEnv: "E2E_CLERK_USER_EXPERT_B",
      requiresCaseGrant: false,
    },
  ] as const satisfies readonly E2EFixtureRole[],
} as const;

export function e2eFixtureRole(key: E2EFixtureRoleKey): E2EFixtureRole {
  const role = e2eClerkFixturePlan.roles.find((candidate) => candidate.key === key);
  if (!role) throw new Error(`E2E_FIXTURE_ROLE_UNKNOWN:${key}`);
  return role;
}

export function e2eFixtureTenant(key: E2EFixtureTenantKey): E2EFixtureTenant {
  const tenant = e2eClerkFixturePlan.tenants.find((candidate) => candidate.key === key);
  if (!tenant) throw new Error(`E2E_FIXTURE_TENANT_UNKNOWN:${key}`);
  return tenant;
}

export type E2EIdentityEnvironment = Readonly<{
  users: Readonly<Partial<Record<E2EFixtureRoleKey, string>>>;
  organizations: Readonly<Partial<Record<E2EFixtureTenantKey, string>>>;
  complete: boolean;
  missing: readonly string[];
}>;

/**
 * Reads the provisioned Clerk identifiers. They are opaque ids, not secrets,
 * but they are still kept out of the repository because they name real objects
 * on a real instance.
 */
export function parseE2EIdentityEnvironment(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): E2EIdentityEnvironment {
  const users: Partial<Record<E2EFixtureRoleKey, string>> = {};
  const organizations: Partial<Record<E2EFixtureTenantKey, string>> = {};
  const missing: string[] = [];

  for (const role of e2eClerkFixturePlan.roles) {
    const value = env[role.userIdEnv]?.trim();
    if (value) users[role.key] = value;
    else missing.push(role.userIdEnv);
  }

  for (const tenant of e2eClerkFixturePlan.tenants) {
    const value = env[tenant.organizationIdEnv]?.trim();
    if (value) organizations[tenant.key] = value;
    else missing.push(tenant.organizationIdEnv);
  }

  return { users, organizations, complete: missing.length === 0, missing };
}
