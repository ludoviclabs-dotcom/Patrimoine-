import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";
import type postgres from "postgres";
import {
  e2eFixtureRole,
  e2eFixtureTenant,
  parseE2EIdentityEnvironment,
  type E2EFixtureRoleKey,
} from "../../../lib/auth/e2e-fixture-plan";

/**
 * PF-07 — authenticated Playwright support.
 *
 * Sign-in goes through Clerk's official `ticket` strategy: the helper looks the
 * user up by email and mints a short-lived sign-in token with the Backend API.
 * No password is set, stored, requested or typed anywhere in this repository.
 *
 * Nothing here weakens the server: the browser obtains a genuine Clerk session,
 * and every assertion below is about what the server then decides through
 * resolve_clerk_context, RLS and the RBAC capability matrix.
 */

export const clerkFixtureEnabled = process.env.E2E_CLERK_FIXTURE === "1";

export function fixtureIdentities() {
  return parseE2EIdentityEnvironment(process.env);
}

/**
 * Signs in and activates the role's organization.
 *
 * The active organization matters: `requireClerkTenantContext` refuses a
 * session without one, and the organization is what the database resolver maps
 * to an internal tenant.
 */
export async function signInAs(page: Page, roleKey: E2EFixtureRoleKey) {
  const role = e2eFixtureRole(roleKey);
  const tenant = e2eFixtureTenant(role.tenantKey);
  const identities = fixtureIdentities();
  const organizationId = identities.organizations[role.tenantKey];

  if (!organizationId) {
    throw new Error(`E2E_FIXTURE_ORGANIZATION_MISSING:${role.tenantKey}`);
  }

  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.loaded({ page });
  await clerk.signIn({ page, emailAddress: role.email });

  await page.evaluate(async (activeOrganizationId) => {
    await window.Clerk.setActive({ organization: activeOrganizationId });
  }, organizationId);

  // The session cookie only carries the organization after Clerk has swapped
  // it; without this wait the first server render can still be organization-less.
  await expect
    .poll(async () => page.evaluate(() => window.Clerk?.session?.lastActiveOrganizationId ?? null), {
      timeout: 15_000,
    })
    .toBe(organizationId);

  return { role, tenant, organizationId } as const;
}

export async function signOut(page: Page) {
  await clerk.signOut({ page });
}

/**
 * Opens the disposable E2E database with the privileged connection.
 *
 * Only the revocation journey needs it: proving that a still-valid Clerk
 * session stops working requires changing the authoritative membership while
 * the browser keeps its cookie. The server itself never receives this URL.
 */
export async function withE2EAdminDatabase<T>(
  operation: (sql: ReturnType<typeof postgres>) => Promise<T>,
): Promise<T> {
  const url = process.env.E2E_ADMIN_DATABASE_URL;
  if (!url) throw new Error("E2E_ADMIN_DATABASE_URL_REQUIRED");

  const { default: connect } = await import("postgres");
  const sql = connect(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    return await operation(sql);
  } finally {
    await sql.end();
  }
}
