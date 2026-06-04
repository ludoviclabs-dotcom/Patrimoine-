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

export type ReportCoverageStatus = "implémenté" | "partiel" | "à simuler" | "hors MVP";

export type SourceCoverageItem = DisplayableFixture & {
  reportTheme: string;
  feature: string;
  testHref: string;
  pageLabel: string;
  coverageStatus: ReportCoverageStatus;
  reviewGate: string;
};

export type LifeEventPlaybook = DisplayableFixture & {
  objective: string;
  href: string;
  questions: string[];
  documentIds: string[];
  risks: string[];
  nextAction: string;
};

export type DocumentChecklistItem = DisplayableFixture & {
  lifeEventId: string;
  expectedDocument: string;
  whyItMatters: string;
  fallbackIfMissing: string;
};

export type RegulatoryRiskControl = DisplayableFixture & {
  trigger: string;
  control: string;
  mitigation: string;
  owner: "cabinet" | "client" | "editeur";
};

export type LegalVehicleGraphNode = DisplayableFixture & {
  nodeType: "personne" | "actif" | "passif" | "enveloppe" | "vehicule" | "document" | "consentement";
  linksTo: string[];
  dataCaptured: string[];
};

export type StressTestPlaybook = DisplayableFixture & {
  shock: string;
  observedMetric: string;
  triggerThreshold: string;
  nextAction: string;
};

export type RoadmapMilestone = DisplayableFixture & {
  version: string;
  horizon: string;
  deliverables: string[];
  productRisk: string;
};

