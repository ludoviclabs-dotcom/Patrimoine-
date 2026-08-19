import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { seedClaireMarcDemo } from "../lib/db/seed-demo";

function required(value: string | undefined, code: string) {
  if (!value?.trim()) {
    throw new Error(code);
  }

  return value;
}

async function main() {
  if (process.env.ALLOW_DEMO_FIXTURE_SEED !== "true") {
    throw new Error("ALLOW_DEMO_FIXTURE_SEED_MUST_BE_TRUE");
  }

  const production =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (production && process.env.ALLOW_DEMO_FIXTURE_SEED_IN_PRODUCTION !== "true") {
    throw new Error("DEMO_FIXTURE_SEED_FORBIDDEN_IN_PRODUCTION");
  }

  const client = postgres(
    required(process.env.DATABASE_ADMIN_URL, "DATABASE_ADMIN_URL_REQUIRED"),
    { max: 1, prepare: false },
  );

  try {
    const result = await seedClaireMarcDemo(drizzle(client, { schema }));
    process.stdout.write(`${JSON.stringify({ status: "seeded", ...result })}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "DEMO_FIXTURE_SEED_FAILED";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
