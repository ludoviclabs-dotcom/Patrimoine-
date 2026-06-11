export const cabinetStatuses = [
  "Brouillon",
  "Donnée simulée",
  "À renseigner",
  "À documenter",
  "À vérifier",
  "Simulation indicative",
  "Revue requise",
  "Validé cabinet",
  "Bloqué",
  "Hors couverture",
] as const;

export type CabinetStatus = (typeof cabinetStatuses)[number];
export type CabinetCertainty = "fait documente" | "hypothese" | "regle sourcee" | "simulation indicative" | "action professionnelle";
export type RiskTone = "low" | "medium" | "high" | "critical";

export type CabinetFixtureBase = {
  id: string;
  label: string;
  category: string;
  status: CabinetStatus;
  certainty: CabinetCertainty;
  sourceIds: string[];
  reviewRequired: boolean;
  userFacingExplanation: string;
};

export type StatusDictionaryEntry = {
  id: CabinetStatus;
  label: CabinetStatus;
  tone: "neutral" | "success" | "warning" | "danger" | "teal";
  meaning: string;
};

export type CabinetDecisionCard = CabinetFixtureBase & {
  metric: string;
  helper: string;
  href: string;
};

export type CabinetTask = CabinetFixtureBase & {
  order: number;
  owner: "assistant cabinet" | "conseiller" | "client" | "professionnel externe";
  dueLabel: string;
  href: string;
  dataUsed: string[];
  nextAction: string;
  risk: RiskTone;
};

export type DossierWorkspaceTab = CabinetFixtureBase & {
  href: string;
  summary: string;
  expectedItems: string[];
  blockers: string[];
};

export type SimulationCatalogItem = CabinetFixtureBase & {
  scenarioParam: string;
  aliases: string[];
  href: string;
  activeLabel: string;
  dataUsed: string;
  hypothesis: string;
  rule: string;
  limit: string;
  reviewGate: string;
};

export type ReviewQueueItem = CabinetFixtureBase & {
  severity: RiskTone;
  professional: "CGP" | "notaire" | "avocat" | "expert-comptable";
  trigger: string;
  blockingReason: string;
  nextAction: string;
  href: string;
};

export type ReportConclusionCard = CabinetFixtureBase & {
  audience: "client" | "conseiller";
  dataUsed: string;
  hypothesis: string;
  rule: string;
  limit: string;
  reviewAction: string;
};

export const statusDictionary: StatusDictionaryEntry[] = [
  {
    id: "Brouillon",
    label: "Brouillon",
    tone: "neutral",
    meaning: "La donnee existe dans la demo, mais elle ne doit pas etre reprise comme element valide.",
  },
  {
    id: "Donnée simulée",
    label: "Donnée simulée",
    tone: "teal",
    meaning: "La donnee est pedagogique et ne provient pas d'un connecteur ou justificatif reel.",
  },
  {
    id: "À renseigner",
    label: "À renseigner",
    tone: "warning",
    meaning: "Le cabinet doit completer le champ avant de lancer une conclusion partageable.",
  },
  {
    id: "À documenter",
    label: "À documenter",
    tone: "warning",
    meaning: "Une piece ou une preuve est attendue avant la revue professionnelle.",
  },
  {
    id: "À vérifier",
    label: "À vérifier",
    tone: "warning",
    meaning: "La simulation peut etre lue, mais un controle metier reste necessaire.",
  },
  {
    id: "Simulation indicative",
    label: "Simulation indicative",
    tone: "teal",
    meaning: "Le resultat aide a preparer le rendez-vous et ne vaut pas conseil.",
  },
  {
    id: "Revue requise",
    label: "Revue requise",
    tone: "danger",
    meaning: "Un professionnel doit valider le point avant rapport exploitable.",
  },
  {
    id: "Validé cabinet",
    label: "Validé cabinet",
    tone: "success",
    meaning: "Le cabinet a relu et accepte le point dans le contexte de demo.",
  },
  {
    id: "Bloqué",
    label: "Bloqué",
    tone: "danger",
    meaning: "Le parcours ne doit pas conclure tant que le blocage n'est pas leve.",
  },
  {
    id: "Hors couverture",
    label: "Hors couverture",
    tone: "neutral",
    meaning: "La demo sait signaler le risque, mais ne le traite pas automatiquement.",
  },
];

