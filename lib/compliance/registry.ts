import { demoDpiaRecords, demoTenant } from "../demo-data/v1";

export const processingRegister = [
  {
    id: "processing-case-management",
    tenantId: demoTenant.id,
    purpose: "Gestion des dossiers patrimoniaux et fiscaux",
    dataCategories: ["identite", "situation familiale", "patrimoine", "revenus", "dettes"],
    legalBasis: "execution de mission et consentement documente",
    recipients: ["cabinet", "professionnel habilite"],
    retention: "Duree de mission + 5 ans en pilote, a confirmer contractuellement",
    securityMeasures: ["tenant scope", "audit append-only", "export RGPD"],
  },
  {
    id: "processing-document-storage",
    tenantId: demoTenant.id,
    purpose: "Stockage des pieces justificatives",
    dataCategories: ["avis fiscaux", "contrats", "statuts societaires", "assurance-vie"],
    legalBasis: "consentement documente et interet legitime de preuve",
    recipients: ["cabinet", "client", "professionnel habilite"],
    retention: "Suppression ou archivage a la cloture du dossier selon mandat",
    securityMeasures: ["stockage prive requis", "pas d'URL publique", "hash documentaire"],
  },
  {
    id: "processing-professional-review",
    tenantId: demoTenant.id,
    purpose: "Validation humaine des livrables indicatifs",
    dataCategories: ["simulations", "sources", "commentaires expert", "decision de revue"],
    legalBasis: "execution de mission",
    recipients: ["expert-comptable", "avocat fiscaliste", "notaire ou CGP selon dossier"],
    retention: "Journal de preuve append-only, duree a confirmer par politique cabinet",
    securityMeasures: ["journal insert-only", "statut non valide par defaut", "revue humaine"],
  },
];

export const retentionPolicy = [
  {
    area: "Dossier pilote",
    rule: "Aucune donnee reelle en production sans tenant, mandat et consentement rattaches.",
  },
  {
    area: "Documents",
    rule: "Pieces conservees en Blob prive puis purgeables sur demande client ou fin de mandat.",
  },
  {
    area: "Audit",
    rule: "Journal append-only conserve pour preuve de revue, sans edition retroactive.",
  },
  {
    area: "IA",
    rule: "Mode runtime IA desactive tant que le moteur metier et le corpus source ne sont pas stabilises.",
  },
];

export const aiGovernanceChecklist = [
  "LLM exclu du calcul fiscal et patrimonial.",
  "Citations obligatoires pour toute redaction future.",
  "Abstention si preuve insuffisante ou source non versionnee.",
  "Validation humaine explicite avant livrable professionnel.",
  "Historique applicatif stocke cote plateforme, pas dans un state fournisseur implicite.",
];

export const dpiaSummary = demoDpiaRecords[0];
