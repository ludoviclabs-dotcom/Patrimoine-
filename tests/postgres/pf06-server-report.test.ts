import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../lib/db/schema";
import { seedClaireMarcDemo } from "../../lib/db/seed-demo";
import { v21PilotSeedPlan } from "../../lib/db/seed-v2-1";
import { issueDownloadGrant } from "../../lib/documents/access-grant";
import { buildDocumentVersionBlobKey, buildReportVersionBlobKey } from "../../lib/documents/blob";
import { createInMemoryPrivateDocumentStorage } from "../../lib/documents/private-storage";
import { createServerReportService } from "../../lib/report/report-service";
import type { ReportSnapshot } from "../../lib/report/snapshot";
import { createInternalTenantContext } from "../../lib/tenancy/tenant-context";

const tenantA = v21PilotSeedPlan.tenant.id;
const conseillerIdentity = v21PilotSeedPlan.identities[1].id;
const expertIdentity = v21PilotSeedPlan.identities[2].id;
const expertUser = v21PilotSeedPlan.users[2].id;
const dossierA = v21PilotSeedPlan.case.id;
const householdA = v21PilotSeedPlan.household.id;
const documentA = "77777777-7777-4777-8777-777777777771";
const documentVersionA = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaa1";
const runA = "99999999-9999-4999-8999-999999999991";
const evidenceId = "pf06-official-source";
const ruleId = "pf06-ifi-rule-v1";
const reviewId = "bbbbbbbb-1111-4bbb-8bbb-bbbbbbbbbbb1";

const tenantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const cabinetB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const identityB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const clientB = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const householdB = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const dossierB = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const runB = "99999999-9999-4999-8999-999999999992";

const signingSecret = "pf06-postgres-report-secret-0123456789";
const testDatabaseName = "pf06_server_report";
const legalFreezeDate = "2026-08-18";

const contextConseiller = createInternalTenantContext({
  tenantId: tenantA,
  identityId: conseillerIdentity,
  role: "conseiller",
  source: "internal-test",
  correlationId: "pf06-correlation-conseiller",
});
const contextExpert = createInternalTenantContext({
  tenantId: tenantA,
  identityId: expertIdentity,
  role: "expert",
  source: "internal-test",
  correlationId: "pf06-correlation-expert",
});
const contextB = createInternalTenantContext({
  tenantId: tenantB,
  identityId: identityB,
  role: "conseiller",
  source: "internal-test",
  correlationId: "pf06-correlation-b",
});

type SqlClient = ReturnType<typeof postgres>;
let admin: SqlClient;
let application: SqlClient;
let applicationDb: ReturnType<typeof drizzle<typeof schema>>;
let storage: ReturnType<typeof createInMemoryPrivateDocumentStorage>;
let clock = new Date("2026-08-20T09:00:00.000Z");

function service(now: () => Date = () => clock) {
  return createServerReportService({
    database: applicationDb,
    storage,
    downloadSigningSecret: signingSecret,
    now,
  });
}

function tick(minutes: number) {
  clock = new Date(clock.getTime() + minutes * 60_000);
  return clock;
}

