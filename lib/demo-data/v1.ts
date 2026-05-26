import { demoHousehold } from "./household";
import type {
  AuditLogEntry,
  ClientCase,
  ClientRecord,
  ConsentRecord,
  DocumentRecord,
  DpiaRecord,
  ProfessionalReview,
  Tenant,
  UserAccount,
} from "../types";

export const demoTenant: Tenant = {
  id: "tenant-cabinet-ludovic-demo",
  name: "Cabinet Patrimoine Pilot",
  slug: "cabinet-patrimoine-pilot",
  status: "pilot",
  dataRegion: "eu",
  createdAt: "2026-05-26T09:00:00.000Z",
};

export const demoUsers: UserAccount[] = [
  {
    id: "user-admin-ludo",
    tenantId: demoTenant.id,
    name: "Ludo Admin",
    email: "ludoviclabs@gmail.com",
    role: "admin",
    status: "active",
  },
  {
    id: "user-conseiller-marie",
    tenantId: demoTenant.id,
    name: "Marie Conseil",
    email: "marie.conseil@example.test",
    role: "conseiller",
    status: "active",
  },
  {
    id: "user-expert-avocat",
    tenantId: demoTenant.id,
    name: "Expert fiscaliste",
    email: "expert.fiscal@example.test",
    role: "expert",
    status: "active",
  },
  {
    id: "user-client-claire",
    tenantId: demoTenant.id,
    name: "Claire Demo",
    email: "claire.demo@example.test",
    role: "client",
    status: "active",
  },
];

export const demoClients: ClientRecord[] = [
  {
    id: "client-claire-marc",
    tenantId: demoTenant.id,
    householdId: demoHousehold.id,
    ownerUserId: "user-conseiller-marie",
    clientUserId: "user-client-claire",
    name: "Claire et Marc",
    riskLevel: "sensitive",
    createdAt: "2026-05-26T09:10:00.000Z",
  },
];

export const demoCases: ClientCase[] = [
  {
    id: "case-claire-marc-2026",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    householdId: demoHousehold.id,
    title: "Mission patrimoniale et fiscale 2026",
    status: "review_required",
    openedAt: "2026-05-26T09:15:00.000Z",
    updatedAt: "2026-05-26T10:20:00.000Z",
    assignedExpertUserId: "user-expert-avocat",
  },
];

export const demoDocuments: DocumentRecord[] = [
  {
    id: "doc-tax-notice-2025",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    caseId: "case-claire-marc-2026",
    kind: "tax_notice",
    label: "Avis d'imposition 2025",
    status: "received",
    storageProvider: "demo-placeholder",
    required: true,
    updatedAt: "2026-05-26T09:30:00.000Z",
    dataQuality: {
      status: "supporting_document_received",
      supportingDocumentId: "doc-tax-notice-2025",
      expectedAction: "Controler la coherence avec les revenus et liquidites declares.",
      validationStatus: "pending",
    },
  },
  {
    id: "doc-loan-contracts",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    caseId: "case-claire-marc-2026",
    kind: "loan_contract",
    label: "Contrats d'emprunt immobilier",
    status: "to_review",
    storageProvider: "demo-placeholder",
    required: true,
    updatedAt: "2026-05-26T09:40:00.000Z",
    dataQuality: {
      status: "supporting_document_received",
      supportingDocumentId: "doc-loan-contracts",
      expectedAction: "Extraire le capital restant du par pret et rattacher aux actifs.",
      validationStatus: "pending",
    },
  },
  {
    id: "doc-company-statutes",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    caseId: "case-claire-marc-2026",
    kind: "company_statutes",
    label: "Statuts et pacte de la societe operationnelle",
    status: "missing",
    storageProvider: "vercel-blob-private",
    required: true,
    updatedAt: "2026-05-26T10:00:00.000Z",
    dataQuality: {
      status: "user_declared",
      supportingDocumentId: "doc-company-statutes",
      expectedAction: "Recevoir les statuts et la table de capitalisation.",
      validationStatus: "not_started",
    },
  },
  {
    id: "doc-life-insurance",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    caseId: "case-claire-marc-2026",
    kind: "life_insurance",
    label: "Contrats assurance-vie et clauses beneficiaires",
    status: "missing",
    storageProvider: "vercel-blob-private",
    required: true,
    updatedAt: "2026-05-26T10:00:00.000Z",
    dataQuality: {
      status: "estimated",
      supportingDocumentId: "doc-life-insurance",
      expectedAction: "Collecter contrats, valeurs de rachat et clauses beneficiaires.",
      validationStatus: "not_started",
    },
  },
  {
    id: "doc-family-record",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    caseId: "case-claire-marc-2026",
    kind: "transmission_family_record",
    label: "Livret de famille et objectifs de transmission",
    status: "validated",
    storageProvider: "demo-placeholder",
    required: true,
    updatedAt: "2026-05-26T10:10:00.000Z",
    dataQuality: {
      status: "professional_validated",
      supportingDocumentId: "doc-family-record",
      expectedAction: "Confirmer le regime matrimonial avec le notaire.",
      validationStatus: "validated",
    },
  },
];

