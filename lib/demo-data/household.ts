import type { Asset, Household, Liability } from "@/lib/types";

export const demoAssets: Asset[] = [
  {
    id: "asset-cash",
    label: "Liquidites",
    category: "liquidity",
    value: 220_000,
    dataQuality: {
      status: "supporting_document_received",
      supportingDocumentId: "doc-tax-notice-2025",
      expectedAction: "Rapprocher avec les derniers releves bancaires.",
      validationStatus: "pending",
    },
  },
  {
    id: "asset-cto",
    label: "Compte-titres",
    category: "financial",
    value: 480_000,
    dataQuality: {
      status: "user_declared",
      expectedAction: "Demander le releve de compte-titres au 31/12.",
      validationStatus: "not_started",
    },
  },
  {
    id: "asset-pea",
    label: "PEA",
    category: "financial",
    value: 140_000,
    dataQuality: {
      status: "user_declared",
      expectedAction: "Collecter le releve PEA et l'anciennete du plan.",
      validationStatus: "not_started",
    },
  },
  {
    id: "asset-life-insurance",
    label: "Assurance-vie",
    category: "insurance",
    value: 350_000,
    dataQuality: {
      status: "estimated",
      supportingDocumentId: "doc-life-insurance",
      expectedAction: "Verifier les contrats et clauses beneficiaires.",
      validationStatus: "not_started",
    },
  },
  {
    id: "asset-main-residence",
    label: "Residence principale",
    category: "real-estate",
    value: 900_000,
    ifiKind: "main-residence",
    dataQuality: {
      status: "estimated",
      supportingDocumentId: "doc-family-record",
      expectedAction: "Obtenir une estimation notariale ou avis de valeur recent.",
      validationStatus: "pending",
    },
  },
  {
    id: "asset-rental",
    label: "Immobilier locatif",
    category: "real-estate",
    value: 600_000,
    ifiKind: "rental",
    dataQuality: {
      status: "user_declared",
      supportingDocumentId: "doc-loan-contracts",
      expectedAction: "Rattacher titres de propriete, bail et capital restant du.",
      validationStatus: "pending",
    },
  },
  {
    id: "asset-sci",
    label: "Parts SCI immobiliere",
    category: "real-estate",
    value: 300_000,
    ifiKind: "sci",
    dataQuality: {
      status: "estimated",
      supportingDocumentId: "doc-company-statutes",
      expectedAction: "Verifier la repartition des parts et la valorisation immobiliere.",
      validationStatus: "not_started",
    },
  },
  {
    id: "asset-company",
    label: "Titres de societe operationnelle",
    category: "company",
    value: 850_000,
    ifiKind: "excluded",
    dataQuality: {
      status: "estimated",
      supportingDocumentId: "doc-company-statutes",
      expectedAction: "Mettre a jour la derniere valorisation de la societe.",
      validationStatus: "not_started",
    },
  },
];

export const demoLiabilities: Liability[] = [
  {
    id: "liability-real-estate-debt",
    label: "Dettes immobilieres declarees",
    value: 420_000,
    linkedCategory: "real-estate",
    dataQuality: {
      status: "user_declared",
      supportingDocumentId: "doc-loan-contracts",
      expectedAction: "Verifier le capital restant du detaille par emprunt.",
      validationStatus: "pending",
    },
  },
];

export const demoHousehold: Household = {
  id: "household-claire-marc",
  name: "Claire et Marc",
  profile: "Foyer dirigeant patrimonial",
  members: ["Claire, 48 ans", "Marc, 51 ans"],
  children: 2,
  fiscalResidence: "France",
  professionalContext: "Dirigeants d'une PME familiale",
  assets: demoAssets,
  liabilities: demoLiabilities,
  objectives: [
    "Verifier exposition IFI",
    "Preparer transmission aux enfants",
    "Preparer vente future de la societe",
    "Produire dossier notaire / fiscaliste",
  ],
};
