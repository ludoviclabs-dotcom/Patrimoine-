import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../lib/db/schema";
import { seedClaireMarcDemo } from "../../lib/db/seed-demo";
import { v21PilotSeedPlan } from "../../lib/db/seed-v2-1";
import { createInMemoryPrivateDocumentStorage } from "../../lib/documents/private-storage";
import { createServerReportService } from "../../lib/report/report-service";
import { createProfessionalReviewService } from "../../lib/review/review-service";
import { createInternalTenantContext } from "../../lib/tenancy/tenant-context";

/**
 * PF-07B — signing a professional review.
 *
 * PF-06 made an unsigned review a blocking flag but exposed no way to sign one:
 * its own suite signed the review with raw SQL and the E2E fixture pre-seeded
 * it as approved. These cases exercise the real server action against real
 * PostgreSQL with FORCE RLS, so the gate that opens `report.validate` is opened
 * the way the product opens it.
 */

const tenantA = v21PilotSeedPlan.tenant.id;
const conseillerIdentity = v21PilotSeedPlan.identities[1].id;
const expertIdentity = v21PilotSeedPlan.identities[2].id;
const clientIdentity = v21PilotSeedPlan.identities[3].id;
const adminIdentity = v21PilotSeedPlan.identities[0].id;
const dossierA = v21PilotSeedPlan.case.id;
const householdA = v21PilotSeedPlan.household.id;
const runA = "99999999-9999-4999-8999-99999999b001";
const evidenceId = "pf07b-official-source";
const ruleId = "pf07b-ifi-rule-v1";

const tenantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaab001";
const cabinetB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaab002";
const identityB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002";
const clientB = "cccccccc-cccc-4ccc-8ccc-ccccccccc001";
const householdB = "cccccccc-cccc-4ccc-8ccc-ccccccccc002";
const dossierB = "dddddddd-dddd-4ddd-8ddd-ddddddddd001";

const signingSecret = "pf07b-review-download-secret-0123456789";
const testDatabaseName = "pf07b_professional_review";
const legalFreezeDate = "2026-08-18";

function context(
  identityId: string,
  role: "admin" | "conseiller" | "expert" | "client",
  tenantId: string = tenantA,
) {
  return createInternalTenantContext({
    tenantId,
    identityId,
    role,
    source: "internal-test",
    correlationId: `pf07b-${role}`,
  });
}

const contextExpert = context(expertIdentity, "expert");
const contextConseiller = context(conseillerIdentity, "conseiller");
const contextClient = context(clientIdentity, "client");
const contextAdmin = context(adminIdentity, "admin");
const contextExpertB = context(identityB, "expert", tenantB);

type SqlClient = ReturnType<typeof postgres>;
let admin: SqlClient;
let application: SqlClient;
let applicationDb: ReturnType<typeof drizzle<typeof schema>>;
let storage: ReturnType<typeof createInMemoryPrivateDocumentStorage>;
let clock = new Date("2026-08-21T09:00:00.000Z");

function reviews() {
  return createProfessionalReviewService({ database: applicationDb, now: () => clock });
}

function reports() {
  return createServerReportService({
    database: applicationDb,
    storage,
    downloadSigningSecret: signingSecret,
    now: () => clock,
  });
}

function tick(minutes: number) {
  clock = new Date(clock.getTime() + minutes * 60_000);
  return clock;
}

async function applyMigrations(client: SqlClient) {
  const directory = join(process.cwd(), "drizzle");
  for (const migration of readdirSync(directory).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    await client.unsafe(readFileSync(join(directory, migration), "utf8"));
  }
}

