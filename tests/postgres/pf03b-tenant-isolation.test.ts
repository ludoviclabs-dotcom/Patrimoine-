import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../lib/db/schema";
import { clientCases } from "../../lib/db/schema";
import { seedClaireMarcDemo } from "../../lib/db/seed-demo";
import { v21PilotSeedPlan } from "../../lib/db/seed-v2-1";
import { withTenantTransaction } from "../../lib/db/tenant-transaction";
import type { PersistSimulationInput } from "../../lib/repositories/data-foundation-contract";
import { createPostgresDataFoundationRepository } from "../../lib/repositories/postgres-data-foundation";
import { createTenantResourceRepository } from "../../lib/repositories/tenant-resource-repository";
import { createInternalTenantContext } from "../../lib/tenancy/tenant-context";

const tenantA = v21PilotSeedPlan.tenant.id;
const identityA = v21PilotSeedPlan.identities[1].id;
const dossierA = v21PilotSeedPlan.case.id;
const householdA = v21PilotSeedPlan.household.id;
const documentA = "77777777-7777-4777-8777-777777777771";
const runA = "99999999-9999-4999-8999-999999999991";

const tenantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const cabinetB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const identityB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const clientB = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const householdB = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const dossierB = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const documentB = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1";
const runB = "99999999-9999-4999-8999-999999999992";
const evidenceId = "pf03b-official-source";
const ruleId = "pf03b-global-rule-v1";
const tenantBRuleId = "pf03b-tenant-b-rule-v1";
const clerkIdentity = "12121212-1212-4121-8121-121212121212";
const clientIdentity = "13131313-1313-4131-8131-131313131313";
const clientDeniedDossier = "14141414-1414-4141-8141-141414141414";
const reportB = "pf04b-report-b";

const tenantTables = [
  "tenants",
  "cabinets",
  "memberships",
  "users",
  "clients",
  "households",
  "client_cases",
  "assets",
  "liabilities",
  "documents",
  "simulation_runs",
  "calculation_steps",
  "simulation_rule_versions",
  "professional_reviews",
  "audit_logs",
  "report_versions",
  "dossier_snapshots",
  "professional_documents",
  "data_requests",
  "private_document_metadata",
  "retention_policies",
  "consents",
  "dpia_records",
  "rule_versions",
  "auth_provider_organizations",
  "auth_provider_memberships",
  "auth_webhook_events",
  "case_access_grants",
] as const;

const contextA = createInternalTenantContext({
  tenantId: tenantA,
  identityId: identityA,
  role: "conseiller",
  source: "internal-test",
  correlationId: "pf03b-correlation-a",
});
const contextB = createInternalTenantContext({
  tenantId: tenantB,
  identityId: identityB,
  role: "conseiller",
  source: "internal-test",
  correlationId: "pf03b-correlation-b",
});
const contextClient = createInternalTenantContext({
  tenantId: tenantA,
  identityId: clientIdentity,
  role: "client",
  source: "internal-test",
  correlationId: "pf04b-client-correlation",
});

type SqlClient = ReturnType<typeof postgres>;
let admin: SqlClient;
let application: SqlClient;
let applicationDb: ReturnType<typeof drizzle<typeof schema>>;

function applicationUrl(adminUrl: string) {
  const url = new URL(adminUrl);
  url.username = "pf03_test_app";
  url.password = "pf03-test-password";
  return url.toString();
}

async function applyMigrations(client: SqlClient) {
  const migrationDirectory = join(process.cwd(), "drizzle");
  const migrations = readdirSync(migrationDirectory)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort();

  for (const migration of migrations) {
    await client.unsafe(readFileSync(join(migrationDirectory, migration), "utf8"));
  }
}

async function runAsTenant<T>(
  context: typeof contextA | typeof contextB | typeof contextClient,
  operation: (transaction: postgres.TransactionSql) => Promise<T>,
) {
  return application.begin(async (transaction) => {
    await transaction.unsafe("set local role patrimoine_app");
    await transaction`select set_config('app.tenant_id', ${context.tenantId}, true)`;
    await transaction`select set_config('app.user_id', ${context.identityId}, true)`;
    await transaction`select set_config('app.role', ${context.role}, true)`;
    return operation(transaction);
  });
}

