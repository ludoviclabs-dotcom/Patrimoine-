import { access, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { isProductionEnvironment, managedPostgresRlsTables } from "../lib/db/managed-readiness";

function required(value: string | undefined, code: string) {
  if (!value?.trim()) {
    throw new Error(code);
  }

  return value;
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", windowsHide: true });
    child.once("error", () => reject(new Error("POSTGRES_CLIENT_TOOL_UNAVAILABLE")));
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("POSTGRES_CLIENT_TOOL_FAILED")));
  });
}

async function backup() {
  const databaseUrl = required(process.env.DATABASE_ADMIN_URL, "DATABASE_ADMIN_URL_REQUIRED");
  const file = required(process.env.PF03_BACKUP_FILE, "PF03_BACKUP_FILE_REQUIRED");
  await run("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", file, databaseUrl]);
  const details = await stat(file);
  if (details.size === 0) {
    throw new Error("PF03_BACKUP_EMPTY");
  }
  process.stdout.write(`${JSON.stringify({ status: "backup_created", bytes: details.size })}\n`);
}

async function restoreVerify() {
  if (isProductionEnvironment()) {
    throw new Error("PF03_RESTORE_FORBIDDEN_IN_PRODUCTION");
  }
  if (process.env.ALLOW_PF03_RESTORE !== "true") {
    throw new Error("ALLOW_PF03_RESTORE_MUST_BE_TRUE");
  }

  const backupFile = required(process.env.PF03_BACKUP_FILE, "PF03_BACKUP_FILE_REQUIRED");
  const restoreUrl = required(process.env.PF03_RESTORE_DATABASE_URL, "PF03_RESTORE_DATABASE_URL_REQUIRED");
  await access(backupFile);
  await run("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--dbname", restoreUrl, backupFile]);

  const database = postgres(restoreUrl, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const expectedMigrations = readdirSync(join(process.cwd(), "drizzle"))
      .filter((file) => /^\d{4}_.+\.sql$/.test(file)).length;
    const [migrationState] = await database<{
      migrationTable: string | null;
      appliedMigrationCount: number;
    }[]>`
      select
        to_regclass('drizzle.__drizzle_migrations')::text as "migrationTable",
        case
          when to_regclass('drizzle.__drizzle_migrations') is null then 0
          else (select count(*)::int from drizzle.__drizzle_migrations)
        end as "appliedMigrationCount"
    `;
    const rls = await database<{
      rowSecurity: boolean;
      forceRowSecurity: boolean;
    }[]>`
      select relrowsecurity as "rowSecurity", relforcerowsecurity as "forceRowSecurity"
      from pg_catalog.pg_class
      where relnamespace = 'public'::regnamespace
        and relname in ${database([...managedPostgresRlsTables])}
    `;
    const [rowCounts] = await database<{
      tenants: number;
      dossiers: number;
      assets: number;
      liabilities: number;
      audits: number;
    }[]>`
      select
        (select count(*)::int from tenants) as tenants,
        (select count(*)::int from client_cases) as dossiers,
        (select count(*)::int from assets) as assets,
        (select count(*)::int from liabilities) as liabilities,
        (select count(*)::int from audit_logs) as audits
    `;

    if (
      !migrationState
      || migrationState.migrationTable !== "drizzle.__drizzle_migrations"
      || migrationState.appliedMigrationCount !== expectedMigrations
      || rls.length !== managedPostgresRlsTables.length
      || rls.some((table) => !table.rowSecurity || !table.forceRowSecurity)
      || !rowCounts
    ) {
      throw new Error("PF03_RESTORE_SANITY_CHECK_FAILED");
    }

    process.stdout.write(`${JSON.stringify({ status: "restore_verified", rowCounts })}\n`);
  } finally {
    await database.end();
  }
}

const command = process.argv[2];
const commands: Record<string, () => Promise<void>> = { backup, "restore-verify": restoreVerify };

if (!command || !commands[command]) {
  process.stderr.write("PF03_BACKUP_COMMAND_REQUIRED\n");
  process.exitCode = 1;
} else {
  commands[command]().catch((error: unknown) => {
    const code = error instanceof Error ? error.message : "PF03_BACKUP_FAILED";
    process.stderr.write(`${JSON.stringify({ status: "failed", operation: command, code })}\n`);
    process.exitCode = 1;
  });
}
