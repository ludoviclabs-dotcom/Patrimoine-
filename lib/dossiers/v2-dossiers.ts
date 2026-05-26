import { demoHousehold } from "../demo-data/household";
import { demoPersonas } from "../demo-data/personas";
import { demoCases, demoClients, demoTenant } from "../demo-data/v1";
import { getV2TaxRuns } from "../tax/v2-engines";
import type {
  ClientCase,
  DossierSnapshot,
  OnboardingInput,
  PersonaInstantiation,
  TaxEnvelope,
} from "../types";

export const v2EnvelopeLabels: Record<TaxEnvelope, string> = {
  liquidites: "Liquidités",
  "immobilier-direct": "Immobilier direct",
  sci: "SCI",
  "societe-operationnelle": "Société opérationnelle",
  holding: "Holding",
  cto: "Compte-titres",
  pea: "PEA",
  "assurance-vie": "Assurance-vie",
  per: "PER",
  autres: "Autres",
};

export function getDossierSnapshot(caseId = demoCases[0].id): DossierSnapshot {
  return {
    id: `snapshot-${caseId}-v2`,
    tenantId: demoTenant.id,
    caseId,
    householdId: demoHousehold.id,
    capturedAt: "2026-05-26T12:00:00.000Z",
    assetIds: demoHousehold.assets.map((asset) => asset.id),
    liabilityIds: demoHousehold.liabilities.map((liability) => liability.id),
    objectiveLabels: demoHousehold.objectives,
    dataQualityScore: 72,
    sourceVersionIds: [
      "service-public-ifi-2026-03-06",
      "legifrance-lf-2026-art-7",
      "legifrance-lf-2026-art-8",
      "legifrance-lf-2026-art-11",
      "service-public-pfu-2026-03",
    ],
  };
}

export function instantiatePersona(personaId: string): PersonaInstantiation {
  const persona = demoPersonas.find((item) => item.id === personaId) ?? demoPersonas[0];
  const caseId = `case-${persona.id.replace("persona-", "")}-v2`;

  return {
    id: `instantiate-${persona.id}-v2`,
    personaId: persona.id,
    tenantId: demoTenant.id,
    caseId,
    householdId: demoHousehold.id,
    title: `Dossier ${persona.name} - ${persona.profile}`,
    createdAt: "2026-05-26T12:10:00.000Z",
    dossierSnapshotId: getDossierSnapshot(caseId).id,
    suggestedScenarioIds: persona.suggestedScenarios,
    missingDocuments: persona.missingDocuments,
  };
}

export function createOnboardingDossier(input: Partial<OnboardingInput> = {}) {
  const completed: OnboardingInput = {
    householdName: input.householdName ?? "Nouveau foyer dirigeant",
    matrimonialRegime: input.matrimonialRegime ?? "À confirmer",
    children: input.children ?? 2,
    fiscalResidence: input.fiscalResidence ?? "France",
    primaryGoal: input.primaryGoal ?? "Préparer une transmission",
    horizon: input.horizon ?? "6-24 mois",
    professionalToConsult: input.professionalToConsult ?? "cgp",
  };

  const clientCase: ClientCase = {
    ...demoCases[0],
    id: "case-onboarding-v2",
    clientId: demoClients[0].id,
    householdId: demoHousehold.id,
    title: `${completed.householdName} - ${completed.primaryGoal}`,
    status: "draft",
    updatedAt: "2026-05-26T12:15:00.000Z",
  };

  return {
    input: completed,
    clientCase,
    snapshot: getDossierSnapshot(clientCase.id),
    nextActions: [
      "Compléter régime matrimonial et bénéficiaires assurance-vie.",
      "Rattacher documents justificatifs avant rapport validé.",
      `Préparer rendez-vous ${completed.professionalToConsult}.`,
    ],
  };
}

export function getLivingDossier(caseId = demoCases[0].id) {
  const snapshot = getDossierSnapshot(caseId);
  const taxRuns = getV2TaxRuns();

  return {
    tenant: demoTenant,
    case: demoCases[0],
    client: demoClients[0],
    household: demoHousehold,
    snapshot,
    envelopes: Object.entries(v2EnvelopeLabels).map(([envelope, label]) => ({
      envelope,
      label,
      value: demoHousehold.assets
        .filter((asset) => asset.envelope === envelope)
        .reduce((sum, asset) => sum + asset.value, 0),
    })),
    taxRuns,
    timeline: [
      "Données collectées",
      "Simulation indicative",
      "Preuves attachées",
      "Revue professionnelle",
      "Rapport versionné",
    ],
  };
}