async function seedSecondTenantAndLinkedRecords() {
  await admin`
    insert into tenants (id, name, slug, status, data_region)
    values (${tenantB}, 'CABINET_B', 'cabinet-b', 'pilot', 'eu')
  `;
  await admin`
    insert into cabinets (id, tenant_id, legal_name, professional_type)
    values (${cabinetB}, ${tenantB}, 'CABINET_B', 'cabinet_test')
  `;
  await admin`
    insert into user_identities
      (id, provider, provider_subject, email_normalized, display_name)
    values
      (${identityB}, 'internal-test', 'cabinet-b-user', 'b@example.test', 'Conseiller B')
  `;
  await admin`
    insert into memberships
      (tenant_id, user_identity_id, role, status, activated_at)
    values (${tenantB}, ${identityB}, 'conseiller', 'active', now())
  `;
  await admin`
    insert into users (id, tenant_id, name, email, role, status)
    values (${userB}, ${tenantB}, 'Conseiller B', 'b@example.test', 'conseiller', 'active')
  `;
  await admin`
    insert into clients (id, tenant_id, owner_user_id, external_reference, name)
    values (${clientB}, ${tenantB}, ${userB}, 'CLIENT-B', 'Client B')
  `;
  await admin`
    insert into households
      (id, tenant_id, client_id, name, profile, members, fiscal_residence,
       professional_context, objectives)
    values
      (${householdB}, ${tenantB}, ${clientB}, 'Foyer B', 'test',
       ${JSON.stringify(["Personne B"])}::jsonb, 'France', 'test',
       ${JSON.stringify(["isolation"])}::jsonb)
  `;
  await admin`
    insert into client_cases
      (id, tenant_id, client_id, household_id, reference, title, status, fiscal_year)
    values
      (${dossierB}, ${tenantB}, ${clientB}, ${householdB}, 'DOS-B',
       'Dossier homonyme', 'draft', 2026)
  `;
  await admin`
    insert into documents
      (id, tenant_id, client_id, case_id, kind, label, status, storage_provider, required)
    values
      (${documentB}, ${tenantB}, ${clientB}, ${dossierB}, 'tax_notice',
       'Métadonnée B', 'received', 'test-private', true)
  `;
  await admin`
    insert into audit_logs
      (id, tenant_id, actor_identity_id, action, entity_type, entity_id, summary,
       correlation_id, metadata)
    values
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', ${tenantB}, ${identityB},
       'case.created', 'dossier', ${dossierB}, 'Dossier B créé.',
       'pf03b-seed-b', ${JSON.stringify({ synthetic: true })}::jsonb)
  `;
  await admin`
    insert into report_versions
      (id, tenant_id, case_id, version, status, simulation_run_ids, validation_decision,
       evidence_source_ids, coverage_limit_ids)
    values (${reportB}, ${tenantB}, ${dossierB}, '1', 'draft', '[]'::jsonb,
      'pending', '[]'::jsonb, '[]'::jsonb)
  `;
}

async function seedRuleAndSimulationRuns() {
  await admin`
    insert into evidence_sources
      (id, title, authority, url, checked_at, legal_scope, reliability, status)
    values
      (${evidenceId}, 'Source officielle de test', 'LEGIFRANCE',
       'https://www.legifrance.gouv.fr/', now(), 'test', 'official', 'verified')
  `;
  await admin`
    insert into rule_versions
      (id, rule_set, version, title, effective_from, status, evidence_source_ids,
       source_reference, rule_payload, checksum_sha256)
    values
      (${ruleId}, 'pf03b-test', '1', 'Règle globale de liaison', '2026-01-01',
       'active', ${JSON.stringify([evidenceId])}::jsonb, 'LEGIFRANCE test',
       ${JSON.stringify({ testOnly: true })}::jsonb, ${"1".repeat(64)})
  `;
  await admin`
    insert into rule_versions
      (id, tenant_id, rule_set, version, title, effective_from, status,
       evidence_source_ids, source_reference, rule_payload, checksum_sha256)
    values
      (${tenantBRuleId}, ${tenantB}, 'pf03b-tenant-test', '1',
       'Règle privée B', '2026-01-01', 'active',
       ${JSON.stringify([evidenceId])}::jsonb, 'LEGIFRANCE test',
       ${JSON.stringify({ testOnly: true })}::jsonb, ${"2".repeat(64)})
  `;

  for (const run of [
    { id: runA, tenantId: tenantA, dossierId: dossierA, householdId: householdA },
    { id: runB, tenantId: tenantB, dossierId: dossierB, householdId: householdB },
  ]) {
    await admin`
      insert into simulation_runs
        (id, tenant_id, case_id, household_id, engine_key, engine_version,
         scenario, status, idempotency_key, input_snapshot, output, completed_at)
      values
        (${run.id}, ${run.tenantId}, ${run.dossierId}, ${run.householdId},
         'pf03b-test', '1', 'isolation', 'completed', ${`seed-${run.id}`},
         ${JSON.stringify({ synthetic: true })}::jsonb,
         ${JSON.stringify({ result: "synthetic" })}::jsonb, now())
    `;
    await admin`
      insert into calculation_steps
        (tenant_id, simulation_run_id, step_order, label, input_value, formula,
         output_value, rule_version_id, evidence_source_id, confidence_status)
      values
        (${run.tenantId}, ${run.id}, 1, 'Étape synthétique', '1', '1 = 1',
         '1', ${ruleId}, ${evidenceId}, 'validated')
    `;
    await admin`
      insert into simulation_rule_versions
        (tenant_id, simulation_run_id, rule_version_id, purpose)
      values (${run.tenantId}, ${run.id}, ${ruleId}, 'calculation-step')
    `;
  }
}

