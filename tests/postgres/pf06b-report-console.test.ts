import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../lib/db/schema";
import { seedClaireMarcDemo } from "../../lib/db/seed-demo";
import { v21PilotSeedPlan } from "../../lib/db/seed-v2-1";
import { buildDocumentVersionBlobKey } from "../../lib/documents/blob";
import { createInMemoryPrivateDocumentStorage } from "../../lib/documents/private-storage";
import { loadReportConsole } from "../../lib/report/report-console";
import { createServerReportService } from "../../lib/report/report-service";
import { createInternalTenantContext } from "../../lib/tenancy/tenant-context";

const tenantA = v21PilotSeedPlan.tenant.id;
const conseillerIdentity = v21PilotSeedPlan.identities[1].id;
const expertIdentity = v21PilotSeedPlan.identities[2].id;
const clientIdentity = v21PilotSeedPlan.identities[3].id;
const expertUser = v21PilotSeedPlan.users[2].id;
const dossierA = v21PilotSeedPlan.case.id;
const householdA = v21PilotSeedPlan.household.id;
const documentA = "77777777-7777-4777-8777-777777777771";
const documentVersionA = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaa1";
const runA = "99999999-9999-4999-8999-999999999991";
const evidenceId = "pf06b-official-source";
const ruleId = "pf06b-ifi-rule-v1";
const reviewId = "bbbbbbbb-1111-4bbb-8bbb-bbbbbbbbbbb1";

const tenantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const cabinetB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const identityB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const clientB = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const householdB = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const dossierB = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";

const signingSecret = "pf06b-console-download-secret-0123456789";
const testDatabaseName = "pf06b_report_console";
const legalFreezeDate = "2026-08-18";

const consoleEnv = {
  PERSISTENCE_MODE: "DATABASE",
  DATABASE_URL: "postgres://unused-by-tests",
  DOCUMENT_DOWNLOAD_SIGNING_SECRET: signingSecret,
  BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test_token",
} as unknown as NodeJS.ProcessEnv;

const contextConseiller = createInternalTenantContext({
  tenantId: tenantA,
  identityId: conseillerIdentity,
  role: "conseiller",
  source: "internal-test",
  correlationId: "pf06b-conseiller",
});
const contextExpert = createInternalTenantContext({
  tenantId: tenantA,
  identityId: expertIdentity,
  role: "expert",
  source: "internal-test",
  correlationId: "pf06b-expert",
});
const contextClient = createInternalTenantContext({
  tenantId: tenantA,
  identityId: clientIdentity,
  role: "client",
  source: "internal-test",
  correlationId: "pf06b-client",
});
const contextB = createInternalTenantContext({
  tenantId: tenantB,
  identityId: identityB,
  role: "conseiller",
  source: "internal-test",
  correlationId: "pf06b-cabinet-b",
});

type SqlClient = ReturnType<typeof postgres>;
let admin: SqlClient;
let application: SqlClient;
let applicationDb: ReturnType<typeof drizzle<typeof schema>>;
let storage: ReturnType<typeof createInMemoryPrivateDocumentStorage>;
let clock = new Date("2026-08-20T09:00:00.000Z");

function service() {
  return createServerReportService({
    database: applicationDb,
    storage,
    downloadSigningSecret: signingSecret,
    now: () => clock,
  });
}

function loadConsole(context: typeof contextConseiller, caseId?: string) {
  return loadReportConsole(context, {
    caseId,
    database: applicationDb,
    env: consoleEnv,
  });
}

