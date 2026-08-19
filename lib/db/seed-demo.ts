import { sql } from "drizzle-orm";
import { demoHousehold } from "../demo-data/household";
import { demoDocuments } from "../demo-data/v1";
import type { getDatabase } from "./client";
import {
  assets,
  auditLogs,
  cabinets,
  clientCases,
  clients,
  documents,
  households,
  liabilities,
  memberships,
  tenants,
  userIdentities,
  users,
} from "./schema";
import { v21PilotSeedPlan } from "./seed-v2-1";

type Database = ReturnType<typeof getDatabase>;

const DEMO_SEED_CORRELATION_ID = "pf03b-demo-fixture-seed";
const legacyUserNames = [
  "Admin Démo",
  "Marie Conseil",
  "Expert fiscaliste",
  "Claire Démo",
] as const;
const assetIds = [
  "55555555-5555-4555-8555-555555555551",
  "55555555-5555-4555-8555-555555555552",
  "55555555-5555-4555-8555-555555555553",
  "55555555-5555-4555-8555-555555555554",
  "55555555-5555-4555-8555-555555555555",
  "55555555-5555-4555-8555-555555555556",
  "55555555-5555-4555-8555-555555555557",
  "55555555-5555-4555-8555-555555555558",
] as const;
const liabilityIds = ["66666666-6666-4666-8666-666666666661"] as const;
const documentIds = [
  "77777777-7777-4777-8777-777777777771",
  "77777777-7777-4777-8777-777777777772",
  "77777777-7777-4777-8777-777777777773",
  "77777777-7777-4777-8777-777777777774",
  "77777777-7777-4777-8777-777777777775",
] as const;

/**
 * Imports synthetic demo fixtures only. The caller must use the privileged,
 * deployment-only connection; this transaction immediately assumes the
 * narrowly-scoped fixture service role and a single explicit demo tenant.
 */
export function seedClaireMarcDemo(database: Database) {
  const tenantId = v21PilotSeedPlan.tenant.id;
  const conseillerIdentity = v21PilotSeedPlan.identities[1];

  return database.transaction(async (transaction) => {
    await transaction.execute(sql.raw("set local role patrimoine_fixture_service"));
    await transaction.execute(
      sql`select set_config('app.tenant_id', ${tenantId}, true)`,
    );
    await transaction.execute(
      sql`select set_config('app.service_operation', 'demo_fixture_seed', true)`,
    );

    await transaction.insert(tenants).values({
      id: tenantId,
      slug: v21PilotSeedPlan.tenant.slug,
      name: v21PilotSeedPlan.tenant.name,
      status: "pilot",
      dataRegion: "eu",
    }).onConflictDoNothing();

    await transaction.insert(cabinets).values({
      id: v21PilotSeedPlan.cabinet.id,
      tenantId,
      legalName: v21PilotSeedPlan.cabinet.legalName,
      professionalType: v21PilotSeedPlan.cabinet.professionalType,
      tradeName: "Cabinet Patrimoine Démo",
    }).onConflictDoNothing();

    await transaction.insert(userIdentities).values(
      v21PilotSeedPlan.identities.map((identity) => ({
        id: identity.id,
        provider: "internal-demo",
        providerSubject: identity.providerSubject,
        emailNormalized: identity.email,
        displayName: identity.displayName,
      })),
    ).onConflictDoNothing();

    await transaction.insert(memberships).values(
      v21PilotSeedPlan.memberships.map((membership) => ({
        tenantId,
        userIdentityId: membership.identityId,
        role: membership.role,
        status: "active" as const,
        activatedAt: new Date("2026-05-26T09:00:00.000Z"),
      })),
    ).onConflictDoNothing();

    await transaction.insert(users).values(
      v21PilotSeedPlan.users.map((user, index) => ({
        id: user.id,
        tenantId,
        name: legacyUserNames[index],
        email: v21PilotSeedPlan.identities[index].email,
        role: user.role,
        status: "active" as const,
      })),
    ).onConflictDoNothing();

    await transaction.insert(clients).values({
      id: v21PilotSeedPlan.client.id,
      tenantId,
      ownerUserId: v21PilotSeedPlan.users[1].id,
      externalReference: "CLIENT-CLAIRE-MARC-DEMO",
      name: v21PilotSeedPlan.client.name,
      riskLevel: "sensitive",
    }).onConflictDoNothing();

    await transaction.insert(households).values({
      id: v21PilotSeedPlan.household.id,
      tenantId,
      clientId: v21PilotSeedPlan.client.id,
      name: v21PilotSeedPlan.household.name,
      profile: demoHousehold.profile,
      members: [...demoHousehold.members],
      children: demoHousehold.children,
      fiscalResidence: demoHousehold.fiscalResidence,
      professionalContext: demoHousehold.professionalContext,
      objectives: [...demoHousehold.objectives],
    }).onConflictDoNothing();

    await transaction.insert(clientCases).values({
      id: v21PilotSeedPlan.case.id,
      tenantId,
      clientId: v21PilotSeedPlan.client.id,
      householdId: v21PilotSeedPlan.household.id,
      reference: v21PilotSeedPlan.case.reference,
      title: v21PilotSeedPlan.case.title,
      status: "review_required",
      fiscalYear: 2026,
      assignedExpertUserId: v21PilotSeedPlan.users[2].id,
    }).onConflictDoNothing();

    await transaction.insert(assets).values(
      demoHousehold.assets.map((asset, index) => ({
        id: assetIds[index],
        tenantId,
        householdId: v21PilotSeedPlan.household.id,
        caseId: v21PilotSeedPlan.case.id,
        label: asset.label,
        category: asset.category,
        value: asset.value.toFixed(2),
        ifiKind: asset.ifiKind,
      })),
    ).onConflictDoNothing();

    await transaction.insert(liabilities).values(
      demoHousehold.liabilities.map((liability, index) => ({
        id: liabilityIds[index],
        tenantId,
        householdId: v21PilotSeedPlan.household.id,
        caseId: v21PilotSeedPlan.case.id,
        label: liability.label,
        value: liability.value.toFixed(2),
        linkedCategory: liability.linkedCategory,
      })),
    ).onConflictDoNothing();

    await transaction.insert(documents).values(
      demoDocuments.map((document, index) => ({
        id: documentIds[index],
        tenantId,
        clientId: v21PilotSeedPlan.client.id,
        caseId: v21PilotSeedPlan.case.id,
        kind: document.kind,
        label: document.label,
        status: document.status,
        storageProvider: document.storageProvider,
        required: document.required,
      })),
    ).onConflictDoNothing();

    await transaction.insert(auditLogs).values({
      id: "88888888-8888-4888-8888-888888888881",
      tenantId,
      actorIdentityId: conseillerIdentity.id,
      action: "case.created",
      entityType: "dossier",
      entityId: v21PilotSeedPlan.case.id,
      summary: "Dossier de démonstration synthétique provisionné.",
      correlationId: DEMO_SEED_CORRELATION_ID,
      metadata: { fixture: "claire-marc", synthetic: true },
    }).onConflictDoNothing();

    return {
      tenantId,
      dossierId: v21PilotSeedPlan.case.id,
      identityId: conseillerIdentity.id,
      correlationId: DEMO_SEED_CORRELATION_ID,
    } as const;
  });
}
