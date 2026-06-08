import { demoHousehold } from "../demo-data/household";
import type { CompletenessScore, DataQualityProfile, Household } from "../types";

export const claireMarcMissingItems = [
  "Régime matrimonial",
  "Bénéficiaires assurance-vie",
  "Repartition des parts SCI",
  "Capital restant du detaille",
  "Valorisation societe",
  "Dates d'acquisition",
];

export const claireMarcCheckedItems = [
  "Foyer fiscal",
  "Residence fiscale",
  "Enfants et objectifs",
  "Actifs principaux",
  "Dettes immobilieres declarees",
  "Source IFI rattachee",
  "Revue professionnelle assignee",
];

export function getCompletenessScore(household: Household = demoHousehold): CompletenessScore {
  return {
    householdId: household.id,
    score: 72,
    missingItems: claireMarcMissingItems,
    checkedItems: claireMarcCheckedItems,
    status: "review_required",
  };
}

export function getCriticalDataQuality(household: Household = demoHousehold) {
  return [...household.assets, ...household.liabilities].map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    dataQuality: item.dataQuality,
  }));
}

export function getDataQualityLabel(profile: DataQualityProfile) {
  const labels: Record<DataQualityProfile["status"], string> = {
    user_declared: "Declaratif utilisateur",
    supporting_document_received: "Justificatif recu",
    estimated: "Estimation",
    external_source: "Source externe",
    professional_validated: "Valide professionnel",
  };

  return labels[profile.status];
}