function tick(minutes: number) {
  clock = new Date(clock.getTime() + minutes * 60_000);
  return clock;
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

async function seedSecondTenant() {
  await admin`
    insert into tenants (id, name, slug, status, data_region)
    values (${tenantB}, 'CABINET_B', 'cabinet-b', 'pilot', 'eu')
  `;
  await admin`
    insert into cabinets (id, tenant_id, legal_name, professional_type)
    values (${cabinetB}, ${tenantB}, 'CABINET_B', 'cabinet_test')
  `;
  await admin`
    insert into user_identities (id, provider, provider_subject, email_normalized, display_name)
    values (${identityB}, 'internal-test', 'pf06b-cabinet-b', 'b@example.test', 'Conseiller B')
  `;
  await admin`
    insert into memberships (tenant_id, user_identity_id, role, status, activated_at)
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
    values (${householdB}, ${tenantB}, ${clientB}, 'Foyer B', 'test',
      ${JSON.stringify(["Personne B"])}::jsonb, 'France', 'test',
      ${JSON.stringify(["isolation"])}::jsonb)
  `;
  await admin`
    insert into client_cases
      (id, tenant_id, client_id, household_id, reference, title, status, fiscal_year)
    values (${dossierB}, ${tenantB}, ${clientB}, ${householdB}, 'DOS-B', 'Dossier B', 'draft', 2026)
  `;
}

async function seedRunAndEvidence() {
  await admin`
    insert into evidence_sources
      (id, title, authority, url, checked_at, legal_scope, reliability, status)
    values (${evidenceId}, 'CGI — IFI', 'LEGIFRANCE', 'https://www.legifrance.gouv.fr/',
      '2026-08-18T00:00:00Z', 'ifi', 'official', 'verified')
  `;
  await admin`
    insert into rule_versions
      (id, rule_set, version, title, effective_from, status, evidence_source_ids,
       source_reference, rule_payload, checksum_sha256)
    values (${ruleId}, 'pf06b-ifi', 'IFI-2026.08-V3', 'IFI 2026', '2026-01-01', 'active',
      ${JSON.stringify([evidenceId])}::jsonb, 'CGI art. 964 et suivants',
      ${JSON.stringify({ testOnly: true })}::jsonb, ${"c".repeat(64)})
  `;
  await admin`
    insert into simulation_runs
      (id, tenant_id, case_id, household_id, engine_key, engine_version, scenario,
       status, idempotency_key, input_snapshot, output, coverage_limit_ids,
       professional_validation_required, completed_at)
    values (${runA}, ${tenantA}, ${dossierA}, ${householdA}, 'ifi', '3', 'reference',
      'completed', 'pf06b-run-a',
      ${JSON.stringify({ grossWealth: 2400000, netWealth: 1110000 })}::jsonb,
      ${JSON.stringify({ taxDue: 1445 })}::jsonb, ${JSON.stringify([])}::jsonb,
      true, '2026-08-18T09:00:00Z')
  `;
  await admin`
    insert into calculation_steps
      (tenant_id, simulation_run_id, step_order, label, input_value, formula,
       output_value, rule_version_id, evidence_source_id, confidence_status,
       coverage_limit_ids, display_status)
    values (${tenantA}, ${runA}, 1, 'Base imposable IFI', '2400000',
      'actifs taxables - dettes admises', '1110000', ${ruleId}, ${evidenceId},
      'validated', ${JSON.stringify([])}::jsonb, 'validated_calculation')
  `;
  await admin`
    insert into simulation_rule_versions (tenant_id, simulation_run_id, rule_version_id, purpose)
    values (${tenantA}, ${runA}, ${ruleId}, 'calculation-step')
  `;

  const blobKey = buildDocumentVersionBlobKey({
    tenantId: tenantA,
    caseId: dossierA,
    documentId: documentA,
    versionId: documentVersionA,
  });
  await admin`
    insert into document_versions
      (id, tenant_id, document_id, case_id, version_number, blob_key, status, scan_status,
       original_file_name, mime_type, byte_size, sha256, uploaded_by_identity_id, available_at)
    values (${documentVersionA}, ${tenantA}, ${documentA}, ${dossierA}, 1, ${blobKey},
      'available', 'clean', 'Avis imposition 2026.pdf', 'application/pdf', 4096,
      ${"d".repeat(64)}, ${conseillerIdentity}, now())
  `;
  await admin`
    insert into simulation_document_versions
      (tenant_id, simulation_run_id, document_version_id, purpose)
    values (${tenantA}, ${runA}, ${documentVersionA}, 'supporting-evidence')
  `;
  await admin`
    insert into professional_reviews
      (id, tenant_id, case_id, reviewer_user_id, decision, summary, required_actions)
    values (${reviewId}, ${tenantA}, ${dossierA}, ${expertUser}, 'pending',
      'Revue en attente.', ${JSON.stringify([])}::jsonb)
  `;
}

beforeAll(async () => {
  const rootUrl = process.env.PF03_TEST_DATABASE_URL;
  if (!rootUrl) {
    throw new Error("PF03_TEST_DATABASE_URL_REQUIRED");
  }

  const root = postgres(rootUrl, { max: 1, prepare: false, onnotice: () => {} });
  await root.unsafe(`CREATE DATABASE ${testDatabaseName}`);
  await root.end();

  const url = new URL(rootUrl);
  url.pathname = `/${testDatabaseName}`;
  const databaseUrl = url.toString();

  admin = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });
  await applyMigrations(admin);
  await admin.unsafe(`
    CREATE ROLE pf06b_test_app
      LOGIN PASSWORD 'pf06b-test-password'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    GRANT patrimoine_app TO pf06b_test_app;
  `);

  await seedClaireMarcDemo(drizzle(admin, { schema }));
  await seedSecondTenant();
  await seedRunAndEvidence();

  const applicationUrl = new URL(databaseUrl);
  applicationUrl.username = "pf06b_test_app";
  applicationUrl.password = "pf06b-test-password";
  application = postgres(applicationUrl.toString(), {
    max: 1,
    prepare: false,
    onnotice: () => {},
  });
  applicationDb = drizzle(application, { schema });
  storage = createInMemoryPrivateDocumentStorage();
}, 180_000);