export type ClientAdvisorReportSection = DisplayableFixture & {
  audience: "client" | "conseiller";
  contentBlocks: string[];
  proofExpectation: string;
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

export const sourceCoverageMatrix: SourceCoverageItem[] = [
  {
    id: "coverage-report-dossier-360",
    label: "Dossier patrimonial 360",
    category: "Dossier",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-cnil-rgpd-privacy-by-design", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "Le rapport demande un dossier foyer, personnes, actifs, passifs, enveloppes, véhicules, documents et consentements.",
    reportTheme: "Dossier vivant et structuré",
    feature: "Modèle foyer + actifs + passifs + enveloppes + véhicules + documents",
    testHref: "/dossiers#life-events",
    pageLabel: "Dossiers",
    coverageStatus: "implémenté",
    reviewGate: "Revue cabinet avant restitution client.",
  },
  {
    id: "coverage-report-life-events",
    label: "Entrée par événements de vie",
    category: "Parcours",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-service-public-succession-declaration-2025", "src-service-public-per-deduction-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Le test commence par l'objectif du client plutôt que par un formulaire fiscal monolithique.",
    reportTheme: "Progressive disclosure",
    feature: "Six playbooks : retraite, transmission, vente, conjoint, IFI, enveloppes",
    testHref: "/dossiers#life-events",
    pageLabel: "Dossiers",
    coverageStatus: "implémenté",
    reviewGate: "Questions conditionnelles et documents attendus.",
  },
  {
    id: "coverage-report-regulatory-native",
    label: "Conformité native",
    category: "Conformité",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-amf-cif-orias-2026", "src-amf-lcb-ft-2021", "src-cnil-profiling-automated-decision"],
    reviewRequired: true,
    userFacingExplanation:
      "RGPD, KYC, LCB-FT, bénéficiaire effectif, CIF et profilage sont visibles comme garde-fous du parcours.",
    reportTheme: "Conformité et garde-fous",
    feature: "Contrôles réglementaires + refus de recommandation automatique",
    testHref: "/review",
    pageLabel: "Review",
    coverageStatus: "partiel",
    reviewGate: "Qualification professionnelle et habilitations à valider hors démo.",
  },
  {
    id: "coverage-report-simulations",
    label: "Stress tests et simulations V2.4",
    category: "Simulation",
    status: "simulation simple",
    certainty: "analyse",
    sourceIds: ["src-service-public-succession-declaration-2025", "src-service-public-per-release-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "Les scénarios succession, PER, liquidité et adéquation deviennent testables sans API ni IA runtime.",
    reportTheme: "Simulation déterministe",
    feature: "Succession simple, PER sortie anticipée, stress liquidité, adéquation produit",
    testHref: "/simulations?scenario=succession-checklist",
    pageLabel: "Simulations",
    coverageStatus: "implémenté",
    reviewGate: "Chaque résultat reste indicatif et sourcé.",
  },
  {
    id: "coverage-report-evidence",
    label: "Sources, règles et limites",
    category: "Preuves",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-service-public-succession-rights-2024", "src-bofip-per-fiscal-regime-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Le rapport exige pour chaque conclusion une donnée, une hypothèse, une règle, une source, une limite et une action.",
    reportTheme: "Auditabilité",
    feature: "Evidence Center + RuleVersion + CoverageLimit + TaxRun",
    testHref: "/evidence",
    pageLabel: "Evidence",
    coverageStatus: "implémenté",
    reviewGate: "Contrôle de validité des sources avant remise.",
  },
  {
    id: "coverage-report-connectors",
    label: "Connecteurs, OCR et IA runtime",
    category: "Hors MVP",
    status: "hors MVP",
    certainty: "fait établi",
    sourceIds: ["src-acpr-dsp2-api-2025", "src-acpr-dora-2026", "src-cnil-rgpd-privacy-by-design"],
    reviewRequired: true,
    userFacingExplanation:
      "Le rapport évoque ces capacités, mais la V2.4 les garde en simulation pédagogique sans donnée sensible réelle.",
    reportTheme: "Roadmap produit",
    feature: "Open banking, OCR, IA, auth réelle, stockage documentaire, Postgres",
    testHref: "/workflow",
    pageLabel: "Workflow",
    coverageStatus: "hors MVP",
    reviewGate: "A brancher seulement après sécurité, consentement, AIPD et exploitation.",
  },
  {
    id: "coverage-report-reporting",
    label: "Reporting double niveau",
    category: "Rapport",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-amf-mif2-adequation", "src-cnil-profiling-automated-decision"],
    reviewRequired: true,
    userFacingExplanation:
      "La synthèse client reste pédagogique, l'annexe conseiller conserve les règles, sources et points de revue.",
    reportTheme: "Restitution",
    feature: "Synthèse client + annexe conseiller + pourquoi le produit ne conclut pas seul",
    testHref: "/report",
    pageLabel: "Report",
    coverageStatus: "implémenté",
    reviewGate: "Signature ou validation humaine obligatoire.",
  },
];

export const documentChecklistItems: DocumentChecklistItem[] = [
  {
    id: "doc-tax-notice",
    label: "Avis d'impôt",
    category: "Fiscalité",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-impots-epargne-retraite-2026"],
    reviewRequired: false,
    userFacingExplanation:
      "L'avis d'impôt sert à vérifier plafonds PER, foyer fiscal et cohérence des revenus déclarés.",
    lifeEventId: "life-retraite",
    expectedDocument: "Dernier avis d'impôt complet",
    whyItMatters: "Il contient les plafonds et reliquats utiles aux simulations retraite.",
    fallbackIfMissing: "Marquer le résultat comme hypothèse et demander le document avant rapport.",
  },
  {
    id: "doc-family-record",
    label: "Livret de famille et état civil",
    category: "Transmission",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-service-public-succession-declaration-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "La composition familiale conditionne réserve, quotité disponible, bénéficiaires et revue notaire.",
    lifeEventId: "life-transmettre",
    expectedDocument: "Livret de famille, actes d'état civil et informations enfants",
    whyItMatters: "La liquidation successorale dépend du lien familial et des héritiers.",
    fallbackIfMissing: "Conserver seulement une cartographie indicative.",
  },
  {
    id: "doc-property-title",
    label: "Titre de propriété",
    category: "Immobilier",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-service-public-indivision-2025", "src-bofip-plus-value-immobiliere"],
    reviewRequired: true,
    userFacingExplanation:
      "Le titre clarifie propriétaire, quote-part, date d'acquisition et points de plus-value.",
    lifeEventId: "life-vendre-bien",
    expectedDocument: "Titre de propriété, prix d'acquisition, travaux et frais",
    whyItMatters: "Sans date et valeur d'acquisition, la simulation de cession reste fragile.",
    fallbackIfMissing: "Demander l'acte notarié et afficher la cession comme non validée.",
  },
  {
    id: "doc-marriage-contract",
    label: "Contrat de mariage ou PACS",
    category: "Conjoint",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-service-public-succession-declaration-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "La protection du conjoint dépend du régime matrimonial, des clauses et donations entre époux.",
    lifeEventId: "life-proteger-conjoint",
    expectedDocument: "Contrat de mariage, PACS, donation entre époux ou testament",
    whyItMatters: "Les droits du conjoint ne se déduisent pas d'une simple situation déclarée.",
    fallbackIfMissing: "Bloquer toute conclusion successorale automatique.",
  },
  {
    id: "doc-real-estate-debt",
    label: "Tableaux de prêts immobiliers",
    category: "IFI",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-service-public-ifi-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Les dettes rattachées à l'immobilier doivent être justifiées avant d'être déduites.",
    lifeEventId: "life-reduire-ifi",
    expectedDocument: "Tableaux d'amortissement et contrats de prêt",
    whyItMatters: "La base IFI dépend de la valeur immobilière nette et de la dette admissible.",
    fallbackIfMissing: "Afficher une base brute et demander validation avocat/CGP.",
  },
  {
    id: "doc-envelope-statements",
    label: "Relevés PEA, PER, assurance-vie et CTO",
    category: "Enveloppes",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-service-public-pea-2026", "src-service-public-per-release-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "Chaque enveloppe doit être rattachée à son antériorité, ses versements et ses règles de sortie.",
    lifeEventId: "life-ordonner-enveloppes",
    expectedDocument: "Relevés et conditions fiscales des enveloppes détenues",
    whyItMatters: "PEA, PER, assurance-vie et CTO n'ont pas les mêmes événements fiscaux.",
    fallbackIfMissing: "Classer l'enveloppe en donnée déclarée, non validée.",
  },
];

export const lifeEventPlaybooks: LifeEventPlaybook[] = [
  {
    id: "life-retraite",
    label: "Préparer la retraite",
    category: "Objectif client",
    status: "simulation simple",
    certainty: "analyse",
    sourceIds: ["src-service-public-per-deduction-2026", "src-service-public-per-release-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "Le parcours relie horizon, revenus futurs, PER, enveloppes et capacité de sortie sans conseil automatique.",
    objective: "Préparer la retraite",
    href: "/simulations?scenario=per-deduction",
    questions: ["Quel horizon de départ ?", "Quels versements PER sont déductibles ?", "Sortie capital ou rente à discuter ?"],
    documentIds: ["doc-tax-notice", "doc-envelope-statements"],
    risks: ["Plafond PER mal lu", "Sortie future non anticipée", "Effort d'épargne incompatible avec liquidité"],
    nextAction: "Tester PER déduction puis ajouter la sortie anticipée si résidence principale.",
  },
  {
    id: "life-transmettre",
    label: "Transmettre",
    category: "Objectif client",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-service-public-succession-declaration-2025", "src-service-public-rapport-fiscal-succession-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "Transmission et succession imposent une lecture familiale, documentaire et notariale avant toute conclusion.",
    objective: "Transmettre",
    href: "/simulations?scenario=succession-checklist",
    questions: ["Qui sont les héritiers ?", "Quelles donations antérieures ?", "Y a-t-il testament, assurance-vie ou démembrement ?"],
    documentIds: ["doc-family-record", "doc-marriage-contract", "doc-envelope-statements"],
    risks: ["Donation antérieure oubliée", "Clause bénéficiaire non relue", "Liquidité insuffisante pour droits"],
    nextAction: "Lancer succession simple puis stress liquidité succession.",
  },
  {
    id: "life-vendre-bien",
    label: "Vendre un bien",
    category: "Objectif client",
    status: "simulation simple",
    certainty: "analyse",
    sourceIds: ["src-bofip-plus-value-immobiliere", "src-service-public-indivision-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "La vente exige titre, prix, travaux, durée de détention et qualification résidence principale ou non.",
    objective: "Vendre un bien",
    href: "/simulations?scenario=plus-value",
    questions: ["Résidence principale ?", "Depuis combien de temps le bien est détenu ?", "Quels travaux sont justifiés ?"],
    documentIds: ["doc-property-title", "doc-real-estate-debt"],
    risks: ["Plus-value mal qualifiée", "Indivision ou SCI non modélisée", "Travaux non justifiés"],
    nextAction: "Simuler la plus-value puis signaler les pièces manquantes.",
  },
  {
    id: "life-proteger-conjoint",
    label: "Protéger le conjoint",
    category: "Objectif client",
    status: "revue obligatoire",
    certainty: "analyse",
    sourceIds: ["src-service-public-succession-declaration-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "La protection du conjoint dépend d'actes et de clauses que le produit ne peut pas présumer.",
    objective: "Protéger le conjoint",
    href: "/dossiers#montage-patrimonial",
    questions: ["Quel régime matrimonial ?", "Y a-t-il donation entre époux ?", "Quels contrats désignent le conjoint ?"],
    documentIds: ["doc-marriage-contract", "doc-envelope-statements"],
    risks: ["Clause bénéficiaire obsolète", "Enfants d'unions différentes", "Démembrement mal compris"],
    nextAction: "Cartographier droits, bénéficiaires et documents avant rendez-vous notaire.",
  },
  {
    id: "life-reduire-ifi",
    label: "Réduire risque IFI",
    category: "Objectif client",
    status: "simulation simple",
    certainty: "analyse",
    sourceIds: ["src-service-public-ifi-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Le produit détecte l'exposition immobilière, mais les arbitrages restent à valider professionnellement.",
    objective: "Réduire risque IFI",
    href: "/simulations?scenario=ifi",
    questions: ["Quels biens sont imposables ?", "Quelles dettes sont rattachées ?", "SCI ou détention directe ?"],
    documentIds: ["doc-property-title", "doc-real-estate-debt"],
    risks: ["Dette non déductible", "SCI mal valorisée", "Actif professionnel à qualifier"],
    nextAction: "Relancer IFI avec preuves attachées et limite de couverture visible.",
  },
  {
    id: "life-ordonner-enveloppes",
    label: "Mettre de l'ordre dans les enveloppes",
    category: "Objectif client",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-service-public-pea-2026", "src-service-public-per-release-2025", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "Le test distingue fiscalité, horizon, risque, durabilité et justificatifs de chaque enveloppe.",
    objective: "Mettre de l'ordre dans les enveloppes",
    href: "/simulations?scenario=product-adequacy",
    questions: ["Quel horizon ?", "Quelle tolérance au risque ?", "Quelles préférences de durabilité ?", "Quels retraits prévus ?"],
    documentIds: ["doc-envelope-statements", "doc-tax-notice"],
    risks: ["Produit hors marché cible", "Horizon incompatible", "Retrait fiscalement mal anticipé"],
    nextAction: "Tester adéquation produit simulée et ouvrir la revue humaine.",
  },
];

export const regulatoryRiskControls: RegulatoryRiskControl[] = [
  {
    id: "control-rgpd-minimisation",
    label: "RGPD et minimisation",
    category: "Données",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-cnil-rgpd-privacy-by-design", "src-cnil-aipd"],
    reviewRequired: true,
    userFacingExplanation:
      "Le produit explique pourquoi les données sensibles restent en fixtures dans cette tranche.",
    trigger: "Collecte foyer, patrimoine, santé financière ou documents privés.",
    control: "Limiter les champs, tracer la finalité et distinguer démo de stockage réel.",
    mitigation: "AIPD et registre avant auth, base et stockage documentaire.",
    owner: "editeur",
  },
  {
    id: "control-lcb-ft-origin",
    label: "LCB-FT et origine des fonds",
    category: "Conformité",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-amf-lcb-ft-2021", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "Les flux inhabituels ou structures interposées doivent déclencher une revue, pas une conclusion.",
    trigger: "Flux étranger, apport important, holding, trust ou justificatif manquant.",
    control: "Identifier origine des fonds et bénéficiaire effectif.",
    mitigation: "Escalade cabinet et blocage du rapport validé.",
    owner: "cabinet",
  },
  {
    id: "control-cif-advice-boundary",
    label: "Frontière information / conseil",
    category: "CIF / ORIAS",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-amf-cif-orias-2026", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "La démo peut informer et simuler, mais elle ne délivre pas une recommandation personnalisée autonome.",
    trigger: "Produit ou allocation proposée à un client identifié.",
    control: "Afficher adéquation, raisons, limites et validation humaine.",
    mitigation: "Rapport d'adéquation en brouillon non signé.",
    owner: "cabinet",
  },
  {
    id: "control-ai-profiling",
    label: "IA, profilage et décision automatisée",
    category: "Gouvernance",
    status: "hors MVP",
    certainty: "fait établi",
    sourceIds: ["src-cnil-profiling-automated-decision", "src-eu-ai-act-transparency"],
    reviewRequired: true,
    userFacingExplanation:
      "Aucun runtime IA n'est branché ; si l'IA revient, elle devra citer, s'abstenir et passer par revue.",
    trigger: "Scoring, recommandation ou décision produite automatiquement.",
    control: "Interdire décision finale automatique et exposer les critères.",
    mitigation: "Mode brouillon, citations obligatoires, validation humaine.",
    owner: "editeur",
  },
  {
    id: "control-dora-dsp2",
    label: "DORA / DSP2 simulés",
    category: "Connecteurs",
    status: "hors MVP",
    certainty: "fait établi",
    sourceIds: ["src-acpr-dora-2026", "src-acpr-dsp2-api-2025", "src-eurlex-sca-2018-389"],
    reviewRequired: true,
    userFacingExplanation:
      "Open banking et résilience restent en roadmap ; la V2.4 ne traite aucune donnée bancaire réelle.",
    trigger: "Connexion banque, API de paiement ou incident fournisseur.",
    control: "Consentement, SCA, traçabilité, résilience et procédure incident.",
    mitigation: "Limiter la V2.4 à un import pédagogique.",
    owner: "editeur",
  },
  {
    id: "control-cyber-storage",
    label: "Cyber et stockage documentaire",
    category: "Sécurité",
    status: "hors MVP",
    certainty: "analyse",
    sourceIds: ["src-anssi-hygiene-2017", "src-anssi-backup-2023"],
    reviewRequired: true,
    userFacingExplanation:
      "Le rapport prépare les exigences de sécurité sans activer de stockage sensible réel.",
    trigger: "Document fiscal, identité, contrat ou mandat à conserver.",
    control: "Chiffrement, sauvegarde, contrôle d'accès et réversibilité.",
    mitigation: "Ne stocker que des fixtures tant que le socle n'est pas audité.",
    owner: "editeur",
  },
];

export const legalVehicleGraph: LegalVehicleGraphNode[] = [
  {
    id: "graph-household",
    label: "Foyer fiscal",
    category: "Foyer",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-cnil-rgpd-privacy-by-design"],
    reviewRequired: false,
    userFacingExplanation:
      "Le foyer relie personnes, résidence fiscale, objectifs et consentements de démonstration.",
    nodeType: "personne",
    linksTo: ["graph-spouse-a", "graph-spouse-b", "graph-children", "graph-consents"],
    dataCaptured: ["résidence fiscale", "objectifs", "horizon", "personnes rattachées"],
  },
  {
    id: "graph-spouse-a",
    label: "Dirigeant",
    category: "Personne",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-amf-mif2-adequation"],
    reviewRequired: false,
    userFacingExplanation:
      "Le profil dirigeant permet de relier revenus, holding, risques et scénarios de transmission.",
    nodeType: "personne",
    linksTo: ["graph-holding", "graph-per", "graph-pea"],
    dataCaptured: ["revenus", "fonction", "horizon", "tolérance au risque"],
  },
  {
    id: "graph-spouse-b",
    label: "Conjoint",
    category: "Personne",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-service-public-succession-declaration-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "Le conjoint est rattaché aux droits successoraux, clauses et objectifs de protection.",
    nodeType: "personne",
    linksTo: ["graph-main-home", "graph-life-insurance"],
    dataCaptured: ["régime matrimonial", "droits", "bénéficiaires"],
  },
  {
    id: "graph-main-home",
    label: "Résidence principale",
    category: "Actif",
    status: "modélisé",
    certainty: "fait établi",
    sourceIds: ["src-service-public-ifi-2026", "src-bofip-plus-value-immobiliere"],
    reviewRequired: true,
    userFacingExplanation:
      "L'actif immobilier porte des effets IFI, succession, dette et cession.",
    nodeType: "actif",
    linksTo: ["graph-real-estate-debt", "graph-property-title"],
    dataCaptured: ["valeur", "mode de détention", "dette", "date d'acquisition"],
  },
  {
    id: "graph-holding",
    label: "Holding patrimoniale",
    category: "Véhicule",
    status: "revue obligatoire",
    certainty: "revue obligatoire",
    sourceIds: ["src-legifrance-holding-tax-2026", "src-amf-lcb-ft-2021"],
    reviewRequired: true,
    userFacingExplanation:
      "La holding est visible comme véhicule, mais sa qualification fiscale reste hors automatisation.",
    nodeType: "vehicule",
    linksTo: ["graph-company-shares", "graph-beneficial-owner"],
    dataCaptured: ["participations", "contrôle", "revenus passifs", "bénéficiaires effectifs"],
  },
  {
    id: "graph-pea",
    label: "PEA",
    category: "Enveloppe",
    status: "simulation simple",
    certainty: "fait établi",
    sourceIds: ["src-service-public-pea-2026"],
    reviewRequired: false,
    userFacingExplanation:
      "Le PEA conserve date d'ouverture, gains et type de retrait pour le laboratoire.",
    nodeType: "enveloppe",
    linksTo: ["graph-envelope-statements"],
    dataCaptured: ["date d'ouverture", "versements", "gains", "retraits"],
  },
  {
    id: "graph-per",
    label: "PER",
    category: "Enveloppe",
    status: "simulation simple",
    certainty: "fait établi",
    sourceIds: ["src-service-public-per-deduction-2026", "src-service-public-per-release-2025"],
    reviewRequired: true,
    userFacingExplanation:
      "Le PER conserve versements, plafond et cas de déblocage à contrôler.",
    nodeType: "enveloppe",
    linksTo: ["graph-tax-notice"],
    dataCaptured: ["plafond", "reliquats", "versements", "mode de sortie"],
  },
  {
    id: "graph-consents",
    label: "Consentements simulés",
    category: "Consentement",
    status: "démo simulée",
    certainty: "fait établi",
    sourceIds: ["src-cnil-rgpd-privacy-by-design", "src-eurlex-sca-2018-389"],
    reviewRequired: false,
    userFacingExplanation:
      "La V2.4 illustre les consentements sans banque réelle ni secret stocké.",
    nodeType: "consentement",
    linksTo: ["graph-envelope-statements"],
    dataCaptured: ["finalité", "périmètre", "horodatage", "statut"],
  },
];

export const stressTestPlaybooks: StressTestPlaybook[] = [
  {
    id: "stress-succession-liquidity",
    label: "Liquidité succession",
    category: "Stress test",
    status: "simulation simple",
    certainty: "hypothèse",
    sourceIds: ["src-service-public-succession-declaration-2025", "src-service-public-succession-rights-2024"],
    reviewRequired: true,
    userFacingExplanation:
      "Le test compare cash disponible et droits estimés sans prétendre liquider la succession.",
    shock: "Décès et droits à payer alors que le patrimoine est peu liquide.",
    observedMetric: "Déficit de liquidité",
    triggerThreshold: "Cash disponible inférieur aux droits estimés et frais réservés.",
    nextAction: "Préparer rendez-vous notaire et options de paiement fractionné/différé à étudier.",
  },
  {
    id: "stress-rate-hike",
    label: "Hausse de taux",
    category: "Stress test",
    status: "démo simulée",
    certainty: "hypothèse",
    sourceIds: ["src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "Le rapport demande de tester la robustesse du cash-flow avant arbitrages patrimoniaux.",
    shock: "Hausse de taux ou refinancement défavorable.",
    observedMetric: "Capacité de remboursement et marge de sécurité",
    triggerThreshold: "Service de dette supérieur à la marge disponible.",
    nextAction: "Revoir dette, liquidité et horizon avant recommandation.",
  },
  {
    id: "stress-market-correction",
    label: "Correction de marché",
    category: "Stress test",
    status: "démo simulée",
    certainty: "hypothèse",
    sourceIds: ["src-amf-mif2-adequation", "src-amf-durabilite-2022"],
    reviewRequired: true,
    userFacingExplanation:
      "L'adéquation ne se limite pas au rendement attendu : elle teste aussi perte tolérable et horizon.",
    shock: "Baisse des actifs financiers avant un besoin de liquidité.",
    observedMetric: "Perte simulée et horizon restant",
    triggerThreshold: "Perte supérieure à la tolérance déclarée ou horizon trop court.",
    nextAction: "Escalader en revue adéquation produit.",
  },
  {
    id: "stress-cashflow-blockage",
    label: "Blocage cash-flow",
    category: "Stress test",
    status: "démo simulée",
    certainty: "hypothèse",
    sourceIds: ["src-cnil-rgpd-privacy-by-design", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "Un dossier peut être fiscalement correct mais impraticable si la trésorerie manque.",
    shock: "Délai de cession, loyers impayés ou dividendes retardés.",
    observedMetric: "Mois de liquidité disponible",
    triggerThreshold: "Réserve de trésorerie inférieure à six mois de besoins déclarés.",
    nextAction: "Documenter besoins, échéances et actifs mobilisables.",
  },
];

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    id: "roadmap-v24-static-demo",
    label: "V2.4 cabinet 360 statique",
    category: "Roadmap",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-cnil-rgpd-privacy-by-design", "src-amf-cif-orias-2026"],
    reviewRequired: false,
    userFacingExplanation:
      "La tranche actuelle couvre le rapport avec fixtures, sans connecteur, IA runtime ni stockage sensible.",
    version: "V2.4",
    horizon: "Immédiat",
    deliverables: ["Couverture rapport", "Événements de vie", "Simulations V2.4", "Rapport double niveau"],
    productRisk: "Démonstrateur riche mais encore sans donnée réelle.",
  },
  {
    id: "roadmap-pilot-cabinet",
    label: "Pilote cabinet contrôlé",
    category: "Roadmap",
    status: "revue obligatoire",
    certainty: "hypothèse",
    sourceIds: ["src-amf-cif-orias-2026", "src-amf-lcb-ft-2021"],
    reviewRequired: true,
    userFacingExplanation:
      "Le pilote doit cadrer périmètre de mission, documents, validation et absence de recommandation automatique.",
    version: "Pilote",
    horizon: "Après tests utilisateurs",
    deliverables: ["Cas pratiques", "Export rapport", "Journal d'audit", "Revues cabinet"],
    productRisk: "Risque de confusion entre simulation et conseil si la revue est mal visible.",
  },
  {
    id: "roadmap-connectors",
    label: "Connecteurs et stockage réel",
    category: "Roadmap",
    status: "hors MVP",
    certainty: "fait établi",
    sourceIds: ["src-acpr-dsp2-api-2025", "src-acpr-dora-2026", "src-anssi-hygiene-2017"],
    reviewRequired: true,
    userFacingExplanation:
      "Open banking, OCR et stockage ne doivent arriver qu'après sécurité, consentement, AIPD et exploitation.",
    version: "V3",
    horizon: "Hors tranche V2.4",
    deliverables: ["Auth", "Consentement réel", "Blob privé", "Postgres", "Monitoring"],
    productRisk: "Risque opérationnel et données sensibles.",
  },
];

export const clientAdvisorReportSections: ClientAdvisorReportSection[] = [
  {
    id: "report-client-summary",
    label: "Synthèse client",
    category: "Rapport",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "La synthèse explique les faits, scénarios et alertes sans langage de liquidation fiscale définitive.",
    audience: "client",
    contentBlocks: ["Objectif du foyer", "Ce qui est connu", "Ce qui manque", "Scénarios testés", "Actions cabinet"],
    proofExpectation: "Chaque phrase sensible renvoie à une source ou à une limite.",
  },
  {
    id: "report-advisor-annex",
    label: "Annexe conseiller",
    category: "Rapport",
    status: "modélisé",
    certainty: "analyse",
    sourceIds: ["src-cnil-rgpd-privacy-by-design", "src-amf-cif-orias-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "L'annexe conserve données, hypothèses, règles, sources, dates, limites et points de revue.",
    audience: "conseiller",
    contentBlocks: ["Données utilisées", "Hypothèses", "Règles versionnées", "Limites", "Revue professionnelle"],
    proofExpectation: "Aucune conclusion n'est livrable sans validation humaine.",
  },
  {
    id: "report-no-auto-conclusion",
    label: "Pourquoi le produit ne conclut pas seul",
    category: "Garde-fou",
    status: "revue obligatoire",
    certainty: "fait établi",
    sourceIds: ["src-cnil-profiling-automated-decision", "src-amf-lcb-ft-2021", "src-amf-cif-orias-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Conseil personnalisé, RGPD, IA, LCB-FT et cas complexes imposent un humain responsable.",
    audience: "conseiller",
    contentBlocks: ["Conseil personnalisé", "Profilage/RGPD", "LCB-FT", "International", "Trust, holding, démembrement"],
    proofExpectation: "Le rapport affiche les refus d'automatisation autant que les résultats.",
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
