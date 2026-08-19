# PF-03A — PostgreSQL production data foundation

Date: 2026-08-19

Branch: `codex/pf-03a-postgresql-data-foundation`

Base: `main` at `ef64ae7fb64cccca32c8d0af9c21652cc2aa0f88`

## Status

Implemented. PF-03A establishes the versioned PostgreSQL/Drizzle foundation
without changing a fiscal formula and without removing the Claire and Marc
fixtures.

PF-03B remains responsible for RLS policies, cross-tenant database integration
tests and migration of fixture data into a database seed. PF-04 remains
responsible for authenticated user/organization mapping through Clerk.

## Decisions

- Drizzle remains the only ORM. No Prisma dependency or schema was introduced.
- The historical `client_cases` table remains in place to avoid a destructive
  rename. It is exported as `dossiers` in the Drizzle schema and now carries a
  stable tenant-scoped reference, fiscal year and lifecycle timestamps.
- The historical tenant-scoped `users` table is preserved for compatibility.
  New provider-neutral `user_identities` and `memberships` tables establish the
  PF-04 mapping boundary without connecting Clerk yet.
- Global rule versions may have `tenant_id = NULL`. A cabinet-specific rule
  version must carry its tenant explicitly and is rejected by repositories for
  every other tenant.
- Existing TypeScript fixtures remain available. Runtime selection is explicit:
  `PERSISTENCE_MODE=FIXTURE` or `PERSISTENCE_MODE=DATABASE`.
- `DATABASE_URL` alone never switches the application into database mode.
- A production runtime without `PERSISTENCE_MODE` fails closed.
- Database access is exposed through repository/service code only. Fiscal
  engines remain pure and React components do not call `getDatabase()`.

## Schema coverage

The Drizzle schema and migration `0003_pf03a_postgresql_data_foundation.sql`
cover the requested minimum:

- `tenants` and `cabinets`;
- `user_identities` and `memberships`;
- dossiers through the compatible `client_cases` table;
- `assets` and `liabilities`, each attached to a tenant and dossier;
- `rule_versions` with source reference, effective range, payload and checksum;
- `simulation_runs` with engine version, idempotency key, immutable input/output
  snapshots and completion timestamps;
- `calculation_steps` with tenant ownership, rule-version FK and evidence-source
  FK;
- `simulation_rule_versions` for explicit rule pinning per run;
- append-only `audit_logs` with identity and correlation metadata;
- private document metadata on `documents` (name, MIME, size and SHA-256).

Tenant-owned relationships use composite foreign keys such as
`(tenant_id, case_id) → client_cases(tenant_id, id)`. These constraints prevent
an otherwise-valid identifier from being attached across cabinet boundaries.

Monetary asset and liability values use `numeric(20,2)`. Core mutable entities
have `created_at` and `updated_at`; immutable traces/audit rows keep only their
creation timestamp.

## Migration policy

- Migrations are forward-only and journaled in `drizzle/meta/_journal.json`.
- Production applies migrations with `npm run db:migrate`.
- Migration `0003` enables PostgreSQL `pgcrypto` to backfill real SHA-256
  checksums for legacy rule-version rows.
- No application code creates tables at runtime.
- Migration `0003` backfills dossier links for pre-existing assets and debts.
  It aborts with an explicit exception if an old row cannot be attached to a
  dossier instead of inventing tenant ownership.
- Database seed execution is intentionally deferred to PF-03B. The existing
  seed plan now describes cabinet, identity and membership rows, while fixture
  mode continues to run Claire and Marc today.

## Tenant context

`lib/tenancy/tenant-context.ts` defines a branded internal context containing:

- tenant id;
- identity id;
- role;
- trusted source (`demo-fixture`, `internal-test`, `server-config`);
- correlation id.

Before PF-04, database mode obtains this context only from server environment
variables (`INTERNAL_TENANT_ID`, `INTERNAL_IDENTITY_ID`,
`INTERNAL_TENANT_ROLE`). Repository inputs intentionally contain no `tenantId`.
A browser-supplied tenant identifier therefore cannot become repository
authority.

## Simulation persistence transaction

The PostgreSQL repository performs the following work in one transaction:

1. sets transaction-local tenant, identity and role context;
2. verifies an active membership;
3. resolves the dossier inside the tenant boundary;
4. verifies every rule version and evidence source;
5. writes the input/output snapshots and engine metadata;
6. writes every calculation step;
7. pins each rule version in `simulation_rule_versions`;
8. appends the simulation audit event;
9. commits only if every write succeeds.

The explicit fixture repository implements the same ownership, linkage,
idempotency and rollback contract for deterministic tests and demo operation.

## Test coverage added

`tests/unit/pf03a-data-foundation.test.ts` covers:

- required schema columns and tenant boundaries;
- composite dossier/run foreign keys;
- migration journal and SQL constraints;
- explicit FIXTURE/DATABASE selection;
- Claire and Marc simulation persistence;
- input/result/calculation-step snapshots;
- rule-version and evidence linkage;
- idempotency;
- cross-tenant reads and writes;
- missing membership rejection;
- transaction rollback on missing evidence or unauthorized rule version;
- absence of direct Postgres/Drizzle queries from React components.

## Fiscal and legal impact

None. No rate, threshold, legal condition, source, rule status or deterministic
calculation was modified. Persistence stores engine inputs, outputs and traces;
the fiscal engines continue to calculate them.

## Deferred to PF-03B

- enable and force PostgreSQL RLS on every tenant-owned table;
- execute fresh-database and two-tenant integration tests against a disposable
  PostgreSQL instance;
- migrate Claire and Marc fixtures into an idempotent seed command;
- remove remaining fixture-only repository paths from production deployment;
- add IDOR tests through tenant-scoped API/service boundaries.

Clerk integration and authenticated user-to-tenant mapping remain PF-04 scope.
