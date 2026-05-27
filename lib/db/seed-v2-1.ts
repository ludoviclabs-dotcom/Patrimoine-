export const v21PilotSeedPlan = {
  note: "Plan de seed Postgres-ready, non execute en mode fixtures.",
  tenant: {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "cabinet-patrimoine-pilot",
    name: "Cabinet Patrimoine Pilot",
  },
  users: [
    { id: "22222222-2222-4222-8222-222222222221", role: "admin" },
    { id: "22222222-2222-4222-8222-222222222222", role: "conseiller" },
    { id: "22222222-2222-4222-8222-222222222223", role: "expert" },
    { id: "22222222-2222-4222-8222-222222222224", role: "client" },
  ],
  client: {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Claire et Marc",
  },
  case: {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Mission patrimoniale et fiscale 2026",
  },
  readinessTables: [
    "dossier_snapshots",
    "professional_documents",
    "data_requests",
    "private_document_metadata",
    "retention_policies",
    "golden_cases",
    "offline_evidence_snapshots",
  ],
  migration: "drizzle/0002_v2_1_pilot_readiness.sql",
} as const;