export const cabinetDecisionCards: CabinetDecisionCard[] = [
  {
    id: "decision-active-dossier",
    label: "Dossier actif",
    category: "Accueil cabinet",
    status: "Simulation indicative",
    certainty: "fait documente",
    sourceIds: ["src-service-public-ifi-2026", "src-service-public-pfu-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Claire et Marc servent de dossier fil rouge pour tester collecte, simulation, preuve, revue et rapport.",
    metric: "Claire et Marc",
    helper: "IFI, PFU 2026, transmission et enveloppes patrimoniales a relire.",
    href: "/dossiers",
  },
  {
    id: "decision-priority-actions",
    label: "Actions prioritaires",
    category: "Accueil cabinet",
    status: "À documenter",
    certainty: "action professionnelle",
    sourceIds: ["src-cnil-registre-traitements", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation:
      "La demo doit montrer la prochaine action utile avant d'exposer les details techniques.",
    metric: "5 actions",
    helper: "Pieces, hypothese plus-value, adequation produit et validation rapport.",
    href: "/review",
  },
  {
    id: "decision-review-alerts",
    label: "Alertes à revoir",
    category: "Accueil cabinet",
    status: "Revue requise",
    certainty: "simulation indicative",
    sourceIds: ["src-bofip-plus-value-immobiliere", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation:
      "Les cas sensibles restent visibles comme alertes, pas comme recommandations automatiques.",
    metric: "4 blocages",
    helper: "Plus-value, holding, LCB-FT et succession demandent une revue explicite.",
    href: "/review",
  },
];

export const cabinetTaskQueue: CabinetTask[] = [
  {
    id: "task-open-dossier",
    label: "Ouvrir le dossier",
    category: "Parcours cabinet",
    status: "Donnée simulée",
    certainty: "fait documente",
    sourceIds: ["src-cnil-registre-traitements"],
    reviewRequired: false,
    userFacingExplanation: "Le conseiller part d'un dossier demo structure avant toute simulation.",
    order: 1,
    owner: "assistant cabinet",
    dueLabel: "Maintenant",
    href: "/dossiers",
    dataUsed: ["foyer", "actifs", "passifs", "objectifs"],
    nextAction: "Verifier la synthese et les documents attendus.",
    risk: "low",
  },
  {
    id: "task-run-simulation",
    label: "Simuler le scenario prioritaire",
    category: "Parcours cabinet",
    status: "Simulation indicative",
    certainty: "simulation indicative",
    sourceIds: ["src-bofip-plus-value-immobiliere"],
    reviewRequired: true,
    userFacingExplanation: "Le scenario plus-value doit etre testable directement par URL.",
    order: 2,
    owner: "conseiller",
    dueLabel: "Rendez-vous",
    href: "/simulations?scenario=plus-value",
    dataUsed: ["prix de cession", "prix d'acquisition", "duree de detention"],
    nextAction: "Lancer la simulation plus-value et lire la limite de couverture.",
    risk: "medium",
  },
  {
    id: "task-check-evidence",
    label: "Verifier les preuves",
    category: "Parcours cabinet",
    status: "À vérifier",
    certainty: "regle sourcee",
    sourceIds: ["src-service-public-pfu-2026", "src-economie-cdhr-2026"],
    reviewRequired: true,
    userFacingExplanation: "Chaque regle importante doit montrer source, date, perimetre et statut.",
    order: 3,
    owner: "conseiller",
    dueLabel: "Avant rapport",
    href: "/evidence",
    dataUsed: ["source officielle", "version de regle", "date de controle"],
    nextAction: "Controler les sources en revue et les regles liees.",
    risk: "medium",
  },
  {
    id: "task-human-review",
    label: "Passer en revue humaine",
    category: "Parcours cabinet",
    status: "Revue requise",
    certainty: "action professionnelle",
    sourceIds: ["src-amf-mif2-adequation", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation: "Le produit bloque les conclusions sensibles tant qu'un professionnel n'a pas tranche.",
    order: 4,
    owner: "professionnel externe",
    dueLabel: "Obligatoire",
    href: "/review",
    dataUsed: ["alertes", "documents manquants", "role professionnel"],
    nextAction: "Assigner les alertes a CGP, notaire, avocat ou expert-comptable.",
    risk: "high",
  },
  {
    id: "task-prepare-report",
    label: "Preparer le rapport",
    category: "Parcours cabinet",
    status: "À vérifier",
    certainty: "action professionnelle",
    sourceIds: ["src-cnil-profiling-automated-decision", "src-amf-cif-orias-2026"],
    reviewRequired: true,
    userFacingExplanation: "Le livrable separe la synthese client et l'annexe conseiller.",
    order: 5,
    owner: "conseiller",
    dueLabel: "Apres revue",
    href: "/report",
    dataUsed: ["conclusions", "sources", "limites", "actions de revue"],
    nextAction: "Lire les limites avant toute remise client.",
    risk: "high",
  },
];

export const dossierWorkspaceTabs: DossierWorkspaceTab[] = [
  {
    id: "tab-summary",
    label: "Synthese",
    category: "Dossier client",
    status: "Simulation indicative",
    certainty: "fait documente",
    sourceIds: ["src-service-public-ifi-2026"],
    reviewRequired: true,
    userFacingExplanation: "Vue courte du foyer, du patrimoine, des objectifs et des blocages.",
    href: "/dossiers#synthese",
    summary: "Claire et Marc, dirigeants, patrimoine immobilier et financier a arbitrer.",
    expectedItems: ["foyer", "objectifs", "prochaines actions"],
    blockers: ["rapport non valide", "sources en revue"],
  },
  {
    id: "tab-household",
    label: "Foyer",
    category: "Dossier client",
    status: "À vérifier",
    certainty: "fait documente",
    sourceIds: ["src-cnil-registre-traitements"],
    reviewRequired: false,
    userFacingExplanation: "Le foyer relie personnes, residence fiscale, roles et consentements.",
    href: "/dossiers#foyer",
    summary: "Deux adultes, deux enfants, residence fiscale France, roles a confirmer.",
    expectedItems: ["identite", "residence fiscale", "regime matrimonial"],
    blockers: ["regime matrimonial a confirmer"],
  },
  {
    id: "tab-wealth",
    label: "Patrimoine",
    category: "Dossier client",
    status: "À documenter",
    certainty: "hypothese",
    sourceIds: ["src-service-public-ifi-2026", "src-bofip-plus-value-immobiliere"],
    reviewRequired: true,
    userFacingExplanation: "Actifs, passifs, enveloppes et vehicules sont cartographies avant calcul.",
    href: "/dossiers#patrimoine",
    summary: "Immobilier, SCI, holding, PEA, PER, assurance-vie et liquidites.",
    expectedItems: ["actifs", "passifs", "enveloppes", "vehicules"],
    blockers: ["valeurs immobilières à contrôler", "holding à qualifier"],
  },
  {
    id: "tab-documents",
    label: "Documents",
    category: "Dossier client",
    status: "À documenter",
    certainty: "action professionnelle",
    sourceIds: ["src-cnil-registre-traitements", "src-service-public-succession-declaration-2025"],
    reviewRequired: true,
    userFacingExplanation: "La demo montre les pieces attendues sans stocker de vrais documents sensibles.",
    href: "/dossiers#documents",
    summary: "Titres, releves, avis, clauses et justificatifs a cocher.",
    expectedItems: ["avis fiscal", "titre immobilier", "contrat assurance-vie", "statuts SCI"],
    blockers: ["justificatifs manquants"],
  },
  {
    id: "tab-simulations",
    label: "Simulations",
    category: "Dossier client",
    status: "Simulation indicative",
    certainty: "simulation indicative",
    sourceIds: ["src-bofip-plus-value-immobiliere", "src-service-public-per-deduction-2026"],
    reviewRequired: true,
    userFacingExplanation: "Les simulations sont reliees au dossier mais restent indicatives.",
    href: "/simulations?scenario=plus-value",
    summary: "Plus-value, PER, succession, liquidite et adequation produit.",
    expectedItems: ["hypotheses", "resultat", "limite", "source"],
    blockers: ["pas de conclusion sans revue"],
  },
  {
    id: "tab-audit",
    label: "Audit",
    category: "Dossier client",
    status: "À vérifier",
    certainty: "regle sourcee",
    sourceIds: ["src-cnil-rgpd-privacy-by-design", "src-amf-mif2-adequation"],
    reviewRequired: true,
    userFacingExplanation: "L'audit conserve source, date, action et limite de couverture.",
    href: "/evidence",
    summary: "Regles versionnees, preuves et decisions humaines.",
    expectedItems: ["source", "date", "regle", "decision"],
    blockers: ["preuve a relire"],
  },
];

export const simulationCatalog: SimulationCatalogItem[] = [
  {
    id: "simulation-ir-bareme",
    label: "IR barème 2026",
    category: "Simuler",
    status: "Simulation indicative",
    certainty: "regle sourcee",
    sourceIds: ["src-service-public-bareme-ir-2026", "src-economie-decote-ir-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Calcule l'impôt 2026 au barème : quotient familial plafonné, décote, CEHR et CDHR.",
    scenarioParam: "ir",
    aliases: ["ir-bareme", "impot-revenu"],
    href: "/simulations?scenario=ir",
    activeLabel: "Nouveau moteur V3",
    dataUsed: "Revenu imposable, situation du foyer, demi-parts enfants, RFR.",
    hypothesis: "Cas standard : pas de demi-parts spéciales ni de revenus exceptionnels.",
    rule: "Barème 2026 service-public F1419 et décote economie.gouv (règle versionnée).",
    limit: "Crédits d'impôt, réductions et cas particuliers non automatisés.",
    reviewGate: "Revue avocat fiscaliste avant toute remise client.",
  },
  {
    id: "simulation-pfu-arbitrage",
    label: "PFU vs barème",
    category: "Simuler",
    status: "Revue requise",
    certainty: "simulation indicative",
    sourceIds: ["src-service-public-pfu-2026", "src-legifrance-lfss-2026-ps-capital"],
    reviewRequired: true,
    userFacingExplanation:
      "Compare flat tax 31,4 % et option barème (abattements, PS 18,6 %, CSG déductible).",
    scenarioParam: "pfu",
    aliases: ["pfu-arbitrage", "flat-tax"],
    href: "/simulations?scenario=pfu",
    activeLabel: "Nouveau moteur V3",
    dataUsed: "Dividendes, plus-values mobilières, TMI, date d'acquisition des titres.",
    hypothesis: "Option barème globale et irrévocable pour l'année ; assurance-vie exclue (reste à 30 %).",
    rule: "PFU 31,4 % (LFSS 2026) et abattements barème (règle versionnée).",
    limit: "L'effet CSG déductible joue en N+1 et n'est pas déduit du total de l'année.",
    reviewGate: "Revue avocat fiscaliste sur l'avis d'imposition complet.",
  },
  {
    id: "simulation-plus-value",
    label: "Plus-value immobiliere",
    category: "Simuler",
    status: "Simulation indicative",
    certainty: "regle sourcee",
    sourceIds: ["src-bofip-plus-value-immobiliere"],
    reviewRequired: true,
    userFacingExplanation: "Teste prix, frais, travaux, duree de detention et cas residence principale.",
    scenarioParam: "plus-value",
    aliases: ["plus-value-immo", "vente-immobiliere"],
    href: "/simulations?scenario=plus-value",
    activeLabel: "Scenario prioritaire",
    dataUsed: "Prix de cession, prix d'acquisition, frais, travaux, duree de detention.",
    hypothesis: "Hors cas complexe, hors indivision litigieuse, hors residence principale contestee.",
    rule: "BOFiP plus-values immobilieres des particuliers.",
    limit: "Abattements, surtaxe et exonérations doivent etre verifies par le conseiller.",
    reviewGate: "Revue avocat ou notaire si structure complexe.",
  },
  {
    id: "simulation-demembrement",
    label: "Démembrement art. 669",
    category: "Simuler",
    status: "Revue requise",
    certainty: "regle sourcee",
    sourceIds: ["src-legifrance-cgi-669-2026", "src-impots-dmtg-bareme-2026"],
    reviewRequired: true,
    userFacingExplanation:
      "Valorise usufruit viager ou temporaire (art. 669) et chiffre les droits sur la nue-propriété.",
    scenarioParam: "demembrement",
    aliases: ["usufruit", "nue-propriete"],
    href: "/simulations?scenario=demembrement",
    activeLabel: "Nouveau moteur V3",
    dataUsed: "Âge de l'usufruitier ou durée fixe, valeur en pleine propriété, lien de parenté.",
    hypothesis: "Démembrement simple, hors chaînes complexes et quasi-usufruit.",
    rule: "Art. 669 CGI (viager et temporaire 23 %/décennie) + barème DMTG art. 777.",
    limit: "À l'IFI, l'usufruitier déclare en principe la pleine propriété (art. 968).",
    reviewGate: "Revue notaire avant tout acte de démembrement.",
  },
  {
    id: "simulation-dutreil",
    label: "Pacte Dutreil",
    category: "Simuler",
    status: "Revue requise",
    certainty: "simulation indicative",
    sourceIds: ["src-legifrance-dutreil-2026"],
    reviewRequired: true,
    userFacingExplanation: "Mesure la sensibilite aux actifs eligibles et aux engagements documentes.",
    scenarioParam: "dutreil",
    aliases: ["transmission-entreprise"],
    href: "/simulations?scenario=dutreil",
    activeLabel: "Transmission dirigeant",
    dataUsed: "Valeur entreprise, actifs eligibles, engagements, duree.",
    hypothesis: "Les engagements sont declares comme hypotheses et non comme pieces validees.",
    rule: "LF 2026 art. 8 et regle Dutreil versionnee.",
    limit: "Eligibilite operationnelle et engagements imposent une revue professionnelle.",
    reviewGate: "Revue avocat fiscaliste.",
  },
  {
    id: "simulation-holding",
    label: "Taxe holding",
    category: "Simuler",
    status: "Revue requise",
    certainty: "simulation indicative",
    sourceIds: ["src-legifrance-holding-tax-2026", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation: "Rend visible le risque lie aux actifs passifs et au controle physique.",
    scenarioParam: "holding-tax",
    aliases: ["holding"],
    href: "/simulations?scenario=holding-tax",
    activeLabel: "Structure dirigeant",
    dataUsed: "Actifs, revenus passifs, controle, biens somptuaires.",
    hypothesis: "Structure simplifiee, conventions intragroupe non modelisees.",
    rule: "Regle holding 2026 et vigilance beneficiaire effectif.",
    limit: "Qualification fiscale, IFI et LCB-FT restent hors automatisation definitive.",
    reviewGate: "Revue avocat et expert-comptable.",
  },
  {
    id: "simulation-pea",
    label: "PEA retrait apres 5 ans",
    category: "Simuler",
    status: "Simulation indicative",
    certainty: "regle sourcee",
    sourceIds: ["src-service-public-pea-2026"],
    reviewRequired: true,
    userFacingExplanation: "Distingue IR indicatif à zéro et prélèvements sociaux à contrôler.",
    scenarioParam: "pea",
    aliases: ["pea-withdrawal"],
    href: "/simulations?scenario=pea",
    activeLabel: "Enveloppe mobiliere",
    dataUsed: "Age du plan, gains retires, taux social, retrait partiel.",
    hypothesis: "Le plan est suppose eligible et correctement documente.",
    rule: "Service-Public PEA.",
    limit: "Eligibilite titres, cloture et historique exact a verifier.",
    reviewGate: "Revue CGP.",
  },
  {
    id: "simulation-per",
    label: "PER deduction",
    category: "Simuler",
    status: "Simulation indicative",
    certainty: "regle sourcee",
    sourceIds: ["src-service-public-per-deduction-2026", "src-impots-epargne-retraite-2026"],
    reviewRequired: true,
    userFacingExplanation: "Calcule min(versement, plafond disponible) avec reliquats et mutualisation.",
    scenarioParam: "per",
    aliases: ["per-deduction"],
    href: "/simulations?scenario=per",
    activeLabel: "Retraite",
    dataUsed: "Versements, plafond, reliquats, mutualisation conjoint.",
    hypothesis: "Plafond et reliquats sont declares par le conseiller.",
    rule: "Service-Public PER et impots.gouv epargne retraite.",
    limit: "Sortie future et fiscalite finale non arbitrees automatiquement.",
    reviewGate: "Revue CGP.",
  },
  {
    id: "simulation-bank-import",
    label: "Import bancaire simule",
    category: "Simuler",
    status: "Donnée simulée",
    certainty: "hypothese",
    sourceIds: ["src-eurlex-sca-2018-389", "src-banque-france-sca-2022"],
    reviewRequired: true,
    userFacingExplanation: "Explique consentement, comptes, transactions et alertes sans connecteur reel.",
    scenarioParam: "bank-import",
    aliases: ["import-bancaire"],
    href: "/simulations?scenario=bank-import",
    activeLabel: "Pedagogie connecteur",
    dataUsed: "Flux fictif, aucun secret bancaire.",
    hypothesis: "Consentement et SCA sont simules.",
    rule: "DSP2/SCA en demonstration.",
    limit: "Aucun acces bancaire reel, aucune conservation de secret.",
    reviewGate: "Revue conformite avant tout branchement.",
  },
  {
    id: "simulation-succession",
    label: "Succession simple",
    category: "Simuler",
    status: "À documenter",
    certainty: "simulation indicative",
    sourceIds: ["src-service-public-succession-declaration-2025", "src-service-public-succession-rights-2024"],
    reviewRequired: true,
    userFacingExplanation: "Structure actif brut, donations, documents, notaire et paiement.",
    scenarioParam: "succession-checklist",
    aliases: ["succession"],
    href: "/simulations?scenario=succession-checklist",
    activeLabel: "Transmission",
    dataUsed: "Actif brut, enfants, donations, documents recus.",
    hypothesis: "Abattements et droits sont indicatifs.",
    rule: "Service-Public succession.",
    limit: "Notaire obligatoire pour cas reels avec immobilier ou dispositions.",
    reviewGate: "Revue notaire.",
  },
  {
    id: "simulation-per-exit",
    label: "PER sortie anticipee",
    category: "Simuler",
    status: "À vérifier",
    certainty: "simulation indicative",
    sourceIds: ["src-service-public-per-release-2025", "src-bofip-per-fiscal-regime-2026"],
    reviewRequired: true,
    userFacingExplanation: "Separe versements et gains pour un achat de residence principale.",
    scenarioParam: "per-early-exit",
    aliases: ["per-sortie"],
    href: "/simulations?scenario=per-early-exit",
    activeLabel: "Retraite",
    dataUsed: "Capital debloque, versements, gains, deduction a l'entree.",
    hypothesis: "Residence principale et origine des versements sont supposees.",
    rule: "Service-Public PER sortie anticipee et BOFiP regime PER.",
    limit: "Fiscalite indicative, confirmation documentaire requise.",
    reviewGate: "Revue CGP.",
  },
  {
    id: "simulation-liquidity",
    label: "Stress liquidite succession",
    category: "Simuler",
    status: "Revue requise",
    certainty: "simulation indicative",
    sourceIds: ["src-service-public-succession-rights-2024"],
    reviewRequired: true,
    userFacingExplanation: "Compare droits estimes, cash disponible, reserve et delai de cession.",
    scenarioParam: "succession-liquidity-stress",
    aliases: ["stress-liquidite"],
    href: "/simulations?scenario=succession-liquidity-stress",
    activeLabel: "Stress test",
    dataUsed: "Droits estimes, liquidites, reserve, delai de cession.",
    hypothesis: "Droits et delais sont des hypothèses de stress.",
    rule: "Service-Public droits de succession.",
    limit: "Ne remplace pas un plan de financement notarial.",
    reviewGate: "Revue notaire.",
  },
  {
    id: "simulation-adequacy",
    label: "Adequation produit",
    category: "Simuler",
    status: "Revue requise",
    certainty: "action professionnelle",
    sourceIds: ["src-amf-mif2-adequation", "src-amf-durabilite-2022"],
    reviewRequired: true,
    userFacingExplanation: "Verifie horizon, risque, durabilite et marche cible sans recommandation automatique.",
    scenarioParam: "product-adequacy",
    aliases: ["adequation-produit"],
    href: "/simulations?scenario=product-adequacy",
    activeLabel: "Conformite conseil",
    dataUsed: "Horizon, risque client, risque produit, durabilite, marche cible.",
    hypothesis: "Questionnaire et justificatifs sont pedagogiques.",
    rule: "AMF adequation MIF2 et preferences de durabilite.",
    limit: "Aucune recommandation personnalisee n'est produite automatiquement.",
    reviewGate: "Revue CGP/CIF.",
  },
];

export const reviewQueueItems: ReviewQueueItem[] = [
  {
    id: "review-plus-value",
    label: "Plus-value immobilière à qualifier",
    category: "Revue",
    status: "Revue requise",
    certainty: "simulation indicative",
    sourceIds: ["src-bofip-plus-value-immobiliere"],
    reviewRequired: true,
    userFacingExplanation: "La vente immobiliere concentre donnees, duree de detention et exemptions possibles.",
    severity: "high",
    professional: "notaire",
    trigger: "Cession immobiliere avec frais et travaux declares.",
    blockingReason: "Residence principale, indivision ou justificatifs travaux peuvent changer le resultat.",
    nextAction: "Controler titre, historique, residence principale et justificatifs avant rapport.",
    href: "/simulations?scenario=plus-value",
  },
  {
    id: "review-holding-lcbft",
    label: "Holding et beneficiaire effectif",
    category: "Revue",
    status: "Bloqué",
    certainty: "action professionnelle",
    sourceIds: ["src-legifrance-holding-tax-2026", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation: "Le produit detecte le risque mais refuse de qualifier seul la structure.",
    severity: "critical",
    professional: "avocat",
    trigger: "Holding, controle personne physique et actifs passifs.",
    blockingReason: "LCB-FT, conventions et qualification fiscale ne sont pas automatisables en demo.",
    nextAction: "Assigner une revue avocat et expert-comptable.",
    href: "/review#review-holding-lcbft",
  },
  {
    id: "review-product-adequacy",
    label: "Adequation produit non alignee",
    category: "Revue",
    status: "Revue requise",
    certainty: "action professionnelle",
    sourceIds: ["src-amf-mif2-adequation", "src-amf-durabilite-2022"],
    reviewRequired: true,
    userFacingExplanation: "Un ecart entre risque client, produit et durabilite bloque toute recommandation.",
    severity: "high",
    professional: "CGP",
    trigger: "Risque produit superieur au profil ou durabilite non documentee.",
    blockingReason: "Le produit ne peut pas transformer une simulation en conseil personnalise.",
    nextAction: "Documenter le questionnaire et la decision du conseiller.",
    href: "/simulations?scenario=product-adequacy",
  },
  {
    id: "review-successession-cash",
    label: "Liquidite succession insuffisante",
    category: "Revue",
    status: "À vérifier",
    certainty: "hypothese",
    sourceIds: ["src-service-public-succession-rights-2024"],
    reviewRequired: true,
    userFacingExplanation: "Un stress test peut signaler un deficit de cash sans trancher le financement.",
    severity: "medium",
    professional: "notaire",
    trigger: "Droits estimes superieurs au cash disponible apres reserve.",
    blockingReason: "Le delai de cession et les modalites de paiement doivent etre valides.",
    nextAction: "Preparer une discussion notaire sur fractionnement, differement ou cession.",
    href: "/simulations?scenario=succession-liquidity-stress",
  },
];

export const reportConclusionCards: ReportConclusionCard[] = [
  {
    id: "report-client-summary",
    label: "Synthese client",
    category: "Rapport",
    status: "Simulation indicative",
    certainty: "simulation indicative",
    sourceIds: ["src-service-public-ifi-2026", "src-bofip-plus-value-immobiliere"],
    reviewRequired: true,
    userFacingExplanation: "Lecture courte, comprehensible, sans jargon de moteur fiscal.",
    audience: "client",
    dataUsed: "Patrimoine, objectifs, scenarios et alertes de revue.",
    hypothesis: "Les donnees restent celles du dossier demo.",
    rule: "Regles fiscales versionnees affichees en annexe.",
    limit: "Pas de conseil definitif sans validation du cabinet.",
    reviewAction: "Faire signer ou valider la note par le professionnel competent.",
  },
  {
    id: "report-adviser-annex",
    label: "Annexe conseiller",
    category: "Rapport",
    status: "À vérifier",
    certainty: "regle sourcee",
    sourceIds: ["src-service-public-pfu-2026", "src-economie-cdhr-2026", "src-amf-cif-orias-2026"],
    reviewRequired: true,
    userFacingExplanation: "Lecture detaillee avec source, date, hypothese, calcul, limite et action.",
    audience: "conseiller",
    dataUsed: "Etapes de calcul, sources, limites et decisions de revue.",
    hypothesis: "Chaque hypothese doit rester visible et datee.",
    rule: "Regle sourcee avec identifiant de version.",
    limit: "Les cas hors couverture restent dans la file de revue.",
    reviewAction: "Archiver la decision et les pieces dans le dossier cabinet.",
  },
  {
    id: "report-no-auto-conclusion",
    label: "Pourquoi le produit ne conclut pas seul",
    category: "Rapport",
    status: "Revue requise",
    certainty: "action professionnelle",
    sourceIds: ["src-cnil-profiling-automated-decision", "src-amf-mif2-adequation", "src-eurlex-aml-2015-849"],
    reviewRequired: true,
    userFacingExplanation: "Le rapport explique les garde-fous : conseil, RGPD, LCB-FT et cas complexes.",
    audience: "conseiller",
    dataUsed: "Drapeaux de revue, sources conformite et limites de couverture.",
    hypothesis: "La demo n'active aucune decision automatisee.",
    rule: "Separation information, simulation et conseil personnalise.",
    limit: "Les recommandations restent reservees au cabinet.",
    reviewAction: "Lever les blocages avant toute conclusion client.",
  },
];

export function getSimulationByParam(param?: string | null) {
  if (!param) return null;
  return simulationCatalog.find((item) => item.scenarioParam === param || item.aliases.includes(param)) ?? null;
}
