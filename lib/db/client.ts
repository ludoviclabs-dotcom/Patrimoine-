import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { resolvePersistenceRuntime } from "../persistence/mode";
import * as schema from "./schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase() {
  const runtime = resolvePersistenceRuntime();

  if (runtime.mode !== "DATABASE") {
    throw new Error("DATABASE_ACCESS_DISABLED_IN_FIXTURE_MODE");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL_REQUIRED_FOR_DATABASE_MODE");
  }

  if (!cachedDb) {
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    cachedDb = drizzle(client, { schema });
  }

  return cachedDb;
}