export const demoProfessionalReviews: ProfessionalReview[] = [
  {
    id: "review-claire-marc-fiscal",
    tenantId: demoTenant.id,
    caseId: "case-claire-marc-2026",
    reviewerUserId: "user-expert-avocat",
    decision: "pending",
    summary:
      "Revue requise avant toute conclusion sur IFI, deductibilite des dettes, SCI et transmission.",
    requiredActions: [
      "Verifier la nature des dettes rattachees a l'immobilier taxable.",
      "Confirmer la composition des parts SCI.",
      "Completer les clauses beneficiaires assurance-vie.",
    ],
  },
];

export const demoConsents: ConsentRecord[] = [
  {
    id: "consent-simulation-claire",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    purpose: "simulation",
    status: "granted",
    capturedAt: "2026-05-26T09:20:00.000Z",
  },
  {
    id: "consent-documents-claire",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    purpose: "document_storage",
    status: "granted",
    capturedAt: "2026-05-26T09:21:00.000Z",
  },
  {
    id: "consent-ai-disabled",
    tenantId: demoTenant.id,
    clientId: "client-claire-marc",
    purpose: "ai_assistance",
    status: "not_required",
    capturedAt: "2026-05-26T09:21:00.000Z",
  },
];

export const demoDpiaRecords: DpiaRecord[] = [
  {
    id: "dpia-v1-patrimoine",
    tenantId: demoTenant.id,
    title: "AIPD pilote : donnees patrimoniales, fiscales et familiales",
    riskLevel: "high",
    status: "draft",
    lastReviewedAt: "2026-05-26T10:00:00.000Z",
    mitigations: [
      "Separation stricte par tenant.",
      "Audit append-only des actions sensibles.",
      "Validation humaine avant livrable professionnel.",
      "Mode IA desactive tant que le socle de preuve n'est pas stabilise.",
    ],
  },
];

export const demoV1AuditLogs: readonly AuditLogEntry[] = Object.freeze([
  Object.freeze({
    id: "audit-v1-006",
    tenantId: demoTenant.id,
    actorUserId: "user-conseiller-marie",
    action: "report.exported",
    entityType: "case",
    entityId: "case-claire-marc-2026",
    createdAt: "2026-05-26T10:50:00.000Z",
    summary: "Rapport professionnel imprime en PDF navigateur.",
    metadata: { status: "indicative", validated: false },
  }),
  Object.freeze({
    id: "audit-v1-005",
    tenantId: demoTenant.id,
    actorUserId: "user-conseiller-marie",
    action: "scenario.compared",
    entityType: "simulation",
    entityId: "scenario-comparison-claire-marc",
    createdAt: "2026-05-26T10:45:00.000Z",
    summary: "Comparateur de scenarios V1.1 ouvert en rendez-vous cabinet.",
    metadata: { scenarios: 5 },
  }),
  Object.freeze({
    id: "audit-v1-004",
    tenantId: demoTenant.id,
    actorUserId: "user-expert-avocat",
    action: "review.requested",
    entityType: "review",
    entityId: "review-claire-marc-fiscal",
    createdAt: "2026-05-26T10:25:00.000Z",
    summary: "Passage en revue professionnelle avant validation.",
    metadata: { status: "review_required" },
  }),
  Object.freeze({
    id: "audit-v1-003",
    tenantId: demoTenant.id,
    actorUserId: "user-conseiller-marie",
    action: "simulation.run",
    entityType: "simulation",
    entityId: "simulation-ifi-claire-marc",
    createdAt: "2026-05-26T10:20:00.000Z",
    summary: "Simulation IFI executee avec calculation_steps sourcés.",
    metadata: { taxableBase: 1110000 },
  }),
  Object.freeze({
    id: "audit-v1-002",
    tenantId: demoTenant.id,
    actorUserId: "user-client-claire",
    action: "document.received",
    entityType: "document",
    entityId: "doc-tax-notice-2025",
    createdAt: "2026-05-26T09:30:00.000Z",
    summary: "Avis d'imposition 2025 recu en zone documentaire.",
  }),
  Object.freeze({
    id: "audit-v1-001",
    tenantId: demoTenant.id,
    actorUserId: "user-conseiller-marie",
    action: "case.created",
    entityType: "case",
    entityId: "case-claire-marc-2026",
    createdAt: "2026-05-26T09:15:00.000Z",
    summary: "Dossier pilote Claire et Marc cree.",
  }),
]);

export function getDemoUser(role: UserAccount["role"] = "conseiller") {
  const user = demoUsers.find((candidate) => candidate.role === role);

  if (!user) {
    throw new Error(`No demo user found for role ${role}`);
  }

  return user;
}

export function getDocumentCompletion() {
  const completed = demoDocuments.filter((document) => document.status === "validated").length;
  const received = demoDocuments.filter((document) =>
    ["received", "to_review", "validated"].includes(document.status),
  ).length;

  return {
    required: demoDocuments.filter((document) => document.required).length,
    received,
    validated: completed,
    missing: demoDocuments.filter((document) => document.status === "missing").length,
  };
}
