import { appendAuditEventToRepository } from "../audit/repository";
import { demoTenant } from "../demo-data/v1";
import type { Recommendation } from "../types";

/**
 * CRM-light : suivi des préconisations du cabinet.
 * Machine d'états : proposée → acceptée → en-cours → réalisée.
 * Chaque transition est journalisée (audit append-only, action
 * recommendation.updated). Fixtures démo reliées aux runs moteurs.
 */

export const RECOMMENDATION_FLOW: Recommendation["status"][] = [
  "proposee",
  "acceptee",
  "en-cours",
  "realisee",
];

export const demoRecommendations: Recommendation[] = [
  {
    id: "reco-donation-demembree",
    caseId: "case-claire-marc-2026",
    title: "Préparer une donation démembrée aux enfants",
    detail:
      "Donation en nue-propriété (art. 669) à valider avec le notaire : abattements 100 000 € par enfant disponibles.",
    status: "acceptee",
    linkedRunId: "taxrun-demembrement-claire-marc-v3",
    owner: "conseiller",
    updatedAt: "2026-06-09T10:00:00.000Z",
  },
  {
    id: "reco-pacte-dutreil",
    caseId: "case-claire-marc-2026",
    title: "Documenter le pacte Dutreil avant transmission",
    detail:
      "Engagement collectif et fonction de direction à formaliser : l'économie indicative dépasse 370 000 € sur 2 M€ transmis.",
    status: "en-cours",
    linkedRunId: "taxrun-dutreil-claire-marc-v2",
    owner: "avocat",
    updatedAt: "2026-06-10T15:30:00.000Z",
  },
  {
    id: "reco-per-plafond",
    caseId: "case-claire-marc-2026",
    title: "Utiliser le plafond PER disponible avant le 31/12",
    detail: "Plafond et reliquats non consommés : économie d'impôt à la TMI du foyer.",
    status: "proposee",
    linkedRunId: "taxrun-per-deduction-claire-marc-v2",
    owner: "conseiller",
    updatedAt: "2026-06-08T09:00:00.000Z",
  },
  {
    id: "reco-clause-beneficiaire",
    caseId: "case-claire-marc-2026",
    title: "Relire les clauses bénéficiaires d'assurance-vie",
    detail:
      "Vérifier la ventilation 990 I / 757 B et la protection du conjoint avant l'été.",
    status: "realisee",
    linkedRunId: "taxrun-assurance-vie-claire-marc-v3",
    owner: "notaire",
    updatedAt: "2026-06-05T11:00:00.000Z",
  },
];

export function getNextStatus(status: Recommendation["status"]) {
  const index = RECOMMENDATION_FLOW.indexOf(status);
  return index >= 0 && index < RECOMMENDATION_FLOW.length - 1
    ? RECOMMENDATION_FLOW[index + 1]
    : null;
}

export function advanceRecommendation(recommendation: Recommendation): Recommendation {
  const nextStatus = getNextStatus(recommendation.status);
  if (!nextStatus) return recommendation;

  appendAuditEventToRepository({
    id: `audit-reco-${recommendation.id}-${nextStatus}`,
    tenantId: demoTenant.id,
    actorUserId: "user-conseiller-demo",
    action: "recommendation.updated",
    entityType: "case",
    entityId: recommendation.id,
    createdAt: "2026-06-11T14:00:00.000Z",
    summary: `Préconisation « ${recommendation.title} » passée au statut ${nextStatus}.`,
  });

  return { ...recommendation, status: nextStatus, updatedAt: "2026-06-11T14:00:00.000Z" };
}