async function seedRun() {
  await admin`
    insert into evidence_sources (id, title, authority, url, checked_at, legal_scope, reliability, status)
    values (${evidenceId}, 'CGI — IFI', 'LEGIFRANCE', 'https://www.legifrance.gouv.fr/',
      '2026-08-18T00:00:00Z', 'ifi', 'official', 'verified')
  `;
  await admin`
    insert into rule_versions (id, rule_set, version, title, effective_from, status,
      evidence_source_ids, source_reference, rule_payload, checksum_sha256)
    values (${ruleId}, 'pf07b-ifi', 'IFI-2026.08-V3', 'IFI 2026', '2026-01-01', 'active',
      ${JSON.stringify([evidenceId])}::jsonb, 'CGI art. 964 et suivants',
      ${JSON.stringify({ testOnly: true })}::jsonb, ${"c".repeat(64)})
  `;
  await admin`
    insert into simulation_runs (id, tenant_id, case_id, household_id, engine_key, engine_version,
      scenario, status, idempotency_key, input_snapshot, output, coverage_limit_ids,
      professional_validation_required, completed_at)
    values (${runA}, ${tenantA}, ${dossierA}, ${householdA}, 'ifi', '3', 'reference', 'completed',
      'pf07b-run-a', ${JSON.stringify({ netWealth: 1110000 })}::jsonb,
      ${JSON.stringify({ taxDue: 1445 })}::jsonb, ${JSON.stringify([])}::jsonb,
      true, '2026-08-18T09:00:00Z')
  `;
  await admin`
    insert into calculation_steps (tenant_id, simulation_run_id, step_order, label, input_value,
      formula, output_value, rule_version_id, evidence_source_id, confidence_status,
      coverage_limit_ids, display_status)
    values (${tenantA}, ${runA}, 1, 'Base imposable IFI', '2400000',
      'actifs taxables - dettes admises', '1110000', ${ruleId}, ${evidenceId},
      'validated', ${JSON.stringify([])}::jsonb, 'validated_calculation')
  `;
  await admin`
    insert into simulation_rule_versions (tenant_id, simulation_run_id, rule_version_id, purpose)
    values (${tenantA}, ${runA}, ${ruleId}, 'calculation-step')
  `;
}

async function seedSecondTenant() {
  await admin`insert into tenants (id, name, slug, status, data_region)
              values (${tenantB}, 'CABINET_B', 'cabinet-b-pf07b', 'pilot', 'eu')`;
  await admin`insert into cabinets (id, tenant_id, legal_name, professional_type)
              values (${cabinetB}, ${tenantB}, 'CABINET_B', 'cabinet_test')`;
  await admin`insert into user_identities (id, provider, provider_subject, email_normalized, display_name)
              values (${identityB}, 'internal-test', 'pf07b-b', 'b@example.test', 'Expert B')`;
  await admin`insert into memberships (tenant_id, user_identity_id, role, status, activated_at)
              values (${tenantB}, ${identityB}, 'expert', 'active', now())`;
  await admin`insert into users (id, tenant_id, name, email, role, status)
              values (${userB}, ${tenantB}, 'Expert B', 'b@example.test', 'expert', 'active')`;
  await admin`insert into clients (id, tenant_id, owner_user_id, external_reference, name, risk_level)
              values (${clientB}, ${tenantB}, ${userB}, 'CLIENT-B-PF07B', 'Client B', 'standard')`;
  await admin`insert into households (id, tenant_id, client_id, name, profile, members, children,
                fiscal_residence, professional_context, objectives)
              values (${householdB}, ${tenantB}, ${clientB}, 'Foyer B', 'Synthetique',
                ${JSON.stringify([])}::jsonb, 0, 'France', 'Synthetique', ${JSON.stringify([])}::jsonb)`;
  await admin`insert into client_cases (id, tenant_id, client_id, household_id, reference, title,
                status, fiscal_year)
              values (${dossierB}, ${tenantB}, ${clientB}, ${householdB}, 'DOS-B-PF07B',
                'Dossier B', 'draft', 2026)`;
}

beforeAll(async () => {
  const rootUrl = process.env.PF03_TEST_DATABASE_URL;
  if (!rootUrl) throw new Error("PF03_TEST_DATABASE_URL_REQUIRED");

  const root = postgres(rootUrl, { max: 1, prepare: false, onnotice: () => {} });
  await root.unsafe(`CREATE DATABASE ${testDatabaseName}`);
  await root.end();

  const url = new URL(rootUrl);
  url.pathname = `/${testDatabaseName}`;
  admin = postgres(url.toString(), { max: 1, prepare: false, onnotice: () => {} });
  await applyMigrations(admin);
  await admin.unsafe(`
    CREATE ROLE pf07b_test_app LOGIN PASSWORD 'pf07b-test-password'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    GRANT patrimoine_app TO pf07b_test_app;
  `);

  await seedClaireMarcDemo(drizzle(admin, { schema }));
  await seedRun();
  await seedSecondTenant();

  const applicationUrl = new URL(url.toString());
  applicationUrl.username = "pf07b_test_app";
  applicationUrl.password = "pf07b-test-password";
  application = postgres(applicationUrl.toString(), { max: 1, prepare: false, onnotice: () => {} });
  applicationDb = drizzle(application, { schema });
  storage = createInMemoryPrivateDocumentStorage();
}, 180_000);

