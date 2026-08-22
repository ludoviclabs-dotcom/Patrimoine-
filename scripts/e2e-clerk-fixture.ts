import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  e2eClerkFixturePlan,
  parseE2EIdentityEnvironment,
  type E2EFixtureRole,
} from "../lib/auth/e2e-fixture-plan";

/**
 * PF-07 — synthetic, E2E-only Clerk identities.
 *
 * PF-06C4 left the authenticated Playwright journeys BLOCKED because the only
 * Clerk users on the instance are the owner's personal accounts: driving them
 * would mean handling human passwords, which this project refuses to do.
 *
 * This script provisions four identities that exist for automation only. No
 * password is ever set or read: the browser signs in through a short-lived
 * sign-in token minted by the Backend API (the `ticket` strategy), so the
 * credential never leaves Clerk and never reaches this repository.
 *
 *   npm run e2e:fixture -- status     names and mapping, no secret
 *   npm run e2e:fixture -- provision  create users + organization memberships
 *   npm run e2e:fixture -- revoke     delete the synthetic users
 */

const clerkApi = "https://api.clerk.com/v1";
const identityFile = join(process.cwd(), ".env.e2e.local");

type ClerkUser = Readonly<{
  id: string;
  email_addresses: ReadonlyArray<{ email_address: string }>;
}>;

type ClerkOrganization = Readonly<{ id: string; name: string; slug: string | null }>;

function secretKey() {
  const key = process.env.CLERK_SECRET_KEY?.trim();
  if (!key) throw new Error("CLERK_SECRET_KEY_REQUIRED");
  // The same guard @clerk/testing applies: automation never touches production.
  if (!key.startsWith("sk_test_")) {
    throw new Error("CLERK_FIXTURE_REFUSES_NON_DEVELOPMENT_INSTANCE");
  }
  return key;
}

async function clerkRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${clerkApi}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`CLERK_API_${response.status}:${path}:${detail.slice(0, 300)}`);
  }

  return response.status === 204 ? (undefined as T) : (await response.json()) as T;
}

function listData<T>(payload: unknown): readonly T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? data as T[] : [];
}

async function findOrganization(name: string): Promise<ClerkOrganization> {
  const organizations = listData<ClerkOrganization>(
    await clerkRequest<unknown>("/organizations?limit=100"),
  );
  const match = organizations.find((organization) => organization.name === name);
  if (!match) throw new Error(`CLERK_ORGANIZATION_NOT_FOUND:${name}`);
  return match;
}

async function findUserByEmail(email: string): Promise<ClerkUser | null> {
  const users = listData<ClerkUser>(
    await clerkRequest<unknown>(`/users?email_address=${encodeURIComponent(email)}&limit=10`),
  );
  return users.find((user) =>
    user.email_addresses.some((address) => address.email_address === email)) ?? null;
}

async function ensureUser(role: E2EFixtureRole) {
  const existing = await findUserByEmail(role.email);
  if (existing) return { id: existing.id, created: false } as const;

  const created = await clerkRequest<ClerkUser>("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [role.email],
      first_name: role.firstName,
      last_name: role.lastName,
      skip_password_requirement: true,
      public_metadata: { pf07E2EFixture: true, internalRole: role.internalRole },
    }),
  });

  return { id: created.id, created: true } as const;
}

async function isAlreadyMember(organizationId: string, userId: string) {
  const memberships = listData<{ public_user_data?: { user_id?: string } }>(
    await clerkRequest<unknown>(`/organizations/${organizationId}/memberships?limit=100`),
  );
  return memberships.some((membership) => membership.public_user_data?.user_id === userId);
}

