import { readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import {
  assertSafeDatabaseRuntimeRole,
  isProductionEnvironment,
  managedPostgresMigrationMarker,
  managedPostgresRlsTables,
  type DatabaseRuntimeRole,
} from "../lib/db/managed-readiness";

type SqlClient = ReturnType<typeof postgres>;

type DeploymentReadiness = Readonly<{
  migration: string;
  rlsReady: boolean;
}>;

function required(value: string | undefined, code: string) {
  if (!value?.trim()) {
    throw new Error(code);
  }

  return value;
}

function migrationFileCount() {
  return readdirSync(join(process.cwd(), "drizzle"))
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .length;
}

function client(url: string) {
  return postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
}

async function runtimeRole(database: SqlClient): Promise<DatabaseRuntimeRole> {
  const [role] = await database<DatabaseRuntimeRole[]>`
    select
      current_user as "roleName",
      pg_role.rolsuper as "isSuperuser",
      pg_role.rolbypassrls as "bypassesRls",
      pg_has_role(current_user, 'patrimoine_app', 'member') as "canAssumeApplicationRole",
      exists (
        select 1
        from pg_catalog.pg_class as relation
        cross join lateral pg_catalog.aclexplode(
          coalesce(relation.relacl, pg_catalog.acldefault('r', relation.relowner))
        ) as privilege
        where relation.relnamespace = 'public'::regnamespace
          and relation.relkind in ('r', 'p')
          and privilege.grantee = pg_role.oid
      ) as "hasDirectTablePrivileges"
    from pg_catalog.pg_roles as pg_role
    where pg_role.rolname = current_user
  `;

  if (!role) {
    throw new Error("DATABASE_RUNTIME_ROLE_UNSAFE");
  }

  return role;
}

async function verifyAdminDatabase(admin: SqlClient) {
  const [migrationState] = await admin<{
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
  const roles = await admin<{
    roleName: string;
    isSuperuser: boolean;
    bypassesRls: boolean;
    canLogin: boolean;
  }[]>`
    select
      rolname as "roleName",
      rolsuper as "isSuperuser",
      rolbypassrls as "bypassesRls",
      rolcanlogin as "canLogin"
    from pg_catalog.pg_roles
    where rolname in ('patrimoine_app', 'patrimoine_fixture_service')
    order by rolname
  `;
  const rls = await admin<{
    tableName: string;
    rowSecurity: boolean;
    forceRowSecurity: boolean;
  }[]>`
    select
      relname as "tableName",
      relrowsecurity as "rowSecurity",
      relforcerowsecurity as "forceRowSecurity"
    from pg_catalog.pg_class
    where relnamespace = 'public'::regnamespace
      and relname in ${admin([...managedPostgresRlsTables])}
    order by relname
  `;

  if (
    !migrationState
    || migrationState.migrationTable !== "drizzle.__drizzle_migrations"
    || migrationState.appliedMigrationCount !== migrationFileCount()
  ) {
    throw new Error("DATABASE_MIGRATION_VERSION_MISMATCH");
  }
  if (
    roles.length !== 2
    || roles.some((role) => role.isSuperuser || role.bypassesRls || role.canLogin)
  ) {
    throw new Error("DATABASE_CONTROLLED_ROLES_INVALID");
  }
  if (
    rls.length !== managedPostgresRlsTables.length
    || rls.some((table) => !table.rowSecurity || !table.forceRowSecurity)
  ) {
    throw new Error("DATABASE_FORCE_RLS_INVALID");
  }
}

async function verifyRuntimeDatabase(runtime: SqlClient) {
  assertSafeDatabaseRuntimeRole(await runtimeRole(runtime));

  const readiness = await runtime.begin(async (transaction) => {
    await transaction.unsafe("set local role patrimoine_app");
    const [row] = await transaction<{ readiness: DeploymentReadiness }[]>`
      select app_security.managed_postgres_readiness() as readiness
    `;
    return row?.readiness;
  });

  if (
    !readiness
    || readiness.migration !== managedPostgresMigrationMarker
    || readiness.rlsReady !== true
  ) {
    throw new Error("DATABASE_RUNTIME_READINESS_INVALID");
  }
}

async function verify() {
  const admin = client(required(process.env.DATABASE_ADMIN_URL, "DATABASE_ADMIN_URL_REQUIRED"));
  const runtime = client(required(process.env.DATABASE_URL, "DATABASE_URL_REQUIRED"));

  try {
    await verifyAdminDatabase(admin);
    await verifyRuntimeDatabase(runtime);
    process.stdout.write(`${JSON.stringify({ status: "verified", migration: managedPostgresMigrationMarker })}\n`);
  } finally {
    await Promise.all([admin.end(), runtime.end()]);
  }
}

async function migrateManagedDatabase() {
  const adminUrl = required(process.env.DATABASE_ADMIN_URL, "DATABASE_ADMIN_URL_REQUIRED");
  const admin = client(adminUrl);

  try {
    await migrate(drizzle(admin), { migrationsFolder: join(process.cwd(), "drizzle") });
    await verifyAdminDatabase(admin);
  } finally {
    await admin.end();
  }

  process.stdout.write(`${JSON.stringify({ status: "migrated", migration: managedPostgresMigrationMarker })}\n`);
}

async function smoke() {
  if (isProductionEnvironment()) {
    throw new Error("PF03_SMOKE_WRITE_FORBIDDEN_IN_PRODUCTION");
  }
  if (process.env.ALLOW_PF03_SMOKE_WRITE !== "true") {
    throw new Error("ALLOW_PF03_SMOKE_WRITE_MUST_BE_TRUE");
  }

  await verify();
  const runtime = client(required(process.env.DATABASE_URL, "DATABASE_URL_REQUIRED"));
  const tenantId = required(process.env.PF03_SMOKE_TENANT_ID, "PF03_SMOKE_TENANT_ID_REQUIRED");
  const identityId = required(process.env.PF03_SMOKE_IDENTITY_ID, "PF03_SMOKE_IDENTITY_ID_REQUIRED");
  const role = required(process.env.PF03_SMOKE_ROLE, "PF03_SMOKE_ROLE_REQUIRED");
  const auditId = randomUUID();

  try {
    assertSafeDatabaseRuntimeRole(await runtimeRole(runtime));
    await runtime.begin(async (transaction) => {
      await transaction.unsafe("set local role patrimoine_app");
      await transaction`select set_config('app.tenant_id', ${tenantId}, true)`;
      await transaction`select set_config('app.user_id', ${identityId}, true)`;
      await transaction`select set_config('app.role', ${role}, true)`;
      await transaction`
        insert into audit_logs
          (id, tenant_id, actor_identity_id, action, entity_type, entity_id, summary, metadata)
        values
          (${auditId}, ${tenantId}, ${identityId}, 'case.updated', 'operational_readiness',
           ${auditId}, 'PF-03C managed PostgreSQL smoke check.',
           ${JSON.stringify({ operation: "pf03c-smoke", synthetic: true })}::jsonb)
      `;
      const [written] = await transaction<{ id: string }[]>`
        select id from audit_logs where id = ${auditId}
      `;
      if (written?.id !== auditId) {
        throw new Error("PF03_SMOKE_READ_WRITE_FAILED");
      }
    });
    process.stdout.write(`${JSON.stringify({ status: "smoke_passed" })}\n`);
  } finally {
    await runtime.end();
  }
}

const command = process.argv[2];
const commands: Record<string, () => Promise<void>> = {
  migrate: migrateManagedDatabase,
  verify,
  smoke,
};

if (!command || !commands[command]) {
  process.stderr.write("PF03_MANAGED_POSTGRES_COMMAND_REQUIRED\n");
  process.exitCode = 1;
} else {
  commands[command]().catch((error: unknown) => {
    const code = error instanceof Error ? error.message : "PF03_MANAGED_POSTGRES_FAILED";
    process.stderr.write(`${JSON.stringify({ status: "failed", operation: command, code, rollback: "forward_only_no_automatic_rollback" })}\n`);
    process.exitCode = 1;
  });
}
