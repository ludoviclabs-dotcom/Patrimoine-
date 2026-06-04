export type PatrimonialCertainty = "fait établi" | "analyse" | "hypothèse" | "revue obligatoire";

export type PatrimonialStatus =
  | "modélisé"
  | "simulation simple"
  | "revue obligatoire"
  | "hors MVP"
  | "démo simulée";

export type RiskLevel = "faible" | "moyen" | "élevé" | "critique";

type DisplayableFixture = {
  id: string;
  label: string;
  category: string;
  status: PatrimonialStatus;
  certainty: PatrimonialCertainty;
  sourceIds: string[];
  reviewRequired: boolean;
  userFacingExplanation: string;
};

export type PatrimonialTerm = DisplayableFixture & {
  synonyms: string[];
  legalScope: string;
  fiscalScope: string;
  effectiveDate: string;
};

export type WealthStructure = DisplayableFixture & {
  typicalUse: string;
  modelFields: string[];
  vigilance: string;
};

export type ComplianceSignal = DisplayableFixture & {
  trigger: string;
  evidenceExpected: string;
  nextControl: string;
};

export type ManualReviewFlag = DisplayableFixture & {
  riskLevel: RiskLevel;
  trigger: string;
  whyNoAutomation: string;
  requiredProfessional: "notaire" | "avocat" | "expert-comptable" | "cgp";
};

export type CabinetActionPlanStep = DisplayableFixture & {
  order: number;
  verb: "Collecter" | "Qualifier" | "Simuler" | "Contrôler" | "Restituer";
  dataUsed: string[];
  risk: RiskLevel;
  nextAction: string;
  href: string;
};

export type DemoConnectorImport = DisplayableFixture & {
  steps: Array<{
    label: string;
    status: "simulé" | "à brancher" | "revue requise";
    detail: string;
  }>;
  detectedEnvelopes: string[];
  alerts: string[];
};

export type ReportMethodItem = {
  id: string;
  label: string;
  meaning: string;
  reportRule: string;
};

