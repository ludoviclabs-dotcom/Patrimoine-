import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Drizzle CLI operations are administrative operations. Runtime credentials
  // are deliberately never used to generate, push, or apply migrations.
  ...(process.env.DATABASE_ADMIN_URL
    ? { dbCredentials: { url: process.env.DATABASE_ADMIN_URL } }
    : {}),
  strict: true,
});
