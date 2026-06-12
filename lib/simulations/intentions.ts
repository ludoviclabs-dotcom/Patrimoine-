import type { LabScenario } from "./lab-scenarios";

/**
 * Familles d'intention de l'accueil guidé de /simulations.
 *
 * Principe de divulgation progressive : l'utilisateur part de son intention
 * (« je prépare une vente »), pas du nom fiscal du moteur. Chaque intention
 * mappe DÉTERMINISTIQUEMENT vers 3 à 5 scénarios du laboratoire, ordonnés par
 * priorité. Les cartes de recommandation tirent leurs métadonnées (libellé,
 * statut, limites, revue) du simulationCatalog via getSimulationByParam —
 * seule la phrase `pourquoi` est propre à l'intention.
 *
 * Typage en LabScenario : une faute de frappe est une erreur de compilation.
 */

export type IntentionId =
  | "vendre-bien"
  | "optimiser-revenus"
  | "preparer-transmission"
  | "enveloppe-retraite"
  | "auditer-structure"
  | "verifier-conformite";

export type ScenarioRecommendation = {
  scenarioParam: LabScenario;
  /** Phrase non technique : pourquoi ce scénario est proposé pour cette intention. */
  pourquoi: string;
  priority: "prioritaire" | "a-verifier" | "complementaire";
};

export type Intention = {
  id: IntentionId;
  label: string;
  eyebrow: string;
  description: string;
  recommendations: ScenarioRecommendation[];
};

export const intentions: Intention[] = [
  {
    id: "vendre-bien",
    label: "Je prépare une vente",
    eyebrow: "Immobilier · titres",
    description: "Estimer l'impôt d'une cession, anticiper la liquidité et les cas particuliers.",
    recommendations: [
      {
        scenarioParam: "plus-value",
        pourquoi: "Vente envisagée : estime l'impôt selon la durée de détention, les frais et les forfaits.",
        priority: "prioritaire",
      },
      {
        scenarioParam: "sci-arbitrage",
        pourquoi: "Bien détenu via une SCI : la fiscalité de sortie change selon le régime IR ou IS.",
        priority: "a-verifier",
      },
      {
        scenarioParam: "succession-liquidity-stress",
        pourquoi: "Vérifie que la liquidité dégagée couvre les droits et délais en cas d'imprévu.",
        priority: "complementaire",
      },
      {
        scenarioParam: "exit-tax",
        pourquoi: "Un départ de France avec des titres importants peut déclencher l'exit tax.",
        priority: "complementaire",
      },
    ],
  },
  {
    id: "optimiser-revenus",
    label: "J'optimise mes revenus financiers",
    eyebrow: "Dividendes · plus-values mobilières",
    description: "Comparer flat tax et barème, mesurer la pression fiscale réelle du foyer.",
    recommendations: [
      {
        scenarioParam: "pfu",
        pourquoi: "Compare la flat tax 31,4 % et l'option barème selon votre taux marginal.",
        priority: "prioritaire",
      },
      {
        scenarioParam: "ir",
        pourquoi: "Calcule l'impôt 2026 du foyer : tranches, quotient familial, décote et CDHR.",
        priority: "a-verifier",
      },
      {
        scenarioParam: "pea",
        pourquoi: "Après 5 ans, le PEA exonère d'impôt les gains retirés : à vérifier sur le plan.",
        priority: "complementaire",
      },
    ],
  },
  {
    id: "preparer-transmission",
    label: "Je prépare une transmission",
    eyebrow: "Donation · succession",
    description: "Chiffrer donations, démembrement et assurance-vie avant le rendez-vous notaire.",
    recommendations: [
      {
        scenarioParam: "transmission",
        pourquoi: "Chiffre les droits de donation selon le lien de parenté et les abattements disponibles.",
        priority: "prioritaire",
      },
      {
        scenarioParam: "demembrement",
        pourquoi: "Donner la nue-propriété réduit la base taxable selon l'âge du donateur (art. 669).",
        priority: "a-verifier",
      },
      {
        scenarioParam: "assurance-vie",
        pourquoi: "Les capitaux décès suivent un régime propre (990 I / 757 B) selon l'âge des versements.",
        priority: "a-verifier",
      },
      {
        scenarioParam: "dutreil",
        pourquoi: "Transmettre une entreprise avec un pacte Dutreil peut exonérer 75 % de sa valeur.",
        priority: "complementaire",
      },
      {
        scenarioParam: "succession-checklist",
        pourquoi: "Prépare la checklist notaire : pièces, donations antérieures et points de revue.",
        priority: "complementaire",
      },
    ],
  },
  {
    id: "enveloppe-retraite",
    label: "Je teste une enveloppe retraite",
    eyebrow: "PER · PEA",
    description: "Mesurer la déduction à l'entrée, les plafonds disponibles et les sorties anticipées.",
    recommendations: [
      {
        scenarioParam: "per",
        pourquoi: "Calcule le plafond de déduction 2026 (salarié ou TNS) et l'économie d'impôt à votre TMI.",
        priority: "prioritaire",
      },
      {
        scenarioParam: "per-early-exit",
        pourquoi: "Une sortie anticipée pour la résidence principale a un traitement fiscal à contrôler.",
        priority: "a-verifier",
      },
      {
        scenarioParam: "pea",
        pourquoi: "Le PEA complète le PER : retraits exonérés d'impôt après 5 ans de détention.",
        priority: "complementaire",
      },
    ],
  },
  {
    id: "auditer-structure",
    label: "J'audite une structure",
    eyebrow: "Société · holding · SCI",
    description: "Vérifier l'IS, l'arbitrage SCI IR/IS et l'exposition à la taxe holding.",
    recommendations: [
      {
        scenarioParam: "is",
        pourquoi: "Calcule l'IS 2026 : taux réduit PME 15 %, taux normal 25 % et contribution sociale.",
        priority: "prioritaire",
      },
      {
        scenarioParam: "sci-arbitrage",
        pourquoi: "Compare l'imposition annuelle et la fiscalité de sortie d'une SCI à l'IR et à l'IS.",
        priority: "a-verifier",
      },
      {
        scenarioParam: "holding-tax",
        pourquoi: "Détecte si la holding réunit les critères de la taxe sur les actifs non professionnels.",
        priority: "a-verifier",
      },
      {
        scenarioParam: "dutreil",
        pourquoi: "Anticipe la transmission des titres : l'éligibilité Dutreil se prépare des années avant.",
        priority: "complementaire",
      },
    ],
  },
  {
    id: "verifier-conformite",
    label: "Je vérifie la conformité du conseil",
    eyebrow: "Adéquation · KYC · revue",
    description: "Contrôler l'adéquation produit, les données importées et les pièces du dossier.",
    recommendations: [
      {
        scenarioParam: "product-adequacy",
        pourquoi: "Croise horizon, tolérance au risque et durabilité avant toute proposition produit.",
        priority: "prioritaire",
      },
      {
        scenarioParam: "bank-import",
        pourquoi: "Montre le parcours d'import bancaire conforme DSP2 : consentement, SCA, alertes.",
        priority: "complementaire",
      },
      {
        scenarioParam: "succession-checklist",
        pourquoi: "Vérifie que les pièces et points de revue du dossier sont réunis avant restitution.",
        priority: "complementaire",
      },
    ],
  },
];

export function getIntention(id: string | null | undefined): Intention | null {
  return intentions.find((intention) => intention.id === id) ?? null;
}