afterAll(async () => {
  await application?.end();
  await admin?.end();
});

describe("PF-07B — professional review signature", () => {
  it("refuses an empty comment before writing anything", async () => {
    await expect(reviews().sign(contextExpert, {
      caseId: dossierA, decision: "approved", comment: "   ",
    })).rejects.toThrow("PROFESSIONAL_REVIEW_COMMENT_REQUIRED");

    const [{ total }] = await admin<{ total: number }[]>`
      select count(*)::int as total from professional_reviews where tenant_id = ${tenantA}
    `;
    expect(total).toBe(0);
  });

  it("blocks report readiness while no review is signed", async () => {
    const readiness = await reports().previewReadiness(contextConseiller, {
      caseId: dossierA, simulationRunIds: [runA], legalFreezeDate,
    });

    expect(readiness.professionalReviewSigned).toBe(false);
    expect(readiness.blockingFlags.map((flag) => flag.code))
      .toContain("review.professional_not_signed");
    expect(readiness.canValidateFinal).toBe(false);
  });

  it("refuses a conseiller: simulation.review is not in that role", async () => {
    await expect(reviews().sign(contextConseiller, {
      caseId: dossierA, decision: "approved", comment: "Tentative conseiller.",
    })).rejects.toThrow("TENANT_AUTHORIZATION_DENIED");
  });

  it("refuses a client and audits the denial", async () => {
    await expect(reviews().sign(contextClient, {
      caseId: dossierA, decision: "approved", comment: "Tentative client.",
    })).rejects.toThrow("TENANT_AUTHORIZATION_DENIED");

    const [{ total }] = await admin<{ total: number }[]>`
      select count(*)::int as total from audit_logs
      where tenant_id = ${tenantA} and action = 'authorization.denied'
        and actor_identity_id = ${clientIdentity}
    `;
    expect(total).toBeGreaterThan(0);
  });

  it("records a changes_requested decision without opening the gate", async () => {
    const review = await reviews().sign(contextExpert, {
      caseId: dossierA,
      decision: "changes_requested",
      comment: "Compléter les justificatifs de dettes.",
      requiredActions: ["Fournir le tableau d'amortissement"],
    });

    expect(review.decision).toBe("changes_requested");
    expect(review.reviewerIdentityId).toBe(expertIdentity);
    expect(review.signedByRole).toBe("expert");
    expect(review.reviewedAt).not.toBeNull();
    expect(review.requiredActions).toEqual(["Fournir le tableau d'amortissement"]);

    const readiness = await reports().previewReadiness(contextConseiller, {
      caseId: dossierA, simulationRunIds: [runA], legalFreezeDate,
    });
    expect(readiness.professionalReviewSigned).toBe(false);
    expect(readiness.blockingFlags.map((flag) => flag.code))
      .toContain("review.professional_not_signed");
  });

  it("opens the readiness gate once an expert approves", async () => {
    tick(10);
    const review = await reviews().sign(contextExpert, {
      caseId: dossierA, decision: "approved", comment: "Conclusions vérifiées.",
    });

    expect(review.decision).toBe("approved");

    const readiness = await reports().previewReadiness(contextConseiller, {
      caseId: dossierA, simulationRunIds: [runA], legalFreezeDate,
    });
    expect(readiness.professionalReviewSigned).toBe(true);
    expect(readiness.blockingFlags.map((flag) => flag.code))
      .not.toContain("review.professional_not_signed");
  });

  it("appends rather than rewrites: the decision history is preserved", async () => {
    const history = await reviews().list(contextExpert, dossierA);

    expect(history.length).toBe(2);
    // Newest first — the order PF-06 relies on to read the current decision.
    expect(history[0].decision).toBe("approved");
    expect(history[1].decision).toBe("changes_requested");
  });

  it("writes an audited review.decided event carrying the decision, not the comment", async () => {
    const rows = await admin<{ action: string; metadata: Record<string, unknown> }[]>`
      select action, metadata from audit_logs
      where tenant_id = ${tenantA} and action = 'review.decided'
      order by created_at asc
    `;

    expect(rows.length).toBe(2);
    expect(rows.map((row) => row.metadata.decision)).toEqual(["changes_requested", "approved"]);
    expect(rows.every((row) => row.metadata.role === "expert")).toBe(true);
    // The motivation lives on the review row; it is not duplicated into audit.
    expect(JSON.stringify(rows)).not.toContain("Conclusions vérifiées");
  });

  it("lets an admin sign too, and records the signing role", async () => {
    tick(10);
    const review = await reviews().sign(contextAdmin, {
      caseId: dossierA, decision: "approved", comment: "Contre-signature administrateur.",
    });

    expect(review.signedByRole).toBe("admin");
    expect(review.reviewerIdentityId).toBe(adminIdentity);
  });

  it("never lets a review carry an anonymous reviewer", async () => {
    await expect(admin`
      insert into professional_reviews (tenant_id, case_id, decision, summary, required_actions, reviewed_at)
      values (${tenantA}, ${dossierA}, 'approved', 'Sans signataire.', ${JSON.stringify([])}::jsonb, now())
    `).rejects.toThrow(/professional_reviews_reviewer_present_check/);
  });

  it("never lets a decided review omit its timestamp", async () => {
    await expect(admin`
      insert into professional_reviews (tenant_id, case_id, reviewer_identity_id, decision, summary, required_actions)
      values (${tenantA}, ${dossierA}, ${expertIdentity}, 'approved', 'Sans date.', ${JSON.stringify([])}::jsonb)
    `).rejects.toThrow(/professional_reviews_decided_at_check/);
  });
});

