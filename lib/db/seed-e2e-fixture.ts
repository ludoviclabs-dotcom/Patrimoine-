import { sql } from "drizzle-orm";
import {
  e2eClerkFixturePlan,
  e2eFixtureTenant,
  type E2EIdentityEnvironment,
} from "../auth/e2e-fixture-plan";
import type { getDatabase } from "./client";
import {
  cabinets,
  caseAccessGrants,
  clientCases,
  clients,
  households,
  memberships,
  tenants,
  userIdentities,
  users,
} from "./schema";
import { seedClaireMarcDemo } from "./seed-demo";
import { v21PilotSeedPlan } from "./seed-v2-1";

type Database = ReturnType<typeof getDatabase>;

/**
 * PF-07 — binds the synthetic Clerk identities to authoritative PostgreSQL
 * memberships, so an authenticated browser journey exercises the real
 * resolve_clerk_context → RLS → RBAC chain instead of a stub.
 *
 * Clerk stays an identity and organization provider only. Linking a Clerk
 * organization to an internal tenant, and maintaining the internal membership,
 * is deliberately an operator action in PF-04A: `patrimoine_fixture_service`
 * holds no grant on `case_access_grants` or the `auth_provider_*` tables, and
 * PF-07 does not widen it. Those rows are therefore written with the
 * privileged deployment connection, exactly as the PF-06C2 staging mapping was.
 *
 * The caller is the E2E harness and the target is a disposable database. This
 * never runs against a shared or production database.
 */
