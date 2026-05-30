export type AtlasCertainty = "fait établi" | "analyse" | "hypothèse" | "débat";

export type AtlasSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
  scope: string;
  evidenceLevel: "source officielle" | "source institutionnelle" | "donnée pédagogique";
  shortQuote: string;
  auditWarning: string;
  description: string;
};

export type FiscalAtlasNode = {
  id: string;
  label: string;
  detail: string;
  type: "main" | "risk" | "friction" | "comparison" | "reform" | "flow";
  certainty: AtlasCertainty;
  sourceIds: string[];
};

export type FiscalAtlasMap = {
  id: string;
  title: string;
  category: string;
  summary: string;
  layout: "hub" | "flow" | "comparison" | "reform" | "loop";
  certainty: AtlasCertainty;
  sourceIds: string[];
  nodes: FiscalAtlasNode[];
  edges: Array<[string, string]>;
  takeaway: string;
  actionLabel: string;
  actionHref: string;
};

export type AtlasCaseStudy = {
  id: string;
  title: string;
  persona: string;
  summary: string;
  certainty: AtlasCertainty;
  sourceIds: string[];
  steps: Array<{
    label: string;
    value: string;
    detail: string;
    certainty: AtlasCertainty;
  }>;
  actionLabel: string;
  actionHref: string;
};

export type PublicMoneyFlow = {
  id: string;
  label: string;
  description: string;
  certainty: AtlasCertainty;
  sourceIds: string[];
};

export type PublicSpendingBreakdown = {
  id: string;
  label: string;
  amountPer1000: number;
  category: "social" | "public-service" | "economy" | "sovereignty" | "future" | "debt";
  description: string;
  certainty: AtlasCertainty;
  sourceIds: string[];
  actionLabel: string;
  actionHref: string;
};

export const atlasSources: AtlasSource[] = [
  {
    id: "src-bercy-aqsmi-2024",
    title: "Comment sont utilisés mes impôts ?",
    publisher: "Ministère de l'Économie, des Finances et de la Souveraineté industrielle et numérique",
    url: "https://www.economie.gouv.fr/aqsmi/comment-sont-utilises-mes-impots",
    checkedAt: "2026-05-30",
    scope: "Ventilation 2024 de 1 000 € d'impôts et cotisations, périmètre administrations publiques.",
    evidenceLevel: "donnée pédagogique",
    shortQuote: "Voici comment sont utilisés 1000 € d'impôts",
    auditWarning:
      "Répartition arrondie et pédagogique : elle explique les ordres de grandeur, pas un budget individuel opposable.",
    description:
      "Répartition pédagogique de 1 000 € d'impôts et de cotisations selon les principales missions publiques.",
  },
  {
    id: "src-budget-gouv-etat",
    title: "Budget de l'État",
    publisher: "Direction du budget",
    url: "https://www.budget.gouv.fr/budget-etat",
    checkedAt: "2026-05-30",
    scope: "Budget de l'État, recettes et dépenses de l'État hors périmètre complet des APU.",
    evidenceLevel: "source officielle",
    shortQuote: "Les recettes de l'État sont l'ensemble des ressources",
    auditWarning:
      "Ne pas confondre budget de l'État et dépense publique totale : Sécurité sociale et collectivités sont hors budget général.",
    description:
      "Point d'entrée officiel pour distinguer le budget de l'État du périmètre plus large des administrations publiques.",
  },
  {
    id: "src-insee-apu-2024",
    title: "Comptes nationaux des administrations publiques 2024",
    publisher: "Insee",
    url: "https://www.insee.fr/fr/statistiques/8574705",
    checkedAt: "2026-05-30",
    scope: "Comptes nationaux 2024 des administrations publiques et sous-secteurs.",
    evidenceLevel: "source officielle",
    shortQuote: "Dépenses et recettes des administrations publiques",
    auditWarning:
      "Cadre macroéconomique : très solide pour les masses, moins parlant pour un cas d'entreprise sans simulation dédiée.",
    description:
      "Cadre de comptabilité nationale pour les recettes, dépenses et soldes des administrations publiques.",
  },
];