export const patrimonialTerms: PatrimonialTerm[] = [
  {
    id: "term-foyer-fiscal",
    label: "Foyer fiscal",
    category: "Personnes",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-service-public-per-deduction-2026"],
    reviewRequired: false,
    userFacingExplanation:
      "Point de départ des plafonds, abattements, rattachements et simulations de revenu.",
    synonyms: ["ménage fiscal", "foyer d'imposition"],
    legalScope: "Personnes et rattachement",
    fiscalScope: "IR, PER, transmission",
    effectiveDate: "2026-06-04",
  },
  {
    id: "term-enveloppe-fiscale",
    label: "Enveloppe fiscale",
    category: "Actifs",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-service-public-pea-2026", "src-service-public-per-deduction-2026"],
    reviewRequired: false,
    userFacingExplanation:
      "PEA, PER, assurance-vie ou CTO ne se pilotent pas comme de simples lignes d'actifs.",
    synonyms: ["support fiscal", "véhicule d'investissement"],
    legalScope: "Produit réglementé",
    fiscalScope: "Retrait, versement, plafond, rachat",
    effectiveDate: "2026-06-04",
  },
  {
    id: "term-beneficiaire-effectif",
    label: "Bénéficiaire effectif",
    category: "Conformité",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "Les structures interposées imposent d'identifier qui contrôle ou bénéficie réellement.",
    synonyms: ["UBO", "contrôle effectif"],
    legalScope: "LCB-FT",
    fiscalScope: "Structures, origine des fonds",
    effectiveDate: "2026-06-04",
  },
  {
    id: "term-preferences-durabilite",
    label: "Préférences de durabilité",
    category: "Adéquation",
    status: "simulation simple",
    certainty: "fait établi",
    sourceIds: ["src-amf-durabilite-2022", "src-amf-mif2-adequation"],
    reviewRequired: false,
    userFacingExplanation:
      "Le recueil des préférences ESG doit rejoindre le questionnaire patrimonial et le rapport d'adéquation.",
    synonyms: ["ESG", "durabilité", "préférences extra-financières"],
    legalScope: "MIF II / CIF",
    fiscalScope: "Adéquation conseil",
    effectiveDate: "2026-06-04",
  },
  {
    id: "term-scenario-stress",
    label: "Stress test patrimonial",
    category: "Simulation",
    status: "démo simulée",
    certainty: "analyse",
    sourceIds: ["src-banque-france-sca-2022", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "La plateforme doit tester liquidité, cession, décès, taux et contraintes documentaires.",
    synonyms: ["scénario défavorable", "test de robustesse"],
    legalScope: "Méthode produit",
    fiscalScope: "Hypothèses et rapport",
    effectiveDate: "2026-06-04",
  },
  {
    id: "term-piste-audit",
    label: "Piste d'audit",
    category: "Preuves",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-cnil-registre-traitements", "src-amf-mif2-adequation"],
    reviewRequired: false,
    userFacingExplanation:
      "Chaque calcul doit garder sa règle, sa source, sa date et l'action professionnelle associée.",
    synonyms: ["audit trail", "journal de preuve"],
    legalScope: "Traçabilité",
    fiscalScope: "Calcul et restitution",
    effectiveDate: "2026-06-04",
  },
];

export const wealthStructures: WealthStructure[] = [
  {
    id: "structure-pea",
    label: "PEA",
    category: "Enveloppe mobilière",
    status: "simulation simple",
    certainty: "fait établi",
    sourceIds: ["src-service-public-pea-2026"],
    reviewRequired: false,
    userFacingExplanation:
      "Retrait après cinq ans, plafond et fiscalité doivent être affichés comme événements datés.",
    typicalUse: "Investissement actions européennes long terme.",
    modelFields: ["date d'ouverture", "plafond versé", "gains retirés", "type de retrait"],
    vigilance: "Éligibilité titres, retrait avant cinq ans, décès et plafond.",
  },
  {
    id: "structure-per",
    label: "PER",
    category: "Retraite",
    status: "simulation simple",
    certainty: "fait établi",
    sourceIds: ["src-service-public-per-deduction-2026", "src-impots-epargne-retraite-2026"],
    reviewRequired: false,
    userFacingExplanation:
      "La déduction doit suivre plafond disponible, reliquats, mutualisation et sortie future.",
    typicalUse: "Préparation retraite avec déduction potentielle à l'entrée.",
    modelFields: ["versements", "plafond annuel", "reliquats", "mutualisation conjoint"],
    vigilance: "Sortie retraite, cas de déblocage, origine des versements.",
  },
  {
    id: "structure-assurance-vie",
    label: "Assurance-vie",
    category: "Enveloppe assurance",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "Le contrat exige bénéficiaires, primes, rachats, antériorité et supports documentés.",
    typicalUse: "Capitalisation, allocation et transmission.",
    modelFields: ["souscripteur", "assuré", "bénéficiaires", "primes", "rachats"],
    vigilance: "Clause bénéficiaire, primes manifestement exagérées, supports non cotés.",
  },
  {
    id: "structure-sci",
    label: "SCI",
    category: "Structure immobilière",
    status: "revue obligatoire",
    certainty: "analyse",
    sourceIds: ["src-legifrance-code-civil-transmission", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "La SCI doit être modélisée comme entité avec parts, comptes courants, dettes et gouvernance.",
    typicalUse: "Détention collective d'immobilier et organisation familiale.",
    modelFields: ["associés", "parts", "immeubles", "dettes", "comptes courants"],
    vigilance: "Responsabilité des associés, régime IR/IS, démembrement de parts.",
  },
  {
    id: "structure-indivision",
    label: "Indivision",
    category: "Détention collective",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-legifrance-code-civil-transmission"],
    reviewRequired: true,
    userFacingExplanation:
      "Les quote-parts et règles de décision doivent être visibles avant toute simulation.",
    typicalUse: "Détention simple à plusieurs ou succession.",
    modelFields: ["quote-parts", "charges", "conventions", "mandats"],
    vigilance: "Conflits de gouvernance et consentements.",
  },
  {
    id: "structure-holding",
    label: "Holding patrimoniale",
    category: "Structure dirigeant",
    status: "revue obligatoire",
    certainty: "revue obligatoire",
    sourceIds: ["src-legifrance-holding-tax-2026", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "La holding est utile en démonstration, mais chaque qualification fiscale exige validation.",
    typicalUse: "Centralisation de participations et flux de dividendes.",
    modelFields: ["participations", "revenus passifs", "contrôle", "actifs non professionnels"],
    vigilance: "Régime fiscal, conventions intragroupe, actifs mixtes, IFI.",
  },
  {
    id: "structure-trust",
    label: "Trust / structure étrangère",
    category: "International sensible",
    status: "hors MVP",
    certainty: "revue obligatoire",
    sourceIds: ["src-eurlex-dac6-2018-822", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "La démo doit savoir reconnaître le risque et sortir du mode automatique.",
    typicalUse: "Détention internationale ou protection patrimoniale.",
    modelFields: ["settlor", "trustee", "bénéficiaires", "pays", "flux"],
    vigilance: "Transparence, bénéficiaire effectif, obligations déclaratives.",
  },
];

export const complianceSignals: ComplianceSignal[] = [
  {
    id: "signal-kyc",
    label: "KYC et identité",
    category: "Connaissance client",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-eurlex-aml-2015-849"],
    reviewRequired: false,
    userFacingExplanation:
      "Le dossier doit conserver identité, rôle, résidence fiscale et justificatifs attendus.",
    trigger: "Ouverture ou mise à jour d'un dossier cabinet.",
    evidenceExpected: "Pièce d'identité, résidence fiscale, mandat ou lettre de mission.",
    nextControl: "Comparer identité, foyer fiscal et documents reçus.",
  },
  {
    id: "signal-beneficial-owner",
    label: "Bénéficiaire effectif",
    category: "LCB-FT",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "Toute entité impose de comprendre qui contrôle économiquement la structure.",
    trigger: "SCI, holding, société interposée ou structure étrangère.",
    evidenceExpected: "Statuts, registre des bénéficiaires effectifs, organigramme.",
    nextControl: "Escalader si chaîne de détention indirecte.",
  },
  {
    id: "signal-durability",
    label: "Durabilité AMF",
    category: "Adéquation",
    status: "simulation simple",
    certainty: "fait établi",
    sourceIds: ["src-amf-durabilite-2022", "src-amf-mif2-adequation"],
    reviewRequired: false,
    userFacingExplanation:
      "Les préférences de durabilité rejoignent objectifs, horizon, risque et adéquation.",
    trigger: "Préparation d'une recommandation financière.",
    evidenceExpected: "Questionnaire préférences de durabilité.",
    nextControl: "Afficher dans le rapport d'adéquation.",
  },
  {
    id: "signal-cross-border",
    label: "Transparence fiscale",
    category: "DAC6/DAC7",
    status: "revue obligatoire",
    certainty: "analyse",
    sourceIds: ["src-eurlex-dac6-2018-822", "src-eurlex-dac7-2021-514"],
    reviewRequired: true,
    userFacingExplanation:
      "Les flux ou structures transfrontières ne doivent pas être traités en automatique.",
    trigger: "Compte étranger, flux récurrent international, trust ou plateforme.",
    evidenceExpected: "Pays, contrepartie, justificatif, finalité économique.",
    nextControl: "Revue avocat fiscaliste.",
  },
  {
    id: "signal-open-banking-consent",
    label: "Consentement API / SCA",
    category: "Import simulé",
    status: "démo simulée",
    certainty: "fait établi",
    sourceIds: ["src-eurlex-sca-2018-389", "src-banque-france-sca-2022"],
    reviewRequired: false,
    userFacingExplanation:
      "La V2.3 illustre le parcours sans connecter de banque réelle ni stocker de secret.",
    trigger: "Import bancaire simulé depuis le laboratoire.",
    evidenceExpected: "Consentement, horodatage, canal SCA, périmètre des comptes.",
    nextControl: "Brancher un connecteur seulement après auth, consentement et audit.",
  },
];

export const manualReviewFlags: ManualReviewFlag[] = [
  {
    id: "flag-trust-foreign-structure",
    label: "Trust ou structure étrangère",
    category: "International",
    status: "hors MVP",
    certainty: "revue obligatoire",
    sourceIds: ["src-eurlex-dac6-2018-822", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "Le produit reconnaît le risque, mais ne qualifie pas automatiquement la fiscalité internationale.",
    riskLevel: "critique",
    trigger: "Structure étrangère, trustee, bénéficiaire non résident ou flux transfrontière.",
    whyNoAutomation: "Les obligations déclaratives et conventions applicables dépassent la démo.",
    requiredProfessional: "avocat",
  },
  {
    id: "flag-private-assets",
    label: "Valorisation non cotée",
    category: "Actifs",
    status: "revue obligatoire",
    certainty: "analyse",
    sourceIds: ["src-legifrance-dutreil-2026", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "Les titres non cotés et actifs professionnels exigent justificatifs et méthode de valorisation.",
    riskLevel: "élevé",
    trigger: "Titres PME, holding, private equity ou actif sans prix observable.",
    whyNoAutomation: "La valeur n'est pas observable et peut changer l'assiette fiscale.",
    requiredProfessional: "expert-comptable",
  },
  {
    id: "flag-complex-dismemberment",
    label: "Démembrement sophistiqué",
    category: "Transmission",
    status: "revue obligatoire",
    certainty: "revue obligatoire",
    sourceIds: ["src-impots-donation-usufruit", "src-legifrance-code-civil-transmission"],
    reviewRequired: true,
    userFacingExplanation:
      "La démo traite un cas simple, mais pas les chaînes de droits, quasi-usufruits ou clauses complexes.",
    riskLevel: "élevé",
    trigger: "Nue-propriété, usufruit, quasi-usufruit ou donation-partage non documentée.",
    whyNoAutomation: "Les conséquences civiles et fiscales doivent être relues par acte.",
    requiredProfessional: "notaire",
  },
  {
    id: "flag-holding-passive-income",
    label: "Holding à revenus passifs",
    category: "Dirigeant",
    status: "revue obligatoire",
    certainty: "analyse",
    sourceIds: ["src-legifrance-holding-tax-2026", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "Les critères de contrôle, revenus passifs et actifs non professionnels ne doivent pas être conclus seuls.",
    riskLevel: "élevé",
    trigger: "Holding > 5 M€, revenus passifs, contrôle personne physique ou actifs somptuaires.",
    whyNoAutomation: "La qualification dépend de l'inventaire et de la réalité économique.",
    requiredProfessional: "avocat",
  },
  {
    id: "flag-foreign-account",
    label: "Compte ou flux étranger",
    category: "Transparence",
    status: "revue obligatoire",
    certainty: "analyse",
    sourceIds: ["src-eurlex-dac7-2021-514", "src-eurlex-dac6-2018-822"],
    reviewRequired: true,
    userFacingExplanation:
      "Le dossier doit afficher l'alerte et demander les justificatifs avant toute simulation partageable.",
    riskLevel: "moyen",
    trigger: "IBAN étranger, virement récurrent hors France ou plateforme étrangère.",
    whyNoAutomation: "Le motif fiscal pur et les obligations déclaratives doivent être isolés.",
    requiredProfessional: "avocat",
  },
  {
    id: "flag-missing-document",
    label: "Justificatif manquant",
    category: "Preuves",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-cnil-registre-traitements", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "Sans justificatif, le résultat reste une hypothèse et ne peut pas devenir un livrable validé.",
    riskLevel: "moyen",
    trigger: "Actif, dette, contrat ou clause bénéficiaire sans document rattaché.",
    whyNoAutomation: "Le calcul peut être juste mathématiquement mais faux juridiquement.",
    requiredProfessional: "cgp",
  },
];

export const cabinetActionPlanSteps: CabinetActionPlanStep[] = [
  {
    id: "action-collecter",
    label: "Collecter les faits",
    category: "Parcours cabinet",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-eurlex-sca-2018-389", "src-cnil-registre-traitements"],
    reviewRequired: false,
    userFacingExplanation:
      "Centraliser foyer, actifs, passifs, documents, consentements et dates d'effet.",
    order: 1,
    verb: "Collecter",
    dataUsed: ["foyer", "documents", "actifs", "passifs", "consentements"],
    risk: "moyen",
    nextAction: "Ouvrir l'onboarding et la collecte documentaire.",
    href: "/dossiers",
  },
  {
    id: "action-qualifier",
    label: "Qualifier les enveloppes",
    category: "Parcours cabinet",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-service-public-pea-2026", "src-service-public-per-deduction-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Séparer fait importé et qualification fiscale pour éviter de figer une interprétation fragile.",
    order: 2,
    verb: "Qualifier",
    dataUsed: ["PEA", "PER", "SCI", "holding", "assurance-vie"],
    risk: "élevé",
    nextAction: "Contrôler les structures et flags de revue.",
    href: "/cabinet#patrimonial-model",
  },
  {
    id: "action-simuler",
    label: "Simuler les scénarios",
    category: "Parcours cabinet",
    status: "simulation simple",
    certainty: "analyse",
    sourceIds: ["src-service-public-pea-2026", "src-impots-epargne-retraite-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Chaque simulation expose formule, source, limite et action professionnelle.",
    order: 3,
    verb: "Simuler",
    dataUsed: ["hypothèses", "règles versionnées", "sources", "limites"],
    risk: "moyen",
    nextAction: "Tester PEA, PER ou import simulé dans le laboratoire.",
    href: "/simulations",
  },
  {
    id: "action-controler",
    label: "Contrôler les alertes",
    category: "Parcours cabinet",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-eurlex-aml-2015-849", "src-eurlex-dac6-2018-822"],
    reviewRequired: true,
    userFacingExplanation:
      "Les signaux sensibles sortent du mode automatique et imposent une revue humaine.",
    order: 4,
    verb: "Contrôler",
    dataUsed: ["KYC", "bénéficiaire effectif", "flux", "documents", "structures"],
    risk: "critique",
    nextAction: "Ouvrir les preuves et la piste d'audit.",
    href: "/evidence",
  },
  {
    id: "action-restituer",
    label: "Restituer sans surpromesse",
    category: "Parcours cabinet",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-amf-mif2-adequation", "src-cnil-registre-traitements"],
    reviewRequired: true,
    userFacingExplanation:
      "Le rapport distingue fait, hypothèse, règle et recommandation, puis attend validation.",
    order: 5,
    verb: "Restituer",
    dataUsed: ["résultats", "sources", "limites", "questions ouvertes"],
    risk: "élevé",
    nextAction: "Générer le rapport cabinet V2.3.",
    href: "/report",
  },
];

export const demoConnectorImport: DemoConnectorImport = {
  id: "demo-connector-import",
  label: "Import bancaire simulé",
  category: "Connectivité",
  status: "démo simulée",
  certainty: "hypothèse",
  sourceIds: ["src-eurlex-sca-2018-389", "src-banque-france-sca-2022", "src-eurlex-aml-2015-849"],
  reviewRequired: true,
  userFacingExplanation:
    "La démo montre le chemin API/SCA sans connecter de banque réelle, sans secret et sans donnée bancaire personnelle.",
  steps: [
    {
      label: "Consentement",
      status: "simulé",
      detail: "Périmètre des comptes et finalité de simulation horodatés.",
    },
    {
      label: "Authentification forte",
      status: "à brancher",
      detail: "SCA réelle reportée au jalon connecteur.",
    },
    {
      label: "Transactions normalisées",
      status: "simulé",
      detail: "Libellés fictifs transformés en flux assurance-vie, PER, SCI et prêt.",
    },
    {
      label: "Alertes",
      status: "revue requise",
      detail: "Flux étranger et justificatif manquant déclenchent la revue.",
    },
  ],
  detectedEnvelopes: ["Assurance-vie", "PER", "SCI", "Prêt immobilier"],
  alerts: ["Virement récurrent vers IBAN étranger", "Contrat assurance-vie à rattacher"],
};

export const reportMethodItems: ReportMethodItem[] = [
  {
    id: "method-fact",
    label: "Fait importé ou déclaré",
    meaning: "Donnée brute fournie par le client, une fixture ou un document.",
    reportRule: "Afficher la qualité de donnée et le justificatif attendu.",
  },
  {
    id: "method-hypothesis",
    label: "Hypothèse",
    meaning: "Paramètre choisi pour tester un scénario, non opposable.",
    reportRule: "Montrer l'impact et conserver la possibilité de le modifier.",
  },
  {
    id: "method-rule",
    label: "Règle",
    meaning: "Traitement fiscal ou réglementaire relié à une source datée.",
    reportRule: "Afficher source, version, date de contrôle et limite.",
  },
  {
    id: "method-recommendation",
    label: "Recommandation",
    meaning: "Action de travail proposée au cabinet, jamais validation automatique.",
    reportRule: "Exiger une revue professionnelle avant remise client.",
  },
];

export function calculatePerDeduction({
  voluntaryPayments,
  annualCeiling,
  unusedCeilings,
  spouseMutualization = 0,
}: {
  voluntaryPayments: number;
  annualCeiling: number;
  unusedCeilings: number[];
  spouseMutualization?: number;
}) {
  const availableCeiling =
    annualCeiling + unusedCeilings.reduce((sum, amount) => sum + amount, 0) + spouseMutualization;
  const deductionUsed = Math.min(voluntaryPayments, availableCeiling);
  const excessPayment = Math.max(0, voluntaryPayments - deductionUsed);

  return {
    availableCeiling,
    deductionUsed,
    excessPayment,
  };
}