export async function seedE2EClerkFixture(
  database: Database,
  identities: E2EIdentityEnvironment,
) {
  if (!identities.complete) {
    throw new Error(`E2E_FIXTURE_IDENTITIES_INCOMPLETE:${identities.missing.join(",")}`);
  }

  await seedClaireMarcDemo(database);

  const cabinetA = e2eFixtureTenant("CABINET_A");
  const cabinetB = e2eFixtureTenant("CABINET_B");
  const userBId = "e2e0b000-0000-4000-8000-00000000000d";
  const clientBId = "e2e0b000-0000-4000-8000-000000000010";
  const householdBId = "e2e0b000-0000-4000-8000-000000000011";
  const dossierBId = "e2e0b000-0000-4000-8000-000000000012";

  return database.transaction(async (transaction) => {
    // A second, genuinely separate cabinet: cross-tenant denial is only
    // meaningful if the other tenant actually owns something.
    await transaction.insert(tenants).values({
      id: cabinetB.tenantId,
      slug: "cabinet-b-e2e",
      name: "CABINET_B",
      status: "pilot",
      dataRegion: "eu",
    }).onConflictDoNothing();

    await transaction.insert(cabinets).values({
      id: cabinetB.cabinetId,
      tenantId: cabinetB.tenantId,
      legalName: "CABINET_B",
      professionalType: "cabinet_demo",
    }).onConflictDoNothing();

    // clients.owner_user_id is NOT NULL and carries a composite tenant foreign
    // key, so cabinet B needs its own legacy user row before it can own one.
    await transaction.insert(users).values({
      id: userBId,
      tenantId: cabinetB.tenantId,
      name: "E2E Expert B",
      email: "pf07-expert-b+clerk_test@example.com",
      role: "expert",
      status: "active",
    }).onConflictDoNothing();

    await transaction.insert(clients).values({
      id: clientBId,
      tenantId: cabinetB.tenantId,
      ownerUserId: userBId,
      externalReference: "CLIENT-B-E2E",
      name: "Dossier cabinet B",
      riskLevel: "standard",
    }).onConflictDoNothing();

    await transaction.insert(households).values({
      id: householdBId,
      tenantId: cabinetB.tenantId,
      clientId: clientBId,
      name: "Foyer cabinet B",
      profile: "Foyer synthétique du cabinet B.",
      members: [],
      children: 0,
      fiscalResidence: "France",
      professionalContext: "Synthétique",
      objectives: [],
    }).onConflictDoNothing();

    await transaction.insert(clientCases).values({
      id: dossierBId,
      tenantId: cabinetB.tenantId,
      clientId: clientBId,
      householdId: householdBId,
      reference: "DOS-B-E2E",
      title: "Dossier cabinet B",
      status: "draft",
      fiscalYear: 2026,
    }).onConflictDoNothing();

    for (const role of e2eClerkFixturePlan.roles) {
      const tenant = e2eFixtureTenant(role.tenantKey);
      const clerkUserId = identities.users[role.key];
      const clerkOrganizationId = identities.organizations[role.tenantKey];
      if (!clerkUserId || !clerkOrganizationId) {
        throw new Error(`E2E_FIXTURE_IDENTITY_MISSING:${role.key}`);
      }

      // A Clerk member with no internal row must stay completely unknown to
      // the database: seeding an identity or an observation would already be
      // more than PF-04A grants.
      if (!role.seedInternalMembership) continue;

      await transaction.insert(userIdentities).values({
        id: role.identityId,
        provider: "clerk",
        providerSubject: clerkUserId,
        emailNormalized: role.email.toLowerCase(),
        displayName: `${role.firstName} ${role.lastName}`,
      }).onConflictDoNothing();

      // The authoritative membership. Clerk cannot create, change or revoke it.
      await transaction.insert(memberships).values({
        tenantId: tenant.tenantId,
        userIdentityId: role.identityId,
        role: role.internalRole,
        status: "active",
        activatedAt: new Date("2026-08-21T08:00:00.000Z"),
      }).onConflictDoNothing();

      await transaction.execute(sql`
        insert into auth_provider_organizations
          (provider, provider_organization_id, tenant_id, slug, display_name, observed_status, observed_at)
        values ('clerk', ${clerkOrganizationId}, ${tenant.tenantId},
                ${tenant.key.toLowerCase()}, ${tenant.key}, 'active', now())
        on conflict (provider, provider_organization_id) do update
          set tenant_id = excluded.tenant_id,
              observed_status = 'active',
              observed_at = now(),
              updated_at = now()
      `);

      await transaction.execute(sql`
        insert into auth_provider_memberships
          (provider, provider_organization_id, provider_subject, provider_role, observed_status, observed_at)
        values ('clerk', ${clerkOrganizationId}, ${clerkUserId}, ${role.clerkRole}, 'active', now())
        on conflict (provider, provider_organization_id, provider_subject) do update
          set provider_role = excluded.provider_role,
              observed_status = 'active',
              observed_at = now(),
              updated_at = now()
      `);

      // A client sees strictly nothing without an explicit dossier grant.
      if (role.requiresCaseGrant) {
        await transaction.insert(caseAccessGrants).values({
          tenantId: tenant.tenantId,
          caseId: v21PilotSeedPlan.case.id,
          userIdentityId: role.identityId,
          status: "active",
        }).onConflictDoNothing();
      }
    }

    await seedReportableDossierState(transaction, cabinetA.tenantId);

    return {
      cabinetATenantId: cabinetA.tenantId,
      cabinetBTenantId: cabinetB.tenantId,
      dossierAId: v21PilotSeedPlan.case.id,
      dossierBId,
    } as const;
  });
}

/**
 * Gives the Claire & Marc dossier the facts a report actually needs: a
 * completed simulation run, a validated calculation step pinned to an active
 * sourced rule version, one evidence document version, and a signed
 * professional review.
 *
 * The review is seeded as `approved` because PF-06 exposes no route to sign
 * one — the readiness gate is proven closed at the PostgreSQL level instead
 * (tests/postgres/pf06b-report-console.test.ts). Without this the browser
 * journey could never reach validation, and the E2E run would prove nothing
 * about the report chain.
 */
