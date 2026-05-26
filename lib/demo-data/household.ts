import type { Asset, Household, Liability } from "@/lib/types";

export const demoAssets: Asset[] = [
  {
    id: "asset-cash",
    label: "Liquidités",
    category: "liquidity",
    value: 220_000,
  },
  {
    id: "asset-cto",
    label: "Compte-titres",
    category: "financial",
    value: 480_000,
  },
  {
    id: "asset-pea",
    label: "PEA",
    category: "financial",
    value: 140_000,
  },
  {
    id: "asset-life-insurance",
    label: "Assurance-vie",
    category: "insurance",
    value: 350_000,
  },
  {
    id: "asset-main-residence",
    label: "Résidence principale",
    category: "real-estate",
    value: 900_000,
    ifiKind: "main-residence",
  },
  {
    id: "asset-rental",
    label: "Immobilier locatif",
    category: "real-estate",
    value: 600_000,
    ifiKind: "rental",
  },
  {
    id: "asset-sci",
    label: "Parts SCI immobilière",
    category: "real-estate",
    value: 300_000,
    ifiKind: "sci",
  },
  {
    id: "asset-company",
    label: "Titres de société opérationnelle",
    category: "company",
    value: 850_000,
    ifiKind: "excluded",
  },
];

export const demoLiabilities: Liability[] = [
  {
    id: "liability-real-estate-debt",
    label: "Dettes immobilières déclarées",
    value: 420_000,
    linkedCategory: "real-estate",
  },
];

export const demoHousehold: Household = {
  id: "household-claire-marc",
  name: "Claire et Marc",
  profile: "Foyer dirigeant patrimonial",
  members: ["Claire, 48 ans", "Marc, 51 ans"],
  children: 2,
  fiscalResidence: "France",
  professionalContext: "Dirigeants d’une PME familiale",
  assets: demoAssets,
  liabilities: demoLiabilities,
  objectives: [
    "Vérifier exposition IFI",
    "Préparer transmission aux enfants",
    "Préparer vente future de la société",
    "Produire dossier notaire / fiscaliste",
  ],
};
