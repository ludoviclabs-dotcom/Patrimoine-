import { NextResponse } from "next/server";
import postgres from "postgres";
import { resolvePersistenceRuntime } from "../../../lib/persistence/mode";
import {
  assertSafeDatabaseRuntimeRole,
  managedPostgresMigrationMarker,
  type DatabaseRuntimeRole,
} from "../../../lib/db/managed-readiness";

export const runtime = "nodejs";

export async function GET() {
  try {
    const persistence = resolvePersistenceRuntime();
    if (persistence.mode !== "DATABASE" || !process.env.DATABASE_URL) {
      return NextResponse.json({ status: "not_ready" }, { status: 503 });
    }

    const database = postgres(process.env.DATABASE_URL, {
      max: 1,
      prepare: false,
      connect_timeout: 5,
    });

    try {
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
      assertSafeDatabaseRuntimeRole(role);

      const readiness = await database.begin(async (transaction) => {
        await transaction.unsafe("set local role patrimoine_app");
        const [row] = await transaction<{ readiness: { migration: string; rlsReady: boolean } }[]>`
          select app_security.managed_postgres_readiness() as readiness
        `;
        return row?.readiness;
      });

      if (readiness?.migration !== managedPostgresMigrationMarker || readiness.rlsReady !== true) {
        throw new Error("DATABASE_RUNTIME_READINESS_INVALID");
      }
    } finally {
      await database.end();
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  }
}