async function seedReportableDossierState(
  transaction: Parameters<Parameters<Database["transaction"]>[0]>[0],
  tenantId: string,
) {
  const dossierId = v21PilotSeedPlan.case.id;
  const householdId = v21PilotSeedPlan.household.id;
  const conseillerIdentityId = v21PilotSeedPlan.identities[1].id;
  const expertUserId = v21PilotSeedPlan.users[2].id;
  const evidenceSourceId = "pf07-e2e-official-source";
  const ruleVersionId = "pf07-e2e-ifi-rule-v1";
  const runId = "e2e1a000-0000-4000-8000-0000000000a1";
  const documentId = "77777777-7777-4777-8777-777777777771";
  const documentVersionId = "e2e1a000-0000-4000-8000-0000000000a2";
  const reviewId = "e2e1a000-0000-4000-8000-0000000000a3";

  await transaction.execute(sql`
    insert into evidence_sources
      (id, title, authority, url, checked_at, legal_scope, reliability, status)
    values (${evidenceSourceId}, 'CGI — IFI', 'LEGIFRANCE', 'https://www.legifrance.gouv.fr/',
      '2026-08-18T00:00:00Z', 'ifi', 'official', 'verified')
    on conflict (id) do nothing
  `);

  await transaction.execute(sql`
    insert into rule_versions
      (id, rule_set, version, title, effective_from, status, evidence_source_ids,
       source_reference, rule_payload, checksum_sha256)
    values (${ruleVersionId}, 'pf07-e2e-ifi', 'IFI-2026.08-V3', 'IFI 2026', '2026-01-01',
      'active', ${JSON.stringify([evidenceSourceId])}::jsonb, 'CGI art. 964 et suivants',
      ${JSON.stringify({ e2eFixture: true })}::jsonb, ${"e".repeat(64)})
    on conflict (id) do nothing
  `);

  await transaction.execute(sql`
    insert into simulation_runs
      (id, tenant_id, case_id, household_id, engine_key, engine_version, scenario,
       status, idempotency_key, input_snapshot, output, coverage_limit_ids,
       professional_validation_required, completed_at)
    values (${runId}, ${tenantId}, ${dossierId}, ${householdId}, 'ifi', '3', 'reference',
      'completed', 'pf07-e2e-run-a',
      ${JSON.stringify({ grossWealth: 2400000, netWealth: 1110000 })}::jsonb,
      ${JSON.stringify({ taxDue: 1445 })}::jsonb, ${JSON.stringify([])}::jsonb,
      true, '2026-08-18T09:00:00Z')
    on conflict (id) do nothing
  `);

  await transaction.execute(sql`
    insert into calculation_steps
      (tenant_id, simulation_run_id, step_order, label, input_value, formula,
       output_value, rule_version_id, evidence_source_id, confidence_status,
       coverage_limit_ids, display_status)
    values (${tenantId}, ${runId}, 1, 'Base imposable IFI', '2400000',
      'actifs taxables - dettes admises', '1110000', ${ruleVersionId}, ${evidenceSourceId},
      'validated', ${JSON.stringify([])}::jsonb, 'validated_calculation')
    on conflict do nothing
  `);

  await transaction.execute(sql`
    insert into simulation_rule_versions (tenant_id, simulation_run_id, rule_version_id, purpose)
    values (${tenantId}, ${runId}, ${ruleVersionId}, 'calculation-step')
    on conflict do nothing
  `);

  await transaction.execute(sql`
    insert into document_versions
      (id, tenant_id, document_id, case_id, version_number, blob_key, status, scan_status,
       original_file_name, mime_type, byte_size, sha256, uploaded_by_identity_id, available_at)
    values (${documentVersionId}, ${tenantId}, ${documentId}, ${dossierId}, 1,
      ${`tenants/${tenantId}/dossiers/${dossierId}/documents/${documentId}/versions/${documentVersionId}`},
      'available', 'clean', 'Avis imposition 2026.pdf', 'application/pdf', 4096,
      ${"f".repeat(64)}, ${conseillerIdentityId}, now())
    on conflict (id) do nothing
  `);

  await transaction.execute(sql`
    insert into simulation_document_versions
      (tenant_id, simulation_run_id, document_version_id, purpose)
    values (${tenantId}, ${runId}, ${documentVersionId}, 'supporting-evidence')
    on conflict do nothing
  `);

  await transaction.execute(sql`
    insert into professional_reviews
      (id, tenant_id, case_id, reviewer_user_id, decision, summary, required_actions)
    values (${reviewId}, ${tenantId}, ${dossierId}, ${expertUserId}, 'approved',
      'Revue professionnelle signée pour le parcours E2E.', ${JSON.stringify([])}::jsonb)
    on conflict (id) do nothing
  `);

  await transaction.execute(sql`
    update documents set storage_status = 'available', current_version_number = 1,
      blob_path = ${`tenants/${tenantId}/dossiers/${dossierId}/documents/${documentId}/versions/${documentVersionId}`}
    where id = ${documentId} and tenant_id = ${tenantId}
  `);
}