afterAll(async () => {
  await application?.end();
  await admin?.end();
});

describe("PF-06B cabinet report console workflow", () => {
  it("opens on the dossier with no version and an explicit blocking gate", async () => {
    const state = await loadConsole(contextConseiller);

    expect(state.available).toBe(true);
    if (!state.available) return;

    expect(state.selectedDossier?.id).toBe(dossierA);
    expect(state.runs.map((run) => run.id)).toEqual([runA]);
    expect(state.currentVersion).toBeNull();
    expect(state.capabilities).toEqual({ generate: true, validate: false, download: true });
    expect(state.blockers.map((blocker) => blocker.code)).toEqual(
      expect.arrayContaining(["REPORT_LEGAL_FREEZE_DATE_REQUIRED", "REPORT_SIMULATION_RUN_REQUIRED"]),
    );
    expect(state.blockers.every((blocker) => blocker.code && blocker.detail)).toBe(true);
  }, 60_000);

  it("shows the DRAFT state, its watermark and a current snapshot after generation", async () => {
    const draft = await service().generateDraft(contextConseiller, {
      caseId: dossierA,
      simulationRunIds: [runA],
      legalFreezeDate,
    });
    expect(draft.status).toBe("draft");

    const state = await loadConsole(contextConseiller);
    if (!state.available) throw new Error("console unavailable");

    expect(state.currentVersion).toMatchObject({
      versionNumber: 1,
      status: "draft",
      watermark: "BROUILLON — NON VALIDÉ",
    });
    expect(state.legalFreezeDate).toBe(legalFreezeDate);
    expect(state.selectedRunIds).toEqual([runA]);
    expect(state.freshness?.status).toBe("current");
    expect(state.readiness?.evidenceCount).toBe(1);
    expect(state.readiness?.canValidateFinal).toBe(false);
    expect(state.blockers.map((blocker) => blocker.code))
      .toContain("review.professional_not_signed");
  }, 60_000);

  it("declares the report OUTDATED when a fact changes, without touching the stored PDF", async () => {
    const before = await loadConsole(contextConseiller);
    if (!before.available || !before.currentVersion) throw new Error("missing draft");
    const storedPdfSha = before.currentVersion.pdfSha256;
    const storedSnapshotSha = before.currentVersion.snapshotSha256;

    await admin`
      update professional_reviews
      set decision = 'approved', summary = 'Revue signée.', reviewed_at = '2026-08-20T08:00:00Z'
      where id = ${reviewId}
    `;

    const state = await loadConsole(contextConseiller);
    if (!state.available || !state.currentVersion) throw new Error("missing draft");

    expect(state.freshness?.status).toBe("outdated");
    expect(state.freshness?.reasonCode).toBe("REPORT_REGENERATION_REQUIRED");
    expect(state.freshness?.changedSections).toEqual(
      expect.arrayContaining(["professionalValidation", "reviewFlags"]),
    );
    expect(state.blockers.map((blocker) => blocker.code)).toContain("REPORT_REGENERATION_REQUIRED");

    // The delivered version is never rewritten.
    expect(state.currentVersion.pdfSha256).toBe(storedPdfSha);
    expect(state.currentVersion.snapshotSha256).toBe(storedSnapshotSha);
    const [row] = await admin<{ pdf_sha256: string; snapshot_sha256: string }[]>`
      select pdf_sha256, snapshot_sha256 from report_versions
      where id = ${state.currentVersion.reportVersionId}
    `;
    expect(row).toEqual({ pdf_sha256: storedPdfSha, snapshot_sha256: storedSnapshotSha });
  }, 60_000);

  it("returns to a current, validatable state after regeneration", async () => {
    tick(30);
    const regenerated = await service().generateDraft(contextConseiller, {
      caseId: dossierA,
      simulationRunIds: [runA],
      legalFreezeDate,
    });
    expect(regenerated.versionNumber).toBe(2);

    const state = await loadConsole(contextConseiller);
    if (!state.available) throw new Error("console unavailable");

    expect(state.freshness?.status).toBe("current");
    expect(state.readiness?.canValidateFinal).toBe(true);
    expect(state.readiness?.professionalReviewSigned).toBe(true);
    expect(state.blockers.filter((blocker) => blocker.severity === "blocking")).toEqual([]);
    expect(state.storageConfigured).toBe(true);
    expect(state.versions.map((version) => version.versionNumber)).toEqual([1, 2]);
  }, 60_000);

  it("never offers validation to a client and refuses it server-side", async () => {
    const state = await loadConsole(contextClient);
    if (!state.available) throw new Error("console unavailable");

    expect(state.capabilities.validate).toBe(false);
    expect(state.capabilities.generate).toBe(false);

    const versions = await service().listVersions(contextConseiller, dossierA);
    const latest = versions[versions.length - 1];
    await expect(service().validateVersion(contextClient, {
      reportVersionId: latest.reportVersionId,
      decision: "approved",
      comment: "Tentative client.",
    })).rejects.toThrow("TENANT_AUTHORIZATION_DENIED");
  }, 60_000);

  it("moves to VALIDATED through the expert role and exposes the download", async () => {
    const expertState = await loadConsole(contextExpert);
    if (!expertState.available || !expertState.currentVersion) throw new Error("missing version");
    expect(expertState.capabilities.validate).toBe(true);

    tick(30);
    const validated = await service().validateVersion(contextExpert, {
      reportVersionId: expertState.currentVersion.reportVersionId,
      decision: "approved",
      comment: "Conclusions vérifiées.",
    });

    expect(validated).toMatchObject({ versionNumber: 3, status: "validated", watermark: null });

    const state = await loadConsole(contextConseiller);
    if (!state.available || !state.currentVersion) throw new Error("missing version");
    expect(state.currentVersion.status).toBe("validated");
    expect(state.currentVersion.watermark).toBeNull();
    expect(state.freshness?.status).toBe("current");

    const authorization = await service().authorizeDownload(
      contextConseiller,
      state.currentVersion.reportVersionId,
    );
    const payload = await service().openDownload(contextConseiller, authorization.token);
    expect(payload.status).toBe("validated");
    expect(payload.pdfSha256).toBe(state.currentVersion.pdfSha256);

    const audits = await admin<{ action: string }[]>`
      select distinct action from audit_logs
      where tenant_id = ${tenantA}
        and action in ('report.generated', 'report.validated',
                       'report.download.authorized', 'report.downloaded')
    `;
    expect(audits.map((entry) => entry.action).sort()).toEqual([
      "report.download.authorized",
      "report.downloaded",
      "report.generated",
      "report.validated",
    ]);
  }, 120_000);

  it("never leaks another cabinet's dossier or report into the console", async () => {
    const state = await loadConsole(contextB);
    if (!state.available) throw new Error("console unavailable");

    expect(state.dossiers.map((dossier) => dossier.id)).toEqual([dossierB]);
    expect(state.selectedDossier?.id).toBe(dossierB);
    expect(state.versions).toEqual([]);
    expect(state.currentVersion).toBeNull();

    // Asking for another cabinet's dossier resolves to nothing and says so.
    const forced = await loadConsole(contextB, dossierA);
    if (!forced.available) throw new Error("console unavailable");
    expect(forced.selectedDossier).toBeNull();
    expect(forced.versions).toEqual([]);
    expect(forced.blockers.map((blocker) => blocker.code))
      .toContain("REPORT_DOSSIER_NOT_ACCESSIBLE");
  }, 60_000);
});
