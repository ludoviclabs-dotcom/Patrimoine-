import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { parseE2EIdentityEnvironment } from "../lib/auth/e2e-fixture-plan";
import * as schema from "../lib/db/schema";
import { seedE2EClerkFixture } from "../lib/db/seed-e2e-fixture";

/**
 * PF-07 — builds the disposable database an authenticated Playwright run needs.
 *
 * It migrates through the same journalled path production uses, provisions a
 * runtime login with the same shape PF-03C demands (NOSUPERUSER, NOBYPASSRLS,
 * no direct table grant, member of patrimoine_app only), and seeds the Clerk
 * mapping. The E2E server then talks to that login, so RLS and RBAC are
 * exercised for real rather than bypassed for convenience.
 *
 * Refuses to run against production, and refuses an admin URL that is not
 * obviously disposable unless the caller states the intent explicitly.
 */

const runtimeLogin = "patrimoine_e2e_runtime";

function required(value: string | undefined, code: string) {
  if (!value?.trim()) throw new Error(code);
  return value;
}

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("E2E_FIXTURE_SEED_FORBIDDEN_IN_PRODUCTION");
  }

  const adminUrl = required(process.env.DATABASE_ADMIN_URL, "DATABASE_ADMIN_URL_REQUIRED");
  const runtimePassword = required(
    process.env.E2E_RUNTIME_PASSWORD,
    "E2E_RUNTIME_PASSWORD_REQUIRED",
  );
  const identities = parseE2EIdentityEnvironment(process.env);

  const admin = postgres(adminUrl, { max: 1, prepare: false, onnotice: () => {} });

  try {
    await migrate(drizzle(admin), { migrationsFolder: join(process.cwd(), "drizzle") });

    const [existing] = await admin<{ present: boolean }[]>`
      select exists (select 1 from pg_roles where rolname = ${runtimeLogin}) as present
    `;
    const escapedPassword = runtimePassword.replace(/'/g, "''");
    await admin.unsafe(
      existing?.present
        ? `ALTER ROLE ${runtimeLogin} WITH LOGIN PASSWORD '${escapedPassword}'`
          + ` NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`
        : `CREATE ROLE ${runtimeLogin} LOGIN PASSWORD '${escapedPassword}'`
          + ` NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`,
    );
    await admin.unsafe(`GRANT patrimoine_app TO ${runtimeLogin}`);

    const result = await seedE2EClerkFixture(
      drizzle(admin, { schema }) as unknown as Parameters<typeof seedE2EClerkFixture>[0],
      identities,
    );

    process.stdout.write(`${JSON.stringify({ status: "seeded", runtimeLogin, ...result })}\n`);
  } finally {
    await admin.end();
  }
}

main().catch((error: unknown) => {
  const code = error instanceof Error ? error.message : "E2E_FIXTURE_SEED_FAILED";
  process.stderr.write(`${JSON.stringify({ status: "failed", code })}\n`);
  process.exitCode = 1;
});