export const fiscalAtlasMaps: FiscalAtlasMap[] = [
  {
    id: "boucle-euro-preleve",
    title: "Où va l'euro prélevé ?",
    category: "Dépense publique",
    summary:
      "La fiscalité finance une boucle collective : prélèvement, redistribution, services, infrastructures et bénéfices indirects.",
    layout: "loop",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024", "src-insee-apu-2024"],
    nodes: [
      {
        id: "contribuables",
        label: "Ménages / entreprises",
        detail: "Revenus, consommation, patrimoine et activité économique alimentent les recettes publiques.",
        type: "flow",
        certainty: "fait établi",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "prelevements",
        label: "Impôts, taxes, cotisations",
        detail: "Les cotisations financent surtout la protection sociale ; elles entrent dans les prélèvements obligatoires.",
        type: "risk",
        certainty: "fait établi",
        sourceIds: ["src-bercy-aqsmi-2024", "src-insee-apu-2024"],
      },
      {
        id: "administrations",
        label: "Administrations publiques",
        detail: "État, Sécurité sociale, collectivités et organismes publics transforment les recettes en dépenses.",
        type: "comparison",
        certainty: "fait établi",
        sourceIds: ["src-budget-gouv-etat", "src-insee-apu-2024"],
      },
      {
        id: "services",
        label: "Services + redistribution",
        detail: "Retraites, santé, école, sécurité, justice, transports, recherche et soutiens économiques.",
        type: "reform",
        certainty: "fait établi",
        sourceIds: ["src-bercy-aqsmi-2024"],
      },
      {
        id: "retour-indirect",
        label: "Bénéfices indirects",
        detail: "Capital humain, infrastructures, stabilité sociale et cadre institutionnel soutiennent aussi l'activité.",
        type: "main",
        certainty: "analyse",
        sourceIds: ["src-bercy-aqsmi-2024"],
      },
    ],
    edges: [
      ["contribuables", "prelevements"],
      ["prelevements", "administrations"],
      ["administrations", "services"],
      ["services", "retour-indirect"],
      ["retour-indirect", "contribuables"],
    ],
    takeaway:
      "Cette boucle évite une lecture seulement punitive : un prélèvement est aussi une transformation en droits, services et infrastructures.",
    actionLabel: "Voir la ventilation de 1 000 €",
    actionHref: "/atlas-fiscal#public-money",
  },
  {
    id: "preuve-et-incertitude",
    title: "Ce qui est établi, débattu ou fragile",
    category: "Méthodologie",
    summary:
      "La même interface doit séparer mesure robuste, interprétation économique, hypothèse de scénario et affirmation fragile.",
    layout: "comparison",
    certainty: "analyse",
    sourceIds: ["src-bercy-aqsmi-2024", "src-budget-gouv-etat", "src-insee-apu-2024"],
    nodes: [
      {
        id: "etabli",
        label: "Fait établi",
        detail: "Montant ventilé, source officielle, périmètre explicite et date de contrôle affichée.",
        type: "reform",
        certainty: "fait établi",
        sourceIds: ["src-bercy-aqsmi-2024", "src-insee-apu-2024"],
      },
      {
        id: "debattu",
        label: "Analyse / débat",
        detail: "Effets sur investissement, attractivité ou compétitivité : plausibles, mais dépendants du contexte.",
        type: "comparison",
        certainty: "débat",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "fragile",
        label: "À vérifier / fragile",
        detail: "Chiffre non retraçable, source secondaire, proxy imparfait ou phrase trop générale.",
        type: "friction",
        certainty: "hypothèse",
        sourceIds: ["src-budget-gouv-etat"],
      },
    ],
    edges: [
      ["etabli", "debattu"],
      ["debattu", "fragile"],
    ],
    takeaway:
      "La pédagogie devient crédible quand l'utilisateur voit immédiatement le niveau de preuve derrière chaque affirmation.",
    actionLabel: "Ouvrir les sources",
    actionHref: "/atlas-fiscal#source-audit",
  },
  {
    id: "frictions-fiscalite-francaise",
    title: "Pourquoi la fiscalité paraît lourde",
    category: "Vue d'ensemble",
    summary:
      "Le ressenti ne vient pas d'un impôt isolé, mais d'un empilement de prélèvements, de règles et d'incertitudes.",
    layout: "hub",
    certainty: "analyse",
    sourceIds: ["src-insee-apu-2024", "src-bercy-aqsmi-2024"],
    nodes: [
      {
        id: "centre",
        label: "Fiscalité française",
        detail: "Point d'entrée pour comprendre l'accumulation des prélèvements et contraintes.",
        type: "main",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "niveau",
        label: "Niveau global élevé",
        detail: "Les prélèvements obligatoires agrègent impôts, taxes et cotisations sociales.",
        type: "risk",
        certainty: "fait établi",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "cotisations",
        label: "Cotisations sociales",
        detail: "Elles financent la protection sociale et pèsent dans le coût complet du travail.",
        type: "risk",
        certainty: "fait établi",
        sourceIds: ["src-bercy-aqsmi-2024"],
      },
      {
        id: "production",
        label: "Impôts de production",
        detail: "Ils peuvent peser avant même la constatation d'un bénéfice.",
        type: "friction",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "complexite",
        label: "Complexité normative",
        detail: "Les règles, exceptions et changements créent un coût de conformité.",
        type: "friction",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "attractivite",
        label: "Attractivité et investissement",
        detail: "L'effet causal dépend aussi du secteur, du financement, de l'énergie et du marché.",
        type: "comparison",
        certainty: "débat",
        sourceIds: ["src-insee-apu-2024"],
      },
    ],
    edges: [
      ["centre", "niveau"],
      ["centre", "cotisations"],
      ["centre", "production"],
      ["centre", "complexite"],
      ["centre", "attractivite"],
    ],
    takeaway:
      "Le bon diagnostic sépare le niveau mesuré, le ressenti de complexité et les effets économiques discutés.",
    actionLabel: "Explorer les preuves",
    actionHref: "/atlas-fiscal#source-audit",
  },
  {
    id: "ca-vers-cash-net",
    title: "Du CA au cash vraiment disponible",
    category: "Entreprise",
    summary:
      "Un dirigeant raisonne en trésorerie finale : le chiffre d'affaires traverse plusieurs couches fiscales et sociales.",
    layout: "flow",
    certainty: "analyse",
    sourceIds: ["src-insee-apu-2024", "src-budget-gouv-etat"],
    nodes: [
      {
        id: "ca",
        label: "Chiffre d'affaires",
        detail: "Point de départ économique, avant charges, salaires, taxes et résultat.",
        type: "flow",
        certainty: "fait établi",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "valeur-ajoutee",
        label: "Valeur ajoutée",
        detail: "Base économique qui alimente rémunérations, marges et prélèvements.",
        type: "flow",
        certainty: "fait établi",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "travail",
        label: "Salaires + cotisations",
        detail: "Le coût complet du travail dépasse le salaire net perçu.",
        type: "risk",
        certainty: "fait établi",
        sourceIds: ["src-bercy-aqsmi-2024"],
      },
      {
        id: "production-locale",
        label: "Taxes de production / locales",
        detail: "Certaines charges ne dépendent pas uniquement du bénéfice final.",
        type: "friction",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "resultat",
        label: "Résultat imposable",
        detail: "Le résultat fiscal est calculé après retraitements comptables et fiscaux.",
        type: "flow",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "cash",
        label: "Cash disponible",
        detail: "Ce qui reste pour rémunérer, investir, désendetter ou distribuer.",
        type: "main",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
    ],
    edges: [
      ["ca", "valeur-ajoutee"],
      ["valeur-ajoutee", "travail"],
      ["travail", "production-locale"],
      ["production-locale", "resultat"],
      ["resultat", "cash"],
    ],
    takeaway:
      "La question utile n'est pas seulement le taux d'IS, mais le chemin complet entre activité et liquidité finale.",
    actionLabel: "Lancer une simulation",
    actionHref: "/simulations?scenario=entreprise-cash&from=atlas",
  },
  {
    id: "six-goulots-entreprise",
    title: "Les 6 goulots d'étranglement",
    category: "TPE / PME",
    summary:
      "La pression entrepreneuriale se comprend mieux comme une série de frictions simultanées.",
    layout: "hub",
    certainty: "analyse",
    sourceIds: ["src-insee-apu-2024", "src-bercy-aqsmi-2024"],
    nodes: [
      {
        id: "entreprise",
        label: "Fiscalité entrepreneuriale",
        detail: "Lecture transversale : coût, conformité, risque et asymétrie de moyens.",
        type: "main",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "charges-sociales",
        label: "Charges sociales",
        detail: "Effet direct sur coût du travail et arbitrages d'embauche.",
        type: "risk",
        certainty: "fait établi",
        sourceIds: ["src-bercy-aqsmi-2024"],
      },
      {
        id: "impots-production",
        label: "Impôts de production",
        detail: "Risque de taxe avant bénéfice selon l'assiette retenue.",
        type: "risk",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "fiscalite-locale",
        label: "Fiscalité locale",
        detail: "Exposition territoriale et lisibilité variable selon implantation.",
        type: "friction",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "complexite",
        label: "Complexité",
        detail: "Temps administratif, conseil externe, interprétation et veille.",
        type: "friction",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "controle",
        label: "Contrôle fiscal",
        detail: "Incertitude ressentie, documentation et besoin de traçabilité.",
        type: "friction",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "asymetrie",
        label: "TPE vs grands groupes",
        detail: "Capacité d'optimisation et de contentieux très différente.",
        type: "comparison",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
    ],
    edges: [
      ["entreprise", "charges-sociales"],
      ["entreprise", "impots-production"],
      ["entreprise", "fiscalite-locale"],
      ["entreprise", "complexite"],
      ["entreprise", "controle"],
      ["entreprise", "asymetrie"],
    ],
    takeaway:
      "Cette carte sert de diagnostic d'entretien : elle évite de réduire le sujet à un seul impôt.",
    actionLabel: "Voir les dossiers",
    actionHref: "/atlas-fiscal#cas-pratiques",
  },
  {
    id: "tpe-pme-vs-groupes",
    title: "TPE/PME vs grandes entreprises",
    category: "Comparaison",
    summary:
      "Les mêmes règles n'ont pas le même coût opérationnel selon les ressources fiscales disponibles.",
    layout: "comparison",
    certainty: "analyse",
    sourceIds: ["src-insee-apu-2024", "src-budget-gouv-etat"],
    nodes: [
      {
        id: "grande-entreprise",
        label: "Grande entreprise",
        detail: "Direction fiscale, conseils spécialisés, documentation et arbitrages géographiques.",
        type: "comparison",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "tpe-pme",
        label: "TPE / PME",
        detail: "Temps administratif rare, conseil externe coûteux, trésorerie plus sensible.",
        type: "comparison",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "effet",
        label: "Effet d'asymétrie",
        detail: "Une règle identique peut créer une charge de conformité proportionnellement plus forte.",
        type: "main",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
    ],
    edges: [
      ["grande-entreprise", "effet"],
      ["tpe-pme", "effet"],
    ],
    takeaway:
      "L'interface doit parler de cas concrets, pas de l'entreprise comme bloc homogène.",
    actionLabel: "Ouvrir le cockpit",
    actionHref: "/atlas-fiscal#case-dirigeant-holding",
  },
  {
    id: "scenarios-reforme",
    title: "Réformes et arbitrages",
    category: "Décision publique",
    summary:
      "Toute simplification ou baisse ciblée pose une question de financement, d'équité et de trajectoire.",
    layout: "reform",
    certainty: "débat",
    sourceIds: ["src-bercy-aqsmi-2024", "src-insee-apu-2024"],
    nodes: [
      {
        id: "production",
        label: "Baisser impôts de production",
        detail: "Améliore certains signaux d'investissement, mais nécessite une compensation.",
        type: "reform",
        certainty: "débat",
        sourceIds: ["src-insee-apu-2024"],
      },
      {
        id: "stabilite",
        label: "Stabiliser le cadre",
        detail: "Donne de la visibilité aux décisions de long terme.",
        type: "reform",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "simplifier",
        label: "Simplifier niches et crédits",
        detail: "Réduit le coût de conformité, mais peut retirer des soutiens sectoriels.",
        type: "reform",
        certainty: "débat",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "relation",
        label: "Relation de confiance",
        detail: "Rescrits, documentation et contrôle mieux anticipé.",
        type: "reform",
        certainty: "analyse",
        sourceIds: ["src-budget-gouv-etat"],
      },
      {
        id: "tpe",
        label: "Protéger les TPE/PME",
        detail: "Seuils lisibles et dispositifs simples pour éviter le coût fixe disproportionné.",
        type: "reform",
        certainty: "analyse",
        sourceIds: ["src-insee-apu-2024"],
      },
    ],
    edges: [
      ["production", "stabilite"],
      ["stabilite", "simplifier"],
      ["simplifier", "relation"],
      ["relation", "tpe"],
    ],
    takeaway:
      "La réforme fiscale est un portefeuille d'arbitrages, pas une manette unique.",
    actionLabel: "Comparer les scénarios",
    actionHref: "/scenarios?stress=dette&from=atlas",
  },
];

export const publicMoneyFlows: PublicMoneyFlow[] = [
  {
    id: "contribuables",
    label: "Ménages et entreprises",
    description:
      "Ils versent des impôts, taxes et cotisations selon leurs revenus, consommations, patrimoines et activités.",
    certainty: "fait établi",
    sourceIds: ["src-insee-apu-2024"],
  },
  {
    id: "prelevements",
    label: "Impôts, taxes, cotisations",
    description:
      "Les cotisations sociales ne sont pas juridiquement des impôts, mais entrent dans les prélèvements obligatoires.",
    certainty: "fait établi",
    sourceIds: ["src-insee-apu-2024", "src-bercy-aqsmi-2024"],
  },
  {
    id: "administrations",
    label: "Administrations publiques",
    description:
      "Le périmètre complet regroupe l'État, la Sécurité sociale, les collectivités et divers organismes publics.",
    certainty: "fait établi",
    sourceIds: ["src-budget-gouv-etat", "src-insee-apu-2024"],
  },
  {
    id: "usages",
    label: "Services, redistribution, dette",
    description:
      "Les recettes financent protection sociale, services publics, investissement collectif et intérêts de dette.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
  },
];

export const publicSpendingBreakdown: PublicSpendingBreakdown[] = [
  {
    id: "protection-sociale",
    label: "Protection sociale",
    amountPer1000: 561,
    category: "social",
    description:
      "Retraites, santé, famille, emploi, logement et solidarité : le premier poste du périmètre complet.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Relier aux services publics",
    actionHref: "/atlas-fiscal#case-foyer-contribuable",
  },
  {
    id: "education",
    label: "Éducation",
    amountPer1000: 88,
    category: "public-service",
    description:
      "Écoles, collèges, lycées, enseignement supérieur et politiques éducatives.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Voir le périmètre",
    actionHref: "/atlas-fiscal#source-audit",
  },
  {
    id: "fonctionnement",
    label: "Fonctionnement administratif",
    amountPer1000: 66,
    category: "public-service",
    description:
      "Fonctions générales des administrations publiques, hors missions détaillées séparément.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Tester un scénario",
    actionHref: "/scenarios?stress=administration&from=atlas",
  },
  {
    id: "affaires-economiques",
    label: "Affaires économiques",
    amountPer1000: 59,
    category: "economy",
    description:
      "Soutiens économiques, interventions sectorielles et politiques de développement.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Tester un scénario",
    actionHref: "/atlas-fiscal#case-pme-industrielle",
  },
  {
    id: "transports",
    label: "Transports",
    amountPer1000: 50,
    category: "economy",
    description:
      "Réseaux, infrastructures et services de mobilité financés par les administrations publiques.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Lire la ventilation",
    actionHref: "/atlas-fiscal#case-foyer-contribuable",
  },
  {
    id: "dette",
    label: "Charge de la dette",
    amountPer1000: 31,
    category: "debt",
    description:
      "Intérêts versés pour financer la dette publique existante, hors remboursement du capital.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024", "src-budget-gouv-etat"],
    actionLabel: "Voir scénario stress",
    actionHref: "/scenarios?stress=dette&from=atlas",
  },
  {
    id: "defense",
    label: "Défense",
    amountPer1000: 31,
    category: "sovereignty",
    description:
      "Moyens militaires, préparation opérationnelle, équipement et protection du territoire.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Voir les sources",
    actionHref: "/atlas-fiscal#sources",
  },
  {
    id: "recherche",
    label: "Recherche",
    amountPer1000: 30,
    category: "future",
    description:
      "Recherche publique, innovation et soutien aux capacités scientifiques.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Voir les sources",
    actionHref: "/atlas-fiscal#sources",
  },
  {
    id: "securite",
    label: "Sécurité",
    amountPer1000: 25,
    category: "sovereignty",
    description:
      "Police, gendarmerie, sécurité civile et politiques de protection.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Voir les sources",
    actionHref: "/atlas-fiscal#sources",
  },
  {
    id: "culture",
    label: "Culture",
    amountPer1000: 25,
    category: "future",
    description:
      "Patrimoine, création, médias publics et politiques culturelles.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Voir les sources",
    actionHref: "/atlas-fiscal#sources",
  },
  {
    id: "environnement",
    label: "Environnement",
    amountPer1000: 17,
    category: "future",
    description:
      "Protection de l'environnement, transition écologique et politiques associées.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Comparer les scénarios",
    actionHref: "/scenarios?stress=transition&from=atlas",
  },
  {
    id: "infrastructures",
    label: "Infrastructures collectives",
    amountPer1000: 11,
    category: "economy",
    description:
      "Équipements collectifs et aménagements publics non isolés dans les autres postes.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Lire la ventilation",
    actionHref: "/atlas-fiscal#public-money",
  },
  {
    id: "justice",
    label: "Justice",
    amountPer1000: 5,
    category: "sovereignty",
    description:
      "Juridictions, administration pénitentiaire et accès au droit.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024"],
    actionLabel: "Voir les sources",
    actionHref: "/atlas-fiscal#sources",
  },
];

export const atlasCaseStudies: AtlasCaseStudy[] = [
  {
    id: "case-pme-industrielle",
    title: "PME industrielle : du CA au cash net",
    persona: "Dirigeant de PME industrielle",
    summary:
      "Le cas montre comment valeur ajoutée, salaires, cotisations, taxes de production et résultat imposable se transforment en trésorerie réellement disponible.",
    certainty: "analyse",
    sourceIds: ["src-insee-apu-2024", "src-bercy-aqsmi-2024"],
    steps: [
      {
        label: "Chiffre d'affaires",
        value: "2,4 M€",
        detail: "Activité annuelle fictive avant achats, salaires, taxes et investissements.",
        certainty: "hypothèse",
      },
      {
        label: "Coût du travail",
        value: "Salaires + cotisations",
        detail: "La lecture doit porter sur le coût complet, pas seulement le salaire net.",
        certainty: "analyse",
      },
      {
        label: "Taxes avant bénéfice",
        value: "Friction de marge",
        detail: "Certaines assiettes ne suivent pas parfaitement la rentabilité finale.",
        certainty: "analyse",
      },
      {
        label: "Cash disponible",
        value: "Décision",
        detail: "Arbitrage entre investissement, embauche, dette, réserve ou distribution.",
        certainty: "analyse",
      },
    ],
    actionLabel: "Ouvrir le contexte simulation",
    actionHref: "/simulations?scenario=entreprise-cash&from=atlas",
  },
  {
    id: "case-dirigeant-holding",
    title: "Dirigeant holding : dividendes, PFU et patrimoine",
    persona: "Dirigeant patrimonial",
    summary:
      "Le cas relie rémunération, distribution, PFU/CDHR, holding patrimoniale et validation professionnelle.",
    certainty: "analyse",
    sourceIds: ["src-budget-gouv-etat", "src-insee-apu-2024"],
    steps: [
      {
        label: "Résultat distribuable",
        value: "Après société",
        detail: "La décision démarre dans l'entreprise, avant fiscalité personnelle.",
        certainty: "analyse",
      },
      {
        label: "Dividendes",
        value: "PFU / CDHR",
        detail: "Les revenus mobiliers peuvent déclencher plusieurs couches à vérifier.",
        certainty: "analyse",
      },
      {
        label: "Holding",
        value: "Actifs passifs",
        detail: "La qualification patrimoniale ou opérationnelle doit être documentée.",
        certainty: "analyse",
      },
      {
        label: "Revue",
        value: "Expert requis",
        detail: "Le livrable reste indicatif sans validation fiscale ou comptable.",
        certainty: "fait établi",
      },
    ],
    actionLabel: "Simuler la holding",
    actionHref: "/simulations?scenario=holding-tax&from=atlas",
  },
  {
    id: "case-foyer-contribuable",
    title: "Foyer contribuable : 1 000 € prélevés, usages publics",
    persona: "Foyer fiscal",
    summary:
      "Le cas rend concret le passage entre prélèvement, ventilation publique et services utilisés directement ou indirectement.",
    certainty: "fait établi",
    sourceIds: ["src-bercy-aqsmi-2024", "src-insee-apu-2024"],
    steps: [
      {
        label: "Prélèvements",
        value: "1 000 €",
        detail: "Montant pédagogique pour lire les proportions entre grandes fonctions publiques.",
        certainty: "fait établi",
      },
      {
        label: "Protection sociale",
        value: "561 €",
        detail: "Premier poste de la ventilation Bercy 2024.",
        certainty: "fait établi",
      },
      {
        label: "Services publics",
        value: "École, transport, sécurité",
        detail: "Une partie revient sous forme de services non individualisés.",
        certainty: "fait établi",
      },
      {
        label: "Dette et futur",
        value: "Arbitrages",
        detail: "Charge de la dette, recherche, environnement et infrastructures rendent visibles les choix de long terme.",
        certainty: "analyse",
      },
    ],
    actionLabel: "Voir la ventilation",
    actionHref: "/atlas-fiscal#public-money",
  },
];

export function getAtlasSource(sourceId: string) {
  return atlasSources.find((source) => source.id === sourceId);
}