async function ensureMembership(organizationId: string, userId: string, clerkRole: string) {
  // A development instance enforces its membership quota before it checks for
  // a duplicate, so re-running provision would fail on members that already
  // exist. Look first, create only when genuinely missing.
  if (await isAlreadyMember(organizationId, userId)) return "existing";

  try {
    await clerkRequest(`/organizations/${organizationId}/memberships`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role: clerkRole }),
    });
    return "created";
  } catch (error) {
    // Clerk answers 422 when the membership already exists; that is the
    // idempotent outcome, not a failure.
    if (error instanceof Error && /CLERK_API_422/.test(error.message)) return "existing";
    // A development instance caps organization memberships. Say so plainly
    // rather than failing with a raw provider payload.
    if (error instanceof Error && /organization_membership_quota_exceeded/.test(error.message)) {
      throw new Error("CLERK_ORGANIZATION_MEMBERSHIP_QUOTA_EXCEEDED");
    }
    throw error;
  }
}

async function provision() {
  const organizations = new Map<string, ClerkOrganization>();
  for (const tenant of e2eClerkFixturePlan.tenants) {
    organizations.set(tenant.key, await findOrganization(tenant.clerkOrganizationName));
  }

  const lines: string[] = [
    "# PF-07 — synthetic E2E identities. Opaque Clerk ids only, no secret.",
    "# Regenerate with: npm run e2e:fixture -- provision",
  ];

  for (const role of e2eClerkFixturePlan.roles) {
    const organization = organizations.get(role.tenantKey);
    if (!organization) throw new Error(`CLERK_ORGANIZATION_NOT_RESOLVED:${role.tenantKey}`);

    const user = await ensureUser(role);
    const membership = await ensureMembership(organization.id, user.id, role.clerkRole);
    lines.push(`${role.userIdEnv}=${user.id}`);
    process.stdout.write(
      `${role.key.padEnd(16)} user=${user.id} ${user.created ? "created" : "existing"}`
      + ` membership=${membership} org=${organization.name}\n`,
    );
  }

  for (const tenant of e2eClerkFixturePlan.tenants) {
    const organization = organizations.get(tenant.key);
    if (organization) lines.push(`${tenant.organizationIdEnv}=${organization.id}`);
  }

  writeFileSync(identityFile, `${lines.join("\n")}\n`, "utf8");
  process.stdout.write(`\nWritten: ${identityFile} (gitignored, ids only)\n`);
}

async function status() {
  const identities = parseE2EIdentityEnvironment(process.env);
  for (const tenant of e2eClerkFixturePlan.tenants) {
    const organization = await findOrganization(tenant.clerkOrganizationName).catch(() => null);
    process.stdout.write(
      `${tenant.key.padEnd(12)} clerkOrganization=${organization?.id ?? "MISSING"}`
      + ` configured=${identities.organizations[tenant.key] ? "yes" : "no"}\n`,
    );
  }
  for (const role of e2eClerkFixturePlan.roles) {
    const user = await findUserByEmail(role.email);
    process.stdout.write(
      `${role.key.padEnd(16)} email=${role.email} clerkUser=${user?.id ?? "MISSING"}`
      + ` configured=${identities.users[role.key] ? "yes" : "no"}\n`,
    );
  }
}

async function revoke() {
  for (const role of e2eClerkFixturePlan.roles) {
    const user = await findUserByEmail(role.email);
    if (!user) {
      process.stdout.write(`${role.key.padEnd(16)} absent\n`);
      continue;
    }
    await clerkRequest(`/users/${user.id}`, { method: "DELETE" });
    process.stdout.write(`${role.key.padEnd(16)} deleted ${user.id}\n`);
  }
}

const commands: Record<string, () => Promise<void>> = { provision, status, revoke };
const command = process.argv[2];

if (!command || !commands[command]) {
  process.stderr.write("PF07_E2E_FIXTURE_COMMAND_REQUIRED: provision | status | revoke\n");
  process.exitCode = 1;
} else {
  commands[command]().catch((error: unknown) => {
    const code = error instanceof Error ? error.message : "PF07_E2E_FIXTURE_FAILED";
    process.stderr.write(`${JSON.stringify({ status: "failed", operation: command, code })}\n`);
    process.exitCode = 1;
  });
}
