import type { AiGovernancePolicy } from "@/lib/types";

export const aiGovernancePolicy: AiGovernancePolicy = {
  id: "ai-governance-v1-1-disabled",
  runtimeStatus: "disabled",
  allowedUses: [
    "Qualification de dossier apres stabilisation du socle de preuve.",
    "Explication redactionnelle avec citations obligatoires.",
    "Generation de questions manquantes sous revue humaine.",
  ],
  prohibitedUses: [
    "Calcul fiscal comme source de verite.",
    "Conseil juridique ou fiscal definitif.",
    "Scoring d'eligibilite financiere ou decision automatisee.",
    "Production sans source officielle et sans statut de fiabilite.",
  ],
  citationRequired: true,
  abstentionRequired: true,
};
