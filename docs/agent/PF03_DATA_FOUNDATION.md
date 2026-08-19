# PF-03 — PostgreSQL production data foundation and tenant isolation

Dates: PF-03A 2026-08-19; PF-03B 2026-08-20

PF-03B branch: `codex/pf-03b-postgres-tenant-isolation`

Base: `main` at `ef64ae7fb64cccca32c8d0af9c21652cc2aa0f88`

## Status

**PF-03 COMPLETE (PF-03A + PF-03B).** PF-03A established the versioned
PostgreSQL/Drizzle foundation. PF-03B adds forced RLS, membership-backed tenant
policies, composite tenant FKs on the remaining historical tables, real
PostgreSQL isolation tests, sensitive-operation audit persistence and an
idempotent synthetic Claire/Marc seed.

PF-04 remains responsible for authenticated user/organization mapping through
Clerk. No browser-provided tenant identifier is accepted as database authority.

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

## PF-03B — Forced RLS and role model

Migration `drizzle/0004_pf03b_postgres_rls_tenant_isolation.sql` enables and
forces RLS on every tenant-owned table, including tenant/cabinet, membership,
legacy users, clients, households, dossiers, assets, liabilities, document
metadata, simulations, calculation steps, rule pinning, professional reviews,
reports, snapshots, data requests, retention/consent/DPIA and audit logs.
Tenant-specific rule versions are isolated while global rule versions remain
readable only inside a valid tenant membership context.

Policies are deny-by-default. They require all of the following transaction-
local values:

- `app.tenant_id`;
- `app.user_id` (the provider-neutral identity id);
- `app.role`;
- an active, non-revoked membership matching those three values.

Missing, malformed or mismatched context yields no tenant-owned rows. The
membership check is implemented by the security-definer function
`app_security.tenant_member_access`; its execution is granted only to the
controlled application role and its search path/row-security behavior are
fixed in the migration.

Two `NOLOGIN`, `NOSUPERUSER`, `NOINHERIT`, `NOBYPASSRLS` group roles separate
runtime authority:

- `patrimoine_app`: tenant-member access; audit is SELECT/INSERT only;
- `patrimoine_fixture_service`: explicit synthetic seed path limited to one
  transaction tenant and `app.service_operation = demo_fixture_seed`.

`lib/db/tenant-transaction.ts` is the shared repository boundary. It assumes
the fixed application role, sets the tenant/identity/role through `SET LOCAL`,
verifies membership and runs the repository operation in the same transaction.
`postgres-data-foundation.ts` and `tenant-resource-repository.ts` both use it.
React components still never query PostgreSQL directly.

The deployment/migration login is deliberately not an application credential.
Infrastructure must create a LOGIN role with no direct table grants, grant it
membership in `patrimoine_app`, and place that login in `DATABASE_URL`. The
privileged `DATABASE_ADMIN_URL` is limited to migrations and the guarded demo
seed command; migration `0004` explicitly grants only that deployment identity
the ability to assume `patrimoine_fixture_service`. Neither URL nor a role
password is committed.

## PF-03B — Tenant FK completion

Migration `0004` adds composite tenant FKs and tenant indexes to historical
relationships that PF-03A had not yet hardened: assigned dossier expert,
professional reviews, audit actor user, report versions, dossier snapshots,
professional documents, data requests, private document metadata and consents.
An audit insert trigger also rejects an absent actor and an identity that has no
membership in the event tenant. Audit UPDATE/DELETE remains blocked by the
existing append-only triggers. Database triggers on calculation steps and
simulation-rule links reject a tenant-specific rule version owned by another
tenant while continuing to allow global rule versions.

## PF-03B — Sensitive-operation audit

The tenant resource repository persists audit rows in the same transaction for
dossier updates/soft-deletes and document-metadata reads. Events carry actor
identity, tenant, action, resource type/id, UTC database timestamp, correlation
id and bounded metadata. Metadata records operation shape only; it does not
contain credentials, tokens, document bodies, income or patrimonial amounts.
Simulation persistence continues to write its audit event atomically with the
run, calculation steps and rule links.

## PF-03B — Idempotent Claire and Marc seed

`npm run db:seed:demo` imports only the synthetic Claire/Marc fixtures with
stable UUIDs and `ON CONFLICT DO NOTHING`. It provisions the demo tenant,
cabinet, provider-neutral identities, memberships, compatibility users, client,
household, dossier, assets, liability, document metadata and a sanitized seed
audit event. Running it twice produces no duplicate row.

The command requires:

```text
DATABASE_ADMIN_URL=postgres://...deployment-only...
ALLOW_DEMO_FIXTURE_SEED=true
```

It refuses production unless
`ALLOW_DEMO_FIXTURE_SEED_IN_PRODUCTION=true` is also explicitly set. It never
reads or migrates user data and does not silently run during application start
or migrations. The TypeScript fixtures remain available in explicit FIXTURE
mode.

## PF-03B — Reproducible PostgreSQL isolation tests

`npm run test:postgres` starts a native PostgreSQL 18.4 test cluster in a unique
OS temporary directory, applies migrations `0000` through `0004`, creates an
unprivileged application login, seeds CABINET_A/CABINET_B, executes the test
suite, stops PostgreSQL and removes the temporary cluster. Docker and a shared
developer database are not required.

The suite verifies in both directions:

- no cross-tenant dossier read, update or delete (repository and direct ID);
- no cross-tenant document-metadata, simulation-run or audit-log read;
- missing or identity/tenant-mismatched context is denied;
- composite FK crossing is rejected;
- cross-tenant rule-version linkage is rejected by PostgreSQL;
- failed tenant transactions roll back;
- Claire/Marc seed replay is idempotent;
- sensitive audit fields are complete and sanitized;
- simulation inputs/results/steps/rule links persist atomically behind RLS;
- all listed tables have both `relrowsecurity` and `relforcerowsecurity`;
- application/service roles are neither superuser nor `BYPASSRLS`.

## PF-03B limitations and deployment gates

- Clerk identity/organization mapping is intentionally absent until PF-04.
  PF-03B accepts only the branded internal server/test tenant context.
- PostgreSQL superusers always retain platform-level emergency authority. The
  application and fixture roles cannot bypass RLS; privileged credentials must
  remain outside the runtime and follow the documented admin path.
- The automated suite validates native PostgreSQL 18.4. Provider-specific
  staging migration, backup/restore and credential provisioning remain
  PF-03-PUBLISH deployment gates.
- Existing V1 API/demo routes still serve explicit in-memory demo fixtures;
  they do not query PostgreSQL and are not an authenticated multi-tenant API.
  Replacing their demo identity boundary with Clerk is PF-04 scope.
- Private Blob isolation and binary document access remain a later document
  milestone; PF-03 isolates PostgreSQL document metadata only.