async function seedClerkAuthorizationFixture() {
  await admin`
    insert into user_identities
      (id, provider, provider_subject, email_normalized, display_name)
    values (${clerkIdentity}, 'clerk', 'user_clerk_a', 'clerk-a@example.test', 'Clerk A')
  `;
  await admin`
    insert into memberships
      (tenant_id, user_identity_id, role, status, activated_at)
    values (${tenantA}, ${clerkIdentity}, 'conseiller', 'active', now())
  `;
  await admin`
    insert into auth_provider_organizations
      (provider, provider_organization_id, tenant_id, slug, display_name)
    values
      ('clerk', 'org_clerk_a', ${tenantA}, 'cabinet-a', 'Cabinet A'),
      ('clerk', 'org_clerk_wrong_tenant', ${tenantB}, 'cabinet-b', 'Cabinet B'),
      ('clerk', 'org_clerk_without_membership', ${tenantA}, 'cabinet-a-2', 'Cabinet A 2')
  `;
  await admin`
    insert into auth_provider_memberships
      (provider, provider_organization_id, provider_subject, provider_role, observed_status)
    values
      ('clerk', 'org_clerk_a', 'user_clerk_a', 'org:member', 'active'),
      ('clerk', 'org_clerk_wrong_tenant', 'user_clerk_a', 'org:member', 'active'),
      ('clerk', 'org_clerk_without_membership', 'user_clerk_without_membership', 'org:member', 'active')
  `;
}

async function seedClientGrantFixture() {
  await admin`
    insert into user_identities
      (id, provider, provider_subject, email_normalized, display_name)
    values (${clientIdentity}, 'clerk', 'user_client_a', 'client-a@example.test', 'Client A')
  `;
  await admin`
    insert into memberships
      (tenant_id, user_identity_id, role, status, activated_at)
    values (${tenantA}, ${clientIdentity}, 'client', 'active', now())
  `;
  await admin`
    insert into client_cases
      (id, tenant_id, client_id, household_id, reference, title, status, fiscal_year)
    values (${clientDeniedDossier}, ${tenantA}, ${v21PilotSeedPlan.client.id},
      ${householdA}, 'CLIENT-DENIED', 'Dossier non partagé au client', 'draft', 2026)
  `;
  await admin`
    insert into case_access_grants (tenant_id, case_id, user_identity_id, status)
    values (${tenantA}, ${dossierA}, ${clientIdentity}, 'active')
  `;
}

beforeAll(async () => {
  const databaseUrl = process.env.PF03_TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("PF03_TEST_DATABASE_URL_REQUIRED");
  }

  admin = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });
  await applyMigrations(admin);
  await admin.unsafe(`
    CREATE ROLE pf03_test_app
      LOGIN PASSWORD 'pf03-test-password'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    GRANT patrimoine_app TO pf03_test_app;
  `);

  const adminDb = drizzle(admin, { schema });
  await seedClaireMarcDemo(adminDb);
  await seedClaireMarcDemo(adminDb);
  await seedSecondTenantAndLinkedRecords();
  await seedRuleAndSimulationRuns();
  await seedClerkAuthorizationFixture();
  await seedClientGrantFixture();

  application = postgres(applicationUrl(databaseUrl), {
    max: 1,
    prepare: false,
    onnotice: () => {},
  });
  applicationDb = drizzle(application, { schema });
}, 120_000);

