import type { MeetingBrief, RiskRadarItem, ScenarioComparison, TimelineEvent } from "@/lib/types";

export const scenarioComparisons: ScenarioComparison[] = [
  {
    id: "scenario-do-nothing",
    label: "Ne rien faire",
    netWealthEstimate: 3_420_000,
    availableLiquidity: 220_000,
    legalComplexity: "faible",
    taxRisk: "moyen",
    requiredDocuments: ["Dernieres valorisations", "Dettes immobilieres detaillees"],
    requiredValidation: "Conseiller + fiscaliste si IFI proche du seuil",
    transmissionImpact: "Aucune preparation additionnelle, risque de report des decisions.",
  },
  {
    id: "scenario-simple-donation",
    label: "Donation simple",
    netWealthEstimate: 3_320_000,
    availableLiquidity: 210_000,
    legalComplexity: "moderee",
    taxRisk: "moyen",
    requiredDocuments: ["Livret de famille", "Donations anterieures", "Titres de propriete"],
    requiredValidation: "Notaire",
    transmissionImpact: "Transfert progressif mais protection du conjoint a documenter.",
  },
  {
    id: "scenario-usufruct-donation",
    label: "Donation avec reserve d'usufruit",
    netWealthEstimate: 3_350_000,
    availableLiquidity: 215_000,
    legalComplexity: "elevee",
    taxRisk: "moyen",
    requiredDocuments: ["Age donateurs", "Statuts SCI", "Actes de propriete", "Evaluation du bien"],
    requiredValidation: "Notaire + avocat fiscaliste",
    transmissionImpact: "Transmission anticipee tout en conservant une partie des droits economiques.",
  },
  {
    id: "scenario-real-estate-arbitrage",
    label: "Arbitrage immobilier",
    netWealthEstimate: 3_455_000,
    availableLiquidity: 340_000,
    legalComplexity: "moderee",
    taxRisk: "eleve",
    requiredDocuments: ["Date d'acquisition", "Prix d'achat", "Frais", "Baux", "Diagnostics"],
    requiredValidation: "Avocat fiscaliste",
    transmissionImpact: "Libere de la liquidite mais declenche une revue plus-value.",
  },
  {
    id: "scenario-partial-sale-reallocation",
    label: "Cession partielle + reallocation",
    netWealthEstimate: 3_500_000,
    availableLiquidity: 470_000,
    legalComplexity: "elevee",
    taxRisk: "eleve",
    requiredDocuments: ["Valorisation societe", "Pacte associes", "Objectifs de reinvestissement"],
    requiredValidation: "Expert-comptable + avocat fiscaliste",
    transmissionImpact: "Reduit la concentration entreprise si le calendrier est valide.",
  },
];

export const riskRadarItems: RiskRadarItem[] = [
  {
    axis: "fiscalite",
    vigilanceLevel: 3,
    label: "Fiscalite",
    rationale: "Base IFI sous seuil indicatif, mais dettes et SCI doivent etre revues.",
  },
  {
    axis: "transmission",
    vigilanceLevel: 4,
    label: "Transmission",
    rationale: "Deux enfants, assurance-vie et societe operationnelle a structurer.",
  },
  {
    axis: "liquidite",
    vigilanceLevel: 2,
    label: "Liquidite",
    rationale: "Liquidite immediate presente mais faible face a la concentration immobiliere.",
  },
  {
    axis: "concentration_immobiliere",
    vigilanceLevel: 4,
    label: "Concentration immobiliere",
    rationale: "Immobilier direct et SCI representent une part significative du patrimoine brut.",
  },
  {
    axis: "dette",
    vigilanceLevel: 3,
    label: "Dette",
    rationale: "Dette declaree importante, justificatifs et deductibilite a confirmer.",
  },
  {
    axis: "documentation",
    vigilanceLevel: 4,
    label: "Documentation",
    rationale: "Pieces SCI, assurance-vie et valorisation societe manquantes.",
  },
  {
    axis: "conformite_entreprise",
    vigilanceLevel: 3,
    label: "Conformite entreprise",
    rationale: "Preparation facturation electronique 2026/2027 a piloter.",
  },
];