describe("PF-07B — tenant isolation and revocation", () => {
  it("refuses cabinet B signing a review on a cabinet A dossier", async () => {
    await expect(reviews().sign(contextExpertB, {
      caseId: dossierA, decision: "approved", comment: "Tentative cross-tenant.",
    })).rejects.toThrow("DOSSIER_NOT_FOUND");

    const [{ total }] = await admin<{ total: number }[]>`
      select count(*)::int as total from professional_reviews
      where tenant_id = ${tenantB} or reviewer_identity_id = ${identityB}
    `;
    expect(total).toBe(0);
  });

  it("hides cabinet A review history from cabinet B", async () => {
    const history = await reviews().list(contextExpertB, dossierA);
    // RLS filters the rows; the listing is empty rather than disclosing them.
    expect(history).toEqual([]);
  });

  it("refuses a revoked member even though the context still exists", async () => {
    await admin`
      update memberships set status = 'disabled', revoked_at = now()
      where tenant_id = ${tenantA} and user_identity_id = ${expertIdentity}
    `;

    try {
      await expect(reviews().sign(contextExpert, {
        caseId: dossierA, decision: "approved", comment: "Après révocation.",
      })).rejects.toThrow("TENANT_MEMBERSHIP_REQUIRED");
    } finally {
      await admin`
        update memberships set status = 'active', revoked_at = null
        where tenant_id = ${tenantA} and user_identity_id = ${expertIdentity}
      `;
    }
  });
});

describe("PF-07B — a signature never rewrites a delivered report", () => {
  it("turns an existing draft stale while preserving its bytes and hashes", async () => {
    tick(10);
    const draft = await reports().generateDraft(contextConseiller, {
      caseId: dossierA, simulationRunIds: [runA], legalFreezeDate,
    });

    const [before] = await admin<{ pdfSha256: string; snapshotSha256: string }[]>`
      select pdf_sha256 as "pdfSha256", snapshot_sha256 as "snapshotSha256"
      from report_versions where id = ${draft.reportVersionId}
    `;

    tick(10);
    await reviews().sign(contextExpert, {
      caseId: dossierA,
      decision: "changes_requested",
      comment: "Nouvelle demande de correction après génération.",
    });

    const freshness = await reports().evaluateFreshness(contextConseiller, draft.reportVersionId);
    expect(freshness.status).toBe("outdated");
    expect(freshness.changedSections.length).toBeGreaterThan(0);

    const [after] = await admin<{ pdfSha256: string; snapshotSha256: string }[]>`
      select pdf_sha256 as "pdfSha256", snapshot_sha256 as "snapshotSha256"
      from report_versions where id = ${draft.reportVersionId}
    `;
    // The delivered document is immutable: staleness is reported, never patched.
    expect(after).toEqual(before);
  });

  it("refuses approval of a report whose review now requests changes", async () => {
    const versions = await reports().listVersions(contextConseiller, dossierA);
    const current = versions[0];

    await expect(reports().validateVersion(contextExpert, {
      reportVersionId: current.reportVersionId,
      decision: "approved",
      comment: "Tentative malgré les corrections demandées.",
    })).rejects.toThrow();
  });
});
