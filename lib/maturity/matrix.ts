import type { MaturityItem } from "../types";

export const maturityMatrix: MaturityItem[] = [
  {
    id: "maturity-fiscal-engines",
    area: "Moteurs fiscaux déterministes",
    status: "production_ready_without_connector",
    evidence: "IFI, PFU/CDHR, plus-value, transmission, Dutreil et taxe holding produisent étapes, sources et limites.",
    nextAction: "Relecture fiscale professionnelle avant usage commercial.",
  },
  {
    id: "maturity-source-diff",
    area: "Diff réglementaire PFU",
    status: "fixtures_demo",
    evidence: "Scénario stable PFU 30 % vers 31,4 % avec impact Claire et Marc.",
    nextAction: "Brancher contrôles live seulement après gouvernance de source.",
  },
  {
    id: "maturity-golden-cases",
    area: "Golden cases live",
    status: "production_ready_without_connector",
    evidence: "Attendu vs calculé, pass/fail et cas adverses visibles.",
    nextAction: "Ajouter jeux validés par fiscaliste pour chaque exception.",
  },
  {
    id: "maturity-report",
    area: "Rapport institutionnel",
    status: "fixtures_demo",
    evidence: "Rapport navigateur avec sources, limites, filigrane et bloc de validation.",
    nextAction: "Passer en PDF serveur après stockage privé.",
  },
  {
    id: "maturity-auth-blob-db",
    area: "Auth, Blob privé, Postgres",
    status: "external_connector_required",
    evidence: "Contrats et schémas prêts, connecteurs exclus de cette itération.",
    externalDependency: "auth_provider, BLOB_READ_WRITE_TOKEN, DATABASE_URL",
    nextAction: "Brancher après stabilisation portfolio.",
  },
  {
    id: "maturity-ai-runtime",
    area: "IA runtime",
    status: "not_built",
    evidence: "Gouvernance documentée, runtime désactivé.",
    externalDependency: "provider IA futur",
    nextAction: "Attendre corpus source, abstention et revue humaine robuste.",
  },
];

export function getMaturityMatrix() {
  return maturityMatrix;
}