afterAll(async () => {
  await application?.end();
  await admin?.end();
});

describe("PF-03B PostgreSQL RLS tenant isolation", () => {
  it("enables and forces RLS with non-bypass application and fixture roles", async () => {
    const rows = await admin<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }[]>`
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      where relname in ${admin(tenantTables)}
    `;
    const roles = await admin<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      select rolname, rolsuper, rolbypassrls
      from pg_roles
      where rolname in ('patrimoine_app', 'patrimoine_fixture_service', 'patrimoine_webhook_service')
      order by rolname
    `;
    const [serviceMembership] = await admin<{
      application_has_service_role: boolean;
      deployment_has_service_role: boolean;
      application_has_webhook_role: boolean;
    }[]>`
      select
        pg_has_role('pf03_test_app', 'patrimoine_fixture_service', 'member')
          as application_has_service_role,
        pg_has_role(current_user, 'patrimoine_fixture_service', 'member')
          as deployment_has_service_role,
        pg_has_role('pf03_test_app', 'patrimoine_webhook_service', 'member')
          as application_has_webhook_role
    `;

    expect(rows).toHaveLength(tenantTables.length);
    expect(rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
    expect(roles).toEqual([
      { rolname: "patrimoine_app", rolsuper: false, rolbypassrls: false },
      { rolname: "patrimoine_fixture_service", rolsuper: false, rolbypassrls: false },
      { rolname: "patrimoine_webhook_service", rolsuper: false, rolbypassrls: false },
    ]);
    expect(serviceMembership).toEqual({
      application_has_service_role: false,
      deployment_has_service_role: true,
      application_has_webhook_role: false,
    });
  });

  it("imports Claire and Marc idempotently into one synthetic demo tenant", async () => {
    const [counts] = await admin<{
      tenants: number;
      dossiers: number;
      documents: number;
      audits: number;
    }[]>`
      select
        (select count(*)::int from tenants where id = ${tenantA}) as tenants,
        (select count(*)::int from client_cases where id = ${dossierA}) as dossiers,
        (select count(*)::int from documents where tenant_id = ${tenantA}) as documents,
        (select count(*)::int from audit_logs where correlation_id = 'pf03b-demo-fixture-seed') as audits
    `;

    expect(counts).toEqual({ tenants: 1, dossiers: 1, documents: 5, audits: 1 });
  });

  it.each([
    ["CABINET_A", contextA, dossierB],
    ["CABINET_B", contextB, dossierA],
  ])("%s cannot read, update or delete the other dossier", async (_label, context, foreignDossier) => {
    const repository = createTenantResourceRepository(applicationDb);

    await expect(repository.findDossier(context, foreignDossier)).resolves.toBeNull();
    await expect(
      repository.updateDossierTitle(context, foreignDossier, "cross-tenant"),
    ).resolves.toBe(false);
    await expect(repository.deleteDossier(context, foreignDossier)).resolves.toBe(false);

    const direct = await runAsTenant(context, async (transaction) => {
      const read = await transaction`select id from client_cases where id = ${foreignDossier}`;
      const update = await transaction`
        update client_cases set title = 'cross-tenant-direct'
        where id = ${foreignDossier} returning id
      `;
      const deleted = await transaction`
        delete from client_cases where id = ${foreignDossier} returning id
      `;
      return { read: read.length, update: update.length, deleted: deleted.length };
    });

    expect(direct).toEqual({ read: 0, update: 0, deleted: 0 });
  });

  it.each([
    ["CABINET_A", contextA, documentB, runB, tenantB],
    ["CABINET_B", contextB, documentA, runA, tenantA],
  ])("%s cannot read the other documents, simulations or audit logs", async (
    _label,
    context,
    foreignDocument,
    foreignRun,
    foreignTenant,
  ) => {
    const repository = createTenantResourceRepository(applicationDb);

    await expect(repository.findDocumentMetadata(context, foreignDocument)).resolves.toBeNull();
    await expect(repository.findSimulationRun(context, foreignRun)).resolves.toBeNull();
    const audit = await repository.listAuditLogs(context);
    expect(audit.every((entry) => entry.tenantId === context.tenantId)).toBe(true);

    const direct = await runAsTenant(context, async (transaction) => ({
      documents: (await transaction`select id from documents where tenant_id = ${foreignTenant}`).length,
      simulations: (await transaction`select id from simulation_runs where tenant_id = ${foreignTenant}`).length,
      audits: (await transaction`select id from audit_logs where tenant_id = ${foreignTenant}`).length,
    }));
    expect(direct).toEqual({ documents: 0, simulations: 0, audits: 0 });
  });

  it("denies missing or invalid tenant context", async () => {
    const missing = await application.begin(async (transaction) => {
      await transaction.unsafe("set local role patrimoine_app");
      await transaction.unsafe("reset app.tenant_id");
      await transaction.unsafe("reset app.user_id");
      await transaction.unsafe("reset app.role");
      return {
        dossiers: (await transaction`select id from client_cases`).length,
        documents: (await transaction`select id from documents`).length,
        simulations: (await transaction`select id from simulation_runs`).length,
        audits: (await transaction`select id from audit_logs`).length,
      };
    });
    expect(missing).toEqual({ dossiers: 0, documents: 0, simulations: 0, audits: 0 });

    const mismatched = createInternalTenantContext({
      tenantId: tenantA,
      identityId: identityB,
      role: "conseiller",
      source: "internal-test",
    });
    await expect(
      createTenantResourceRepository(applicationDb).findDossier(mismatched, dossierA),
    ).rejects.toThrow("TENANT_MEMBERSHIP_REQUIRED");
  });

  it("resolves Clerk only through the active internal membership and tenant mapping", async () => {
    const resolve = (userId: string, organizationId: string) => application.begin(async (transaction) => {
      await transaction.unsafe("set local role patrimoine_app");
      return transaction<{ tenant_id: string; identity_id: string; role: string }[]>`
        select * from app_security.resolve_clerk_context(${userId}, ${organizationId})
      `;
    });

    await expect(resolve("unknown_clerk_user", "org_clerk_a")).resolves.toEqual([]);
    await expect(resolve("user_clerk_without_membership", "org_clerk_without_membership")).resolves.toEqual([]);
    await expect(resolve("user_clerk_a", "org_clerk_wrong_tenant")).resolves.toEqual([]);
    await expect(resolve("user_clerk_a", "org_clerk_a")).resolves.toEqual([
      { tenant_id: tenantA, identity_id: clerkIdentity, role: "conseiller" },
    ]);

    await admin`
      update memberships set status = 'disabled', revoked_at = now()
      where tenant_id = ${tenantA} and user_identity_id = ${clerkIdentity}
    `;
    await expect(resolve("user_clerk_a", "org_clerk_a")).resolves.toEqual([]);
  });

  it("limits a client to explicitly granted dossiers and denies expert or cabinet actions", async () => {
    const repository = createTenantResourceRepository(applicationDb);
    await expect(repository.findDossier(contextClient, dossierA)).resolves.toMatchObject({ id: dossierA });
    await expect(repository.findDossier(contextClient, clientDeniedDossier)).resolves.toBeNull();
    await expect(repository.findDossier(contextClient, dossierB)).resolves.toBeNull();
    await expect(repository.findDocumentMetadata(contextClient, documentA)).resolves.toMatchObject({ id: documentA });
    await expect(repository.findDocumentMetadata(contextClient, documentB)).resolves.toBeNull();
    await expect(repository.updateDossierTitle(contextClient, dossierA, "forbidden"))
      .rejects.toThrow("TENANT_AUTHORIZATION_DENIED");

    const direct = await runAsTenant(contextClient, async (transaction) => ({
      granted: (await transaction`select id from client_cases where id = ${dossierA}`).length,
      ungranted: (await transaction`select id from client_cases where id = ${clientDeniedDossier}`).length,
      foreignReport: (await transaction`select id from report_versions where id = ${reportB}`).length,
    }));
    expect(direct).toEqual({ granted: 1, ungranted: 0, foreignReport: 0 });

    const audits = await repository.listAuditLogs(contextA);
    expect(audits.some((entry) => entry.action === "authorization.denied"
      && entry.metadata?.action === "dossier.write")).toBe(true);

    await admin`
      update memberships set status = 'disabled', revoked_at = now()
      where tenant_id = ${tenantA} and user_identity_id = ${clientIdentity}
    `;
    await expect(repository.findDossier(contextClient, dossierA))
      .rejects.toThrow("TENANT_MEMBERSHIP_REQUIRED");
  });

  it("rejects a composite foreign key crossing the tenant boundary", async () => {
    await expect(admin`
      insert into assets
        (tenant_id, household_id, case_id, label, category, value)
      values (${tenantA}, ${householdA}, ${dossierB}, 'Cross tenant', 'test', 1)
    `).rejects.toMatchObject({ constraint_name: "assets_tenant_case_fk" });
  });

  it("rejects cross-tenant rule-version linkage at the database boundary", async () => {
    await expect(runAsTenant(contextA, async (transaction) => {
      await transaction`
        insert into calculation_steps
          (tenant_id, simulation_run_id, step_order, label, input_value, formula,
           output_value, rule_version_id, evidence_source_id, confidence_status)
        values
          (${tenantA}, ${runA}, 2, 'Cross tenant rule', '1', '1 = 1', '1',
           ${tenantBRuleId}, ${evidenceId}, 'validated')
      `;
    })).rejects.toThrow("rule version tenant does not match persisted trace tenant");
  });

  it("rolls back the whole tenant transaction on failure", async () => {
    const repository = createTenantResourceRepository(applicationDb);
    const before = await repository.findDossier(contextA, dossierA);

    await expect(
      withTenantTransaction(applicationDb, contextA, async (transaction) => {
        await transaction
          .update(clientCases)
          .set({ title: "must-roll-back" })
          .where(and(eq(clientCases.tenantId, tenantA), eq(clientCases.id, dossierA)));
        throw new Error("FORCED_ROLLBACK");
      }),
    ).rejects.toThrow("FORCED_ROLLBACK");

    await expect(repository.findDossier(contextA, dossierA)).resolves.toMatchObject({
      title: before?.title,
    });
  });

  it("records actor, tenant, action, resource, correlation and safe metadata", async () => {
    const repository = createTenantResourceRepository(applicationDb);
    await expect(repository.updateDossierTitle(contextA, dossierA, "Dossier Claire et Marc")).resolves.toBe(true);
    await expect(repository.findDocumentMetadata(contextA, documentA)).resolves.toMatchObject({ id: documentA });

    const entries = await repository.listAuditLogs(contextA);
    const update = entries.find((entry) => entry.action === "case.updated");
    const documentRead = entries.find((entry) => entry.action === "document.metadata.read");

    expect(update).toMatchObject({
      tenantId: tenantA,
      actorIdentityId: identityA,
      entityType: "dossier",
      entityId: dossierA,
      correlationId: contextA.correlationId,
      metadata: { changedField: "title" },
    });
    expect(update?.createdAt).toBeInstanceOf(Date);
    expect(documentRead).toMatchObject({
      tenantId: tenantA,
      actorIdentityId: identityA,
      entityType: "document",
      entityId: documentA,
      correlationId: contextA.correlationId,
      metadata: { scope: "metadata_only" },
    });
    expect(JSON.stringify([update?.metadata, documentRead?.metadata])).not.toMatch(
      /password|secret|token|income|taxableBase/i,
    );
  });

  it("persists simulation snapshots, steps and rule links inside RLS", async () => {
    const repository = createPostgresDataFoundationRepository(applicationDb);
    const input: PersistSimulationInput = {
      dossierId: dossierA,
      idempotencyKey: "pf03b-rls-simulation-a",
      engineKey: "pf03b-test",
      engineVersion: "1",
      scenario: "rls",
      status: "completed",
      inputSnapshot: { synthetic: true },
      outputSnapshot: { result: "synthetic" },
      professionalValidationRequired: false,
      steps: [{
        order: 1,
        label: "Étape synthétique",
        inputValue: "1",
        formula: "1 = 1",
        outputValue: "1",
        ruleVersionId: ruleId,
        evidenceSourceId: evidenceId,
        confidenceStatus: "validated",
      }],
    };

    const persisted = await repository.persist(contextA, input);
    await expect(repository.findById(contextA, persisted.runId)).resolves.toMatchObject({
      tenantId: tenantA,
      dossierId: dossierA,
      inputSnapshot: input.inputSnapshot,
      outputSnapshot: input.outputSnapshot,
      ruleVersionIds: [ruleId],
    });
    await expect(repository.findById(contextB, persisted.runId)).resolves.toBeNull();
  });
});
