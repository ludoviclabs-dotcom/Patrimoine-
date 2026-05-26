export type TransmissionChecklistItem = {
  id: string;
  label: string;
  owner: "notaire" | "avocat" | "expert-comptable" | "conseiller";
  status: "ready" | "missing" | "needs_review";
};

export const transmissionChecklist: TransmissionChecklistItem[] = [
  {
    id: "transmission-family",
    label: "Confirmer régime matrimonial, conjoint survivant et héritiers réservataires",
    owner: "notaire",
    status: "needs_review",
  },
  {
    id: "transmission-donation",
    label: "Comparer donation simple, donation-partage et démembrement",
    owner: "notaire",
    status: "needs_review",
  },
  {
    id: "transmission-company-control",
    label: "Mesurer l’impact d’une transmission sur le contrôle de la société",
    owner: "avocat",
    status: "needs_review",
  },
  {
    id: "transmission-liquidity",
    label: "Vérifier la liquidité résiduelle après donation ou arbitrage",
    owner: "conseiller",
    status: "ready",
  },
  {
    id: "transmission-documents",
    label: "Préparer titres de propriété, statuts SCI, contrats d’assurance-vie et dettes",
    owner: "expert-comptable",
    status: "missing",
  },
];

export const transmissionQuestions = [
  "Donation simple ou donation-partage ?",
  "Pleine propriété ou démembrement ?",
  "Protection du conjoint prioritaire ?",
  "Donation avant ou après cession de la société ?",
  "Quel niveau de liquidité conserver après transmission ?",
];
