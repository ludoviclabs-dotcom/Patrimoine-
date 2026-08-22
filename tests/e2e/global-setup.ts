import { clerkSetup } from "@clerk/testing/playwright";

/**
 * PF-07 — fetches Clerk's Testing Token once per run so the automated sign-in
 * is not treated as bot traffic. It is a no-op unless the authenticated
 * fixture is explicitly requested, keeping the public suite credential-free.
 *
 * clerkSetup itself refuses a production secret key.
 */
export default async function globalSetup() {
  if (process.env.E2E_CLERK_FIXTURE !== "1") return;
  await clerkSetup();
}
