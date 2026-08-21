import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../lib/db/schema";
import { managedPostgresMigrationMarker } from "../../lib/db/managed-readiness";
import { seedClaireMarcDemo } from "../../lib/db/seed-demo";
import { v21PilotSeedPlan } from "../../lib/db/seed-v2-1";
import { issueDownloadGrant } from "../../lib/documents/access-grant";
import { buildDocumentVersionBlobKey } from "../../lib/documents/blob";
import { createPrivateDocumentService } from "../../lib/documents/document-service";
import { createInMemoryPrivateDocumentStorage } from "../../lib/documents/private-storage";
import { createInternalTenantContext } from "../../lib/tenancy/tenant-context";

const tenantA = v21PilotSeedPlan.tenant.id;
const identityA = v21PilotSeedPlan.identities[1].id;
const dossierA = v21PilotSeedPlan.case.id;
const householdA = v21PilotSeedPlan.household.id;
const versionedDocument = "77777777-7777-4777-8777-777777777771";
const quarantinedDocument = "77777777-7777-4777-8777-777777777772";
const softDeletedDocument = "77777777-7777-4777-8777-777777777773";
const clientDocument = "77777777-7777-4777-8777-777777777774";
const runA = "99999999-9999-4999-8999-999999999991";
const evidenceId = "pf05-official-source";
const ruleId = "pf05-global-rule-v1";

const tenantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const cabinetB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const identityB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const clientB = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const householdB = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const dossierB = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const documentB = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1";
const runB = "99999999-9999-4999-8999-999999999992";

const clientIdentity = "13131313-1313-4131-8131-131313131313";
const ungrantedDossier = "14141414-1414-4141-8141-141414141414";
const ungrantedDocument = "14141414-1414-4141-8141-141414141415";

const signingSecret = "pf05-postgres-download-secret-0123456789";
const testDatabaseName = "pf05_private_documents";

const contextA = createInternalTenantContext({
  tenantId: tenantA,
  identityId: identityA,
  role: "conseiller",
  source: "internal-test",
  correlationId: "pf05-correlation-a",
});
const contextB = createInternalTenantContext({
  tenantId: tenantB,
  identityId: identityB,
  role: "conseiller",
  source: "internal-test",
  correlationId: "pf05-correlation-b",
});
const contextClient = createInternalTenantContext({
  tenantId: tenantA,
  identityId: clientIdentity,
  role: "client",
  source: "internal-test",
  correlationId: "pf05-correlation-client",
});

type SqlClient = ReturnType<typeof postgres>;
let admin: SqlClient;
let application: SqlClient;
let applicationDb: ReturnType<typeof drizzle<typeof schema>>;
let storage: ReturnType<typeof createInMemoryPrivateDocumentStorage>;
const clock = new Date("2026-08-20T09:00:00.000Z");

function service(now: () => Date = () => clock) {
  return createPrivateDocumentService({
    database: applicationDb,
    storage,
    downloadSigningSecret: signingSecret,
    now,
  });
}

function pdf(payload: string) {
  return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, ...Buffer.from(payload, "utf8")]);
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
  url.username = "pf05_test_app";
  url.password = "pf05-test-password";
  return url.toString();
}

