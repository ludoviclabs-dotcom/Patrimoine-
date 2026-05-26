import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Postgres-backed V1 runtime.");
  }

  if (!cachedDb) {
    const client = postgres(process.env.DATABASE_URL, { prepare: false });
    cachedDb = drizzle(client, { schema });
  }

  return cachedDb;
}