export const patrimonialTimeline: TimelineEvent[] = [
  {
    id: "timeline-e-invoicing-reception-2026",
    year: "2026",
    title: "Reception facturation electronique",
    description: "Toutes les entreprises doivent etre pretes a recevoir des factures electroniques.",
    status: "regulatory",
  },
  {
    id: "timeline-e-invoicing-emission-2027",
    year: "2027",
    title: "Emission TPE/micro",
    description: "Preparation emission et e-reporting selon taille d'entreprise.",
    status: "regulatory",
  },
  {
    id: "timeline-donation-2028",
    year: "2028",
    title: "Donation envisagee",
    description: "Scenario donation simple ou demembree a discuter avec le notaire.",
    status: "planned",
  },
  {
    id: "timeline-retirement-2030",
    year: "2030",
    title: "Retraite progressive",
    description: "Controle liquidite, revenus et protection du conjoint.",
    status: "to-review",
  },
  {
    id: "timeline-company-sale-2032",
    year: "2032",
    title: "Cession societe envisagee",
    description: "Anticiper fiscalite, remploi et transmission avant signature.",
    status: "planned",
  },
  {
    id: "timeline-transmission-2040",
    year: "2040",
    title: "Transmission",
    description: "Rejouer les simulations avec regles et valorisations a jour.",
    status: "to-review",
  },
];

export const meetingBriefs: MeetingBrief[] = [
  {
    id: "brief-expert-comptable",
    audience: "expert-comptable",
    title: "Rendez-vous expert-comptable",
    dossierSummary:
      "Foyer dirigeant PME avec patrimoine net de 3,42 M EUR, societe operationnelle et preparation facturation electronique.",
    questions: [
      "Quelle valorisation retenir pour la societe operationnelle ?",
      "Quels impacts de tresorerie anticiper en cas de cession partielle ?",
      "Le logiciel de facturation est-il compatible plateforme agreee ?",
    ],
    documentsToBring: ["Statuts societe", "Derniers comptes", "Logiciel facturation", "Liste clients B2B"],
    taxPointsToValidate: ["E-reporting applicable", "Calendrier emission", "Traitement des flux B2B France"],
    testedScenarios: ["Cession partielle + reallocation", "Facturation electronique TPE/PME"],
  },
  {
    id: "brief-notaire",
    audience: "notaire",
    title: "Rendez-vous notaire",
    dossierSummary:
      "Famille avec deux enfants, SCI, residence principale et objectif de transmission progressive.",
    questions: [
      "Donation simple ou donation-partage ?",
      "Donation avec reserve d'usufruit pertinente ?",
      "Comment proteger le conjoint ?",
    ],
    documentsToBring: ["Livret de famille", "Contrat de mariage", "Statuts SCI", "Titres de propriete"],
    taxPointsToValidate: ["Donations anterieures", "Demembrement", "Clauses assurance-vie"],
    testedScenarios: ["Donation simple", "Donation avec reserve d'usufruit"],
  },
  {
    id: "brief-avocat-fiscaliste",
    audience: "avocat-fiscaliste",
    title: "Rendez-vous avocat fiscaliste",
    dossierSummary:
      "Simulation IFI sous seuil indicatif avec dettes et SCI a controler, plus-value eventuelle.",
    questions: [
      "Les dettes immobilieres sont-elles deductibles ?",
      "La SCI presente-t-elle des cas particuliers ?",
      "Quel risque plus-value en arbitrage immobilier ?",
    ],
    documentsToBring: ["Contrats emprunts", "Tableau SCI", "Prix acquisition", "Justificatifs de frais"],
    taxPointsToValidate: ["IFI", "Plus-value", "Exonerations ou exclusions"],
    testedScenarios: ["Simulation IFI", "Arbitrage immobilier"],
  },
  {
    id: "brief-cgp",
    audience: "cgp",
    title: "Rendez-vous CGP",
    dossierSummary:
      "Cartographie patrimoniale 360 avec liquidite, assurance-vie, compte-titres et objectifs long terme.",
    questions: [
      "Quel niveau de liquidite de securite conserver ?",
      "Quelle allocation apres cession partielle ?",
      "Quels documents manquent avant rapport final ?",
    ],
    documentsToBring: ["Releves financiers", "Contrats assurance-vie", "Objectifs retraite", "Tolerance au risque"],
    taxPointsToValidate: ["Fiscalite a valider par expert habilite", "Transmission", "Liquidite"],
    testedScenarios: ["Ne rien faire", "Cession partielle + reallocation"],
  },
];