async function readStream(stream: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function applicationUrl(adminUrl: string) {
  const url = new URL(adminUrl);
  url.username = "pf06_test_app";
  url.password = "pf06-test-password";
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
    values (${identityB}, 'internal-test', 'pf06-cabinet-b', 'b@example.test', 'Conseiller B')
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

async function seedRunsAndEvidence() {
  await admin`
    insert into evidence_sources
      (id, title, authority, url, checked_at, legal_scope, reliability, status)
    values (${evidenceId}, 'CGI — impôt sur la fortune immobilière', 'LEGIFRANCE',
      'https://www.legifrance.gouv.fr/', '2026-08-18T00:00:00Z', 'ifi', 'official', 'verified')
  `;
  await admin`
    insert into rule_versions
      (id, rule_set, version, title, effective_from, status, evidence_source_ids,
       source_reference, rule_payload, checksum_sha256)
    values (${ruleId}, 'pf06-ifi', 'IFI-2026.08-V3', 'IFI 2026', '2026-01-01', 'active',
      ${JSON.stringify([evidenceId])}::jsonb, 'CGI art. 964 et suivants',
      ${JSON.stringify({ testOnly: true })}::jsonb, ${"c".repeat(64)})
  `;

  for (const run of [
    { id: runA, tenantId: tenantA, caseId: dossierA, householdId: householdA, scenario: "reference" },
    { id: runB, tenantId: tenantB, caseId: dossierB, householdId: householdB, scenario: "reference" },
  ]) {
    await admin`
      insert into simulation_runs
        (id, tenant_id, case_id, household_id, engine_key, engine_version, scenario,
         status, idempotency_key, input_snapshot, output, coverage_limit_ids,
         professional_validation_required, completed_at)
      values (${run.id}, ${run.tenantId}, ${run.caseId}, ${run.householdId}, 'ifi', '3',
        ${run.scenario}, 'completed', ${`pf06-${run.id}`},
        ${JSON.stringify({ grossWealth: 2400000, netWealth: 1110000 })}::jsonb,
        ${JSON.stringify({ taxDue: 1445 })}::jsonb, ${JSON.stringify([])}::jsonb,
        true, '2026-08-18T09:00:00Z')
    `;
    await admin`
      insert into calculation_steps
        (tenant_id, simulation_run_id, step_order, label, input_value, formula,
         output_value, rule_version_id, evidence_source_id, confidence_status,
         coverage_limit_ids, display_status)
      values (${run.tenantId}, ${run.id}, 1, 'Base imposable IFI', '2400000',
        'actifs taxables - dettes admises', '1110000', ${ruleId}, ${evidenceId},
        'validated', ${JSON.stringify([])}::jsonb, 'validated_calculation')
    `;
    await admin`
      insert into simulation_rule_versions (tenant_id, simulation_run_id, rule_version_id, purpose)
      values (${run.tenantId}, ${run.id}, ${ruleId}, 'calculation-step')
    `;
  }
}

/** Attaches one private document version to the tenant A simulation trace. */
async function seedEvidenceDocument() {
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
    update documents
    set storage_status = 'available', current_version_number = 1, blob_path = ${blobKey},
        sha256 = ${"d".repeat(64)}, mime_type = 'application/pdf', byte_size = 4096
    where id = ${documentA}
  `;
  await admin`
    insert into simulation_document_versions
      (tenant_id, simulation_run_id, document_version_id, purpose)
    values (${tenantA}, ${runA}, ${documentVersionA}, 'supporting-evidence')
  `;
}

async function seedPendingProfessionalReview() {
  await admin`
    insert into professional_reviews
      (id, tenant_id, case_id, reviewer_user_id, decision, summary, required_actions)
    values (${reviewId}, ${tenantA}, ${dossierA}, ${expertUser}, 'pending',
      'Revue en attente de signature.', ${JSON.stringify([])}::jsonb)
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
    CREATE ROLE pf06_test_app
      LOGIN PASSWORD 'pf06-test-password'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    GRANT patrimoine_app TO pf06_test_app;
  `);

  await seedClaireMarcDemo(drizzle(admin, { schema }));
  await seedSecondTenant();
  await seedRunsAndEvidence();
  await seedEvidenceDocument();
  await seedPendingProfessionalReview();

  application = postgres(applicationUrl(databaseUrl), {
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

describe("PF-06 server report and immutable snapshot", () => {
  it("forces RLS on reports and publishes the PF-06 readiness attestation", async () => {
    const [row] = await admin<{ relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
      select relrowsecurity, relforcerowsecurity from pg_class where relname = 'reports'
    `;
    const [readiness] = await admin<{ readiness: { migration: string; rlsReady: boolean } }[]>`
      select app_security.managed_postgres_readiness() as readiness
    `;

    expect(row).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    expect(readiness.readiness).toEqual({
      migration: "0009_pf06_server_report_snapshot",
      rlsReady: true,
    });
  });

  it("builds the immutable snapshot before rendering, and stores the PDF privately", async () => {
    const version = await service().generateDraft(contextConseiller, {
      caseId: dossierA,
      simulationRunIds: [runA],
      legalFreezeDate,
    });

    expect(version).toMatchObject({
      versionNumber: 1,
      status: "draft",
      decision: "pending",
      watermark: "BROUILLON — NON VALIDÉ",
    });
    expect(version.snapshotSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(version.businessSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(version.pdfSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(version.pdfByteSize).toBeGreaterThan(0);

    const snapshot = await service().getSnapshot(contextConseiller, version.reportVersionId);
    expect(snapshot.business.dossier.reference).toBe(v21PilotSeedPlan.case.reference);
    expect(snapshot.business.legalFreezeDate).toBe(legalFreezeDate);
    expect(snapshot.business.simulationRunIds).toEqual([runA]);
    expect(snapshot.business.runs[0].inputSnapshot).toEqual({
      grossWealth: 2400000,
      netWealth: 1110000,
    });
    expect(snapshot.business.calculationSteps[0]).toMatchObject({
      stepOrder: 1,
      ruleVersionId: ruleId,
      confidenceStatus: "validated",
    });
    expect(snapshot.generation.generatorVersion).toMatch(/^PF06-/);

    const expectedKey = buildReportVersionBlobKey({
      tenantId: tenantA,
      reportId: version.reportId,
      reportVersionId: version.reportVersionId,
    });
    expect(storage.keys()).toContain(expectedKey);
    expect(expectedKey).not.toMatch(/claire|marc|dos-|\.pdf/i);

    const stored = storage.bytesFor(expectedKey);
    expect(Buffer.from(stored!.subarray(0, 5)).toString("latin1")).toBe("%PDF-");

    const [audit] = await admin<{ metadata: Record<string, unknown> }[]>`
      select metadata from audit_logs
      where action = 'report.generated' and entity_id = ${version.reportVersionId}
    `;
    expect(audit.metadata).toMatchObject({
      versionNumber: 1,
      status: "draft",
      snapshotSha256: version.snapshotSha256,
      pdfSha256: version.pdfSha256,
    });
  }, 60_000);

  it("keeps the business content stable across generations of the same facts", async () => {
    const [first] = await service().listVersions(contextConseiller, dossierA);
    tick(30);
    const second = await service().generateDraft(contextConseiller, {
      caseId: dossierA,
      simulationRunIds: [runA],
      legalFreezeDate,
    });

    expect(second.versionNumber).toBe(2);
    expect(second.businessSha256).toBe(first.businessSha256);
    expect(second.snapshotSha256).not.toBe(first.snapshotSha256);
    expect(second.pdfSha256).not.toBe(first.pdfSha256);
  }, 60_000);

  it("denies every cross-tenant report read, generation and download", async () => {
    const [version] = await service().listVersions(contextConseiller, dossierA);

    await expect(service().listVersions(contextB, dossierA)).resolves.toEqual([]);
    await expect(service().getSnapshot(contextB, version.reportVersionId))
      .rejects.toThrow("REPORT_VERSION_NOT_FOUND");
    await expect(service().authorizeDownload(contextB, version.reportVersionId))
      .rejects.toThrow("REPORT_VERSION_NOT_FOUND");
    await expect(service().generateDraft(contextB, {
      caseId: dossierA,
      simulationRunIds: [runA],
      legalFreezeDate,
    })).rejects.toThrow("DOSSIER_NOT_FOUND");
    await expect(service().generateDraft(contextConseiller, {
      caseId: dossierA,
      simulationRunIds: [runB],
      legalFreezeDate,
    })).rejects.toThrow("SIMULATION_RUN_NOT_FOUND");

    const direct = await application.begin(async (transaction) => {
      await transaction.unsafe("set local role patrimoine_app");
      await transaction`select set_config('app.tenant_id', ${tenantB}, true)`;
      await transaction`select set_config('app.user_id', ${identityB}, true)`;
      await transaction`select set_config('app.role', 'conseiller', true)`;
      return {
        reports: (await transaction`select id from reports where tenant_id = ${tenantA}`).length,
        versions: (await transaction`select id from report_versions where tenant_id = ${tenantA}`).length,
      };
    });
    expect(direct).toEqual({ reports: 0, versions: 0 });
  }, 60_000);

  it("refuses validation by a non-expert and while the required review is unsigned", async () => {
    const versions = await service().listVersions(contextConseiller, dossierA);
    const latest = versions[versions.length - 1];

    expect(latest.blockingFlagCount).toBeGreaterThan(0);
    await expect(service().validateVersion(contextConseiller, {
      reportVersionId: latest.reportVersionId,
      decision: "approved",
      comment: "Tentative sans habilitation.",
    })).rejects.toThrow("TENANT_AUTHORIZATION_DENIED");

    await expect(service().validateVersion(contextExpert, {
      reportVersionId: latest.reportVersionId,
      decision: "approved",
      comment: "Revue non signée.",
    })).rejects.toThrow("REPORT_READINESS_BLOCKED");

    const snapshot = await service().getSnapshot(contextConseiller, latest.reportVersionId);
    expect(snapshot.business.reviewFlags.map((flag) => flag.code))
      .toContain("review.professional_not_signed");
  }, 60_000);

  it("records a validation as a new immutable version without touching the reviewed one", async () => {
    await admin`
      update professional_reviews
      set decision = 'approved', summary = 'Revue signée par l''expert.',
          reviewed_at = '2026-08-20T08:00:00Z'
      where id = ${reviewId}
    `;

    tick(30);
    const draft = await service().generateDraft(contextConseiller, {
      caseId: dossierA,
      simulationRunIds: [runA],
      legalFreezeDate,
    });
    expect(draft.versionNumber).toBe(3);
    expect(draft.blockingFlagCount).toBe(0);

    tick(30);
    const validated = await service().validateVersion(contextExpert, {
      reportVersionId: draft.reportVersionId,
      decision: "approved",
      comment: "Conclusions vérifiées et validées.",
    });

    expect(validated).toMatchObject({
      versionNumber: 4,
      status: "validated",
      decision: "approved",
      watermark: null,
    });
    expect(validated.businessSha256).toBe(draft.businessSha256);
    expect(validated.snapshotSha256).not.toBe(draft.snapshotSha256);
    expect(validated.reportVersionId).not.toBe(draft.reportVersionId);

    const validatedSnapshot = await service().getSnapshot(
      contextConseiller,
      validated.reportVersionId,
    );
    expect(validatedSnapshot.validation).toMatchObject({
      status: "validated",
      decision: "approved",
      validatedByIdentityId: expertIdentity,
      comment: "Conclusions vérifiées et validées.",
    });
    expect(validatedSnapshot.validation.validatedAt).toBeTruthy();

    const reviewedSnapshot = await service().getSnapshot(contextConseiller, draft.reportVersionId);
    expect(reviewedSnapshot.validation.status).toBe("draft");
    expect(reviewedSnapshot.generation.watermark).toBe("BROUILLON — NON VALIDÉ");

    await expect(admin`
      update report_versions set status = 'validated' where id = ${draft.reportVersionId}
    `).rejects.toThrow("report version content is immutable");
    await expect(admin`
      delete from report_versions where id = ${draft.reportVersionId}
    `).rejects.toThrow("report version rows are append-only");

    await expect(service().validateVersion(contextExpert, {
      reportVersionId: draft.reportVersionId,
      decision: "approved",
      comment: "Seconde tentative sur une version remplacée.",
    })).rejects.toThrow("REPORT_VERSION_SUPERSEDED");
    await expect(service().validateVersion(contextExpert, {
      reportVersionId: validated.reportVersionId,
      decision: "approved",
      comment: "Version déjà validée.",
    })).rejects.toThrow("REPORT_ALREADY_VALIDATED");
  }, 120_000);

  it("carries rule provenance and document evidence into the validated snapshot", async () => {
    const versions = await service().listVersions(contextConseiller, dossierA);
    const validated = versions[versions.length - 1];
    const snapshot: ReportSnapshot = await service().getSnapshot(
      contextConseiller,
      validated.reportVersionId,
    );

    expect(snapshot.business.ruleVersions).toEqual([
      expect.objectContaining({
        id: ruleId,
        status: "active",
        sourceReference: "CGI art. 964 et suivants",
        evidenceSourceIds: [evidenceId],
      }),
    ]);
    expect(snapshot.business.evidenceSources.map((source) => source.id)).toContain(evidenceId);
    expect(
      snapshot.business.calculationSteps.every((step) =>
        snapshot.business.ruleVersions.some((rule) => rule.id === step.ruleVersionId)),
    ).toBe(true);
    expect(snapshot.business.documentReferences).toEqual([
      expect.objectContaining({
        documentId: documentA,
        documentVersionId: documentVersionA,
        versionNumber: 1,
        sha256: "d".repeat(64),
        purpose: "supporting-evidence",
      }),
    ]);
    expect(snapshot.business.professionalValidation).toMatchObject({
      required: true,
      decision: "approved",
    });
  }, 60_000);

  it("serves the stored PDF only through an audited, short-lived grant", async () => {
    const versions = await service().listVersions(contextConseiller, dossierA);
    const validated = versions[versions.length - 1];

    const authorization = await service().authorizeDownload(
      contextConseiller,
      validated.reportVersionId,
    );
    expect(authorization.pdfSha256).toBe(validated.pdfSha256);
    expect(new Date(authorization.expiresAt).getTime()).toBeGreaterThan(clock.getTime());

    const payload = await service().openDownload(contextConseiller, authorization.token);
    const bytes = await readStream(payload.stream);
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.byteLength).toBe(validated.pdfByteSize);
    expect(payload.status).toBe("validated");
    expect(payload.fileName).toContain(v21PilotSeedPlan.case.reference);

    const expiredClock = new Date(clock.getTime() + 10 * 60 * 1000);
    await expect(service(() => expiredClock).openDownload(contextConseiller, authorization.token))
      .rejects.toThrow("REPORT_DOWNLOAD_GRANT_EXPIRED");
    await expect(service().openDownload(contextConseiller, `${authorization.token}x`))
      .rejects.toThrow("REPORT_DOWNLOAD_GRANT_INVALID_SIGNATURE");
    await expect(service().openDownload(contextExpert, authorization.token))
      .rejects.toThrow("REPORT_DOWNLOAD_GRANT_SUBJECT_MISMATCH");

    const forged = issueDownloadGrant(signingSecret, {
      tenantId: tenantB,
      resource: "report_version",
      resourceId: validated.reportId,
      versionId: validated.reportVersionId,
      identityId: identityB,
      expiresAtMs: clock.getTime() + 60_000,
    });
    await expect(service().openDownload(contextB, forged))
      .rejects.toThrow("REPORT_VERSION_NOT_FOUND");

    const audits = await admin<{ action: string }[]>`
      select action from audit_logs
      where entity_id = ${validated.reportVersionId}
        and action in ('report.download.authorized', 'report.downloaded')
      order by action
    `;
    expect(audits.map((entry) => entry.action)).toEqual([
      "report.download.authorized",
      "report.downloaded",
    ]);
  }, 60_000);
});