function testDatabaseUrl(rootUrl: string) {
  const url = new URL(rootUrl);
  url.pathname = `/${testDatabaseName}`;
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
    values (${identityB}, 'internal-test', 'pf05-cabinet-b', 'b@example.test', 'Conseiller B')
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
    values
      (${householdB}, ${tenantB}, ${clientB}, 'Foyer B', 'test',
       ${JSON.stringify(["Personne B"])}::jsonb, 'France', 'test',
       ${JSON.stringify(["isolation"])}::jsonb)
  `;
  await admin`
    insert into client_cases
      (id, tenant_id, client_id, household_id, reference, title, status, fiscal_year)
    values (${dossierB}, ${tenantB}, ${clientB}, ${householdB}, 'DOS-B', 'Dossier B', 'draft', 2026)
  `;
  await admin`
    insert into documents
      (id, tenant_id, client_id, case_id, kind, label, status, storage_provider, required)
    values (${documentB}, ${tenantB}, ${clientB}, ${dossierB}, 'tax_notice',
      'Justificatif B', 'received', 'test-private', true)
  `;
}

async function seedClientGrantFixture() {
  await admin`
    insert into user_identities (id, provider, provider_subject, email_normalized, display_name)
    values (${clientIdentity}, 'clerk', 'pf05-client', 'client@example.test', 'Client A')
  `;
  await admin`
    insert into memberships (tenant_id, user_identity_id, role, status, activated_at)
    values (${tenantA}, ${clientIdentity}, 'client', 'active', now())
  `;
  await admin`
    insert into client_cases
      (id, tenant_id, client_id, household_id, reference, title, status, fiscal_year)
    values (${ungrantedDossier}, ${tenantA}, ${v21PilotSeedPlan.client.id}, ${householdA},
      'CLIENT-DENIED', 'Dossier non partagé', 'draft', 2026)
  `;
  await admin`
    insert into documents
      (id, tenant_id, client_id, case_id, kind, label, status, storage_provider, required)
    values (${ungrantedDocument}, ${tenantA}, ${v21PilotSeedPlan.client.id}, ${ungrantedDossier},
      'tax_notice', 'Justificatif non partagé', 'missing', 'test-private', true)
  `;
  await admin`
    insert into case_access_grants (tenant_id, case_id, user_identity_id, status)
    values (${tenantA}, ${dossierA}, ${clientIdentity}, 'active')
  `;
}

async function seedSimulationRuns() {
  await admin`
    insert into evidence_sources
      (id, title, authority, url, checked_at, legal_scope, reliability, status)
    values (${evidenceId}, 'Source officielle de test', 'LEGIFRANCE',
      'https://www.legifrance.gouv.fr/', now(), 'test', 'official', 'verified')
  `;
  await admin`
    insert into rule_versions
      (id, rule_set, version, title, effective_from, status, evidence_source_ids,
       source_reference, rule_payload, checksum_sha256)
    values (${ruleId}, 'pf05-test', '1', 'Règle de test', '2026-01-01', 'active',
      ${JSON.stringify([evidenceId])}::jsonb, 'LEGIFRANCE test',
      ${JSON.stringify({ testOnly: true })}::jsonb, ${"3".repeat(64)})
  `;

  for (const run of [
    { id: runA, tenantId: tenantA, caseId: dossierA, householdId: householdA },
    { id: runB, tenantId: tenantB, caseId: dossierB, householdId: householdB },
  ]) {
    await admin`
      insert into simulation_runs
        (id, tenant_id, case_id, household_id, engine_key, engine_version, scenario,
         status, idempotency_key, input_snapshot, output, completed_at)
      values (${run.id}, ${run.tenantId}, ${run.caseId}, ${run.householdId}, 'pf05-test', '1',
        'evidence', 'completed', ${`pf05-${run.id}`},
        ${JSON.stringify({ synthetic: true })}::jsonb,
        ${JSON.stringify({ result: "synthetic" })}::jsonb, now())
    `;
  }
}

/** Uploads a version and records the validation outcome that releases it. */
async function uploadAndRelease(documentId: string, payload: string) {
  const version = await service().uploadNewVersion(contextA, {
    documentId,
    fileName: `${payload}.pdf`,
    declaredMimeType: "application/pdf",
    bytes: pdf(payload),
  });
  await service().recordScanOutcome(contextA, {
    documentId,
    versionId: version.versionId,
    outcome: "clean",
  });
  return version;
}

beforeAll(async () => {
  const rootUrl = process.env.PF03_TEST_DATABASE_URL;
  if (!rootUrl) {
    throw new Error("PF03_TEST_DATABASE_URL_REQUIRED");
  }

  const root = postgres(rootUrl, { max: 1, prepare: false, onnotice: () => {} });
  await root.unsafe(`CREATE DATABASE ${testDatabaseName}`);
  await root.end();

  const databaseUrl = testDatabaseUrl(rootUrl);
  admin = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });
  await applyMigrations(admin);
  await admin.unsafe(`
    CREATE ROLE pf05_test_app
      LOGIN PASSWORD 'pf05-test-password'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    GRANT patrimoine_app TO pf05_test_app;
  `);

  await seedClaireMarcDemo(drizzle(admin, { schema }));
  await seedSecondTenant();
  await seedClientGrantFixture();
  await seedSimulationRuns();

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

describe("PF-05 private versioned document storage", () => {
  it("forces RLS on the new document tables and keeps every object private", async () => {
    const rows = await admin<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }[]>`
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      where relname in ('document_versions', 'simulation_document_versions')
      order by relname
    `;
    const [readiness] = await admin<{ readiness: { migration: string; rlsReady: boolean } }[]>`
      select app_security.managed_postgres_readiness() as readiness
    `;

    expect(rows).toEqual([
      { relname: "document_versions", relrowsecurity: true, relforcerowsecurity: true },
      { relname: "simulation_document_versions", relrowsecurity: true, relforcerowsecurity: true },
    ]);
    // The attestation always names the newest applied migration.
    expect(readiness.readiness).toEqual({
      migration: managedPostgresMigrationMarker,
      rlsReady: true,
    });
  });

  it("stores an authorized upload privately, hashes it and audits the version", async () => {
    const bytes = pdf("avis-imposition-2026");
    const version = await service().uploadNewVersion(contextA, {
      documentId: versionedDocument,
      fileName: "Avis d'imposition 2026.pdf",
      declaredMimeType: "application/pdf",
      bytes,
    });

    expect(version).toMatchObject({
      documentId: versionedDocument,
      versionNumber: 1,
      mimeType: "application/pdf",
      byteSize: bytes.byteLength,
      status: "available",
      scanStatus: "pending",
      originalFileName: "Avis d'imposition 2026.pdf",
    });

    const [row] = await admin<{ blob_key: string; visibility: string; storage_status: string }[]>`
      select version.blob_key, version.visibility, document.storage_status
      from document_versions as version
      join documents as document on document.id = version.document_id
      where version.id = ${version.versionId}
    `;

    expect(row.visibility).toBe("private");
    expect(row.storage_status).toBe("available");
    expect(row.blob_key).toBe(buildDocumentVersionBlobKey({
      tenantId: tenantA,
      caseId: dossierA,
      documentId: versionedDocument,
      versionId: version.versionId,
    }));
    expect(row.blob_key).not.toMatch(/avis|imposition|\.pdf/i);
    expect(storage.keys()).toContain(row.blob_key);

    const [audit] = await admin<{ metadata: Record<string, unknown>; entity_id: string }[]>`
      select entity_id, metadata from audit_logs
      where action = 'document.version.created' and entity_id = ${version.versionId}
    `;
    expect(audit.metadata).toMatchObject({
      versionNumber: 1,
      sha256: version.sha256,
      visibility: "private",
    });
    expect(JSON.stringify(audit.metadata)).not.toMatch(/avis|imposition|token|secret/i);
  });

  it("keeps a document undownloadable until its version is explicitly released", async () => {
    await expect(service().authorizeDownload(contextA, { documentId: versionedDocument }))
      .rejects.toThrow("DOCUMENT_VERSION_AWAITING_VALIDATION");

    const [version] = await service().listVersions(contextA, versionedDocument);
    await service().recordScanOutcome(contextA, {
      documentId: versionedDocument,
      versionId: version.versionId,
      outcome: "clean",
    });

    const authorization = await service().authorizeDownload(contextA, {
      documentId: versionedDocument,
    });
    expect(authorization.versionNumber).toBe(1);
    expect(new Date(authorization.expiresAt).getTime()).toBeGreaterThan(clock.getTime());

    const payload = await service().openDownload(contextA, authorization.token);
    expect(payload.sha256).toBe(version.sha256);
    expect((await readStream(payload.stream)).toString("utf8")).toContain("avis-imposition-2026");
  });

  it("creates version n+1 without destroying or rewriting version n", async () => {
    const replacement = await service().uploadNewVersion(contextA, {
      documentId: versionedDocument,
      fileName: "Avis d'imposition 2026 rectificatif.pdf",
      declaredMimeType: "application/pdf",
      bytes: pdf("avis-rectificatif-2026"),
    });
    expect(replacement.versionNumber).toBe(2);

    const versions = await service().listVersions(contextA, versionedDocument);
    expect(versions.map((version) => version.versionNumber)).toEqual([1, 2]);
    expect(new Set(versions.map((version) => version.sha256)).size).toBe(2);

    const first = versions[0];
    const stillDownloadable = await service().authorizeDownload(contextA, {
      documentId: versionedDocument,
      versionNumber: 1,
    });
    const payload = await service().openDownload(contextA, stillDownloadable.token);
    expect(payload.versionNumber).toBe(1);
    expect(payload.sha256).toBe(first.sha256);

    await expect(admin`
      update document_versions set sha256 = ${"9".repeat(64)} where id = ${first.versionId}
    `).rejects.toThrow("document version content is immutable");
    await expect(admin`
      delete from document_versions where id = ${first.versionId}
    `).rejects.toThrow("document version rows are append-only");

    await service().recordScanOutcome(contextA, {
      documentId: versionedDocument,
      versionId: replacement.versionId,
      outcome: "clean",
    });
  });

  it("denies every cross-tenant document, version and object access", async () => {
    const released = await service().listVersions(contextA, versionedDocument);

    // RLS filters silently rather than disclosing that the document exists.
    await expect(service().listVersions(contextB, versionedDocument)).resolves.toEqual([]);
    await expect(service().authorizeDownload(contextB, { documentId: versionedDocument }))
      .rejects.toThrow("DOCUMENT_NOT_FOUND");
    await expect(service().uploadNewVersion(contextB, {
      documentId: versionedDocument,
      fileName: "intrusion.pdf",
      declaredMimeType: "application/pdf",
      bytes: pdf("intrusion"),
    })).rejects.toThrow("DOCUMENT_NOT_FOUND");

    const crossTenantRows = await application.begin(async (transaction) => {
      await transaction.unsafe("set local role patrimoine_app");
      await transaction`select set_config('app.tenant_id', ${tenantB}, true)`;
      await transaction`select set_config('app.user_id', ${identityB}, true)`;
      await transaction`select set_config('app.role', 'conseiller', true)`;
      return transaction`select id from document_versions where tenant_id = ${tenantA}`;
    });
    expect(crossTenantRows).toHaveLength(0);

    // Direct object-key guessing: a forged but correctly signed grant carrying
    // another cabinet's identifiers still resolves nothing under RLS.
    const forged = issueDownloadGrant(signingSecret, {
      tenantId: tenantB,
      resource: "document",
      resourceId: versionedDocument,
      versionId: released[0].versionId,
      identityId: identityB,
      expiresAtMs: clock.getTime() + 60_000,
    });
    await expect(service().openDownload(contextB, forged)).rejects.toThrow("DOCUMENT_NOT_FOUND");
  });

  it("refuses an expired, tampered or foreign-subject download grant", async () => {
    const authorization = await service().authorizeDownload(contextA, {
      documentId: versionedDocument,
    });

    const expiredClock = new Date(clock.getTime() + 10 * 60 * 1000);
    await expect(service(() => expiredClock).openDownload(contextA, authorization.token))
      .rejects.toThrow("DOCUMENT_DOWNLOAD_GRANT_EXPIRED");
    await expect(service().openDownload(contextA, `${authorization.token}x`))
      .rejects.toThrow("DOCUMENT_DOWNLOAD_GRANT_INVALID_SIGNATURE");
    await expect(service().openDownload(contextClient, authorization.token))
      .rejects.toThrow("DOCUMENT_DOWNLOAD_GRANT_SUBJECT_MISMATCH");
  });

  it("denies a quarantined version and a soft-deleted document", async () => {
    const quarantined = await uploadAndRelease(quarantinedDocument, "justificatif-suspect");
    await service().recordScanOutcome(contextA, {
      documentId: quarantinedDocument,
      versionId: quarantined.versionId,
      outcome: "infected",
      reason: "scan_outcome_infected",
    });
    await expect(service().authorizeDownload(contextA, { documentId: quarantinedDocument }))
      .rejects.toThrow("DOCUMENT_QUARANTINED");

    const deleted = await uploadAndRelease(softDeletedDocument, "contrat-pret");
    const beforeDeletion = await service().authorizeDownload(contextA, {
      documentId: softDeletedDocument,
    });
    expect(beforeDeletion.versionNumber).toBe(1);

    await expect(service().softDeleteDocument(contextA, softDeletedDocument)).resolves.toBe(true);
    await expect(service().authorizeDownload(contextA, { documentId: softDeletedDocument }))
      .rejects.toThrow("DOCUMENT_DELETED");
    await expect(service().openDownload(contextA, beforeDeletion.token))
      .rejects.toThrow("DOCUMENT_DELETED");

    const [preserved] = await admin<{ sha256: string; status: string }[]>`
      select sha256, status from document_versions where id = ${deleted.versionId}
    `;
    expect(preserved).toEqual({ sha256: deleted.sha256, status: "available" });
  });

  it("limits a client to granted dossiers and refuses self-validation", async () => {
    const uploaded = await service().uploadNewVersion(contextClient, {
      documentId: clientDocument,
      fileName: "Justificatif client.pdf",
      declaredMimeType: "application/pdf",
      bytes: pdf("justificatif-client"),
    });
    expect(uploaded.versionNumber).toBe(1);

    await expect(service().recordScanOutcome(contextClient, {
      documentId: clientDocument,
      versionId: uploaded.versionId,
      outcome: "clean",
    })).rejects.toThrow("TENANT_AUTHORIZATION_DENIED");

    await expect(service().uploadNewVersion(contextClient, {
      documentId: ungrantedDocument,
      fileName: "hors-perimetre.pdf",
      declaredMimeType: "application/pdf",
      bytes: pdf("hors-perimetre"),
    })).rejects.toThrow("DOCUMENT_NOT_FOUND");
    await expect(service().listVersions(contextClient, ungrantedDocument)).resolves.toEqual([]);
    await expect(service().listVersions(contextClient, documentB)).resolves.toEqual([]);

    const selfValidation = await application.begin(async (transaction) => {
      await transaction.unsafe("set local role patrimoine_app");
      await transaction`select set_config('app.tenant_id', ${tenantA}, true)`;
      await transaction`select set_config('app.user_id', ${clientIdentity}, true)`;
      await transaction`select set_config('app.role', 'client', true)`;
      await transaction`
        update document_versions set scan_status = 'clean'
        where id = ${uploaded.versionId}
      `;
      return "updated";
    }).catch((error: Error) => error.message);
    expect(selfValidation).toContain("client role may not record a document scan outcome");
  });

  it("links one precise version and its hash to a simulation trace", async () => {
    const [version] = await service().listVersions(contextA, versionedDocument);

    await expect(service().linkVersionToSimulation(contextA, {
      simulationRunId: runA,
      documentVersionId: version.versionId,
      purpose: "supporting-evidence",
    })).resolves.toBe(true);

    await expect(service().listSimulationEvidence(contextA, runA)).resolves.toEqual([
      expect.objectContaining({
        documentId: versionedDocument,
        versionId: version.versionId,
        versionNumber: 1,
        sha256: version.sha256,
        purpose: "supporting-evidence",
      }),
    ]);

    await expect(service().linkVersionToSimulation(contextB, {
      simulationRunId: runB,
      documentVersionId: version.versionId,
    })).rejects.toThrow("DOCUMENT_VERSION_NOT_FOUND");
    await expect(service().listSimulationEvidence(contextB, runB)).resolves.toEqual([]);
  });

  it("denies every document operation once the membership is revoked", async () => {
    await admin`
      update memberships set status = 'disabled', revoked_at = now()
      where tenant_id = ${tenantA} and user_identity_id = ${clientIdentity}
    `;

    await expect(service().listVersions(contextClient, clientDocument))
      .rejects.toThrow("TENANT_MEMBERSHIP_REQUIRED");
    await expect(service().uploadNewVersion(contextClient, {
      documentId: clientDocument,
      fileName: "apres-revocation.pdf",
      declaredMimeType: "application/pdf",
      bytes: pdf("apres-revocation"),
    })).rejects.toThrow("TENANT_MEMBERSHIP_REQUIRED");
  });
});
