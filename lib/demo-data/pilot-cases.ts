export const pilotDemoCases = [
  {
    id: "pilot-claire-marc",
    name: "Claire et Marc",
    audience: "Cabinet CGP / avocat fiscaliste",
    promise: "Chaque chiffre IFI est explicable, source et borne.",
    demoPath: ["Cabinet", "Simulation IFI", "Pourquoi ce resultat", "Rapport"],
    proofPoints: ["Base IFI 1,11 M EUR", "Complétude 72 %", "Limites non couvertes visibles"],
  },
  {
    id: "pilot-tpe-2026",
    name: "TPE 2026",
    audience: "Expert-comptable",
    promise: "Preparation facturation electronique 2026/2027 exploitable en rendez-vous.",
    demoPath: ["Simulations", "Facturation electronique", "Checklist actions", "Sources impots/AIFE"],
    proofPoints: ["Reception 2026", "Emission 2027", "E-reporting a verifier"],
  },
  {
    id: "pilot-entrepreneur-cession",
    name: "Entrepreneur cession",
    audience: "Family office leger / notaire",
    promise: "Comparer cession, donation et reallocation sans recommandation automatique.",
    demoPath: ["Scenarios", "Radar vigilance", "Meeting brief", "Rapport versionne"],
    proofPoints: ["5 scenarios", "Validation necessaire", "Questions professionnel"],
  },
];

export const sevenMinuteCommercialScript = [
  { minute: "0:00", title: "Positionnement", line: "Ce n'est pas un chatbot fiscal : c'est une plateforme de simulation sourcée." },
  { minute: "0:45", title: "Cockpit cabinet", line: "Montrer completude, data quality, radar et documents manquants." },
  { minute: "2:00", title: "Simulation IFI", line: "Ouvrir les etapes et le panneau Pourquoi ce resultat." },
  { minute: "3:15", title: "Evidence Center", line: "Filtrer Service-Public, montrer hash, snapshot, regles liees." },
  { minute: "4:15", title: "Comparateur", line: "Comparer les 5 scenarios sans choisir automatiquement." },
  { minute: "5:30", title: "Rapport", line: "Afficher statut indicatif, limites et questions professionnel." },
  { minute: "6:30", title: "Pilotage", line: "Conclure sur workflow, audit, CRON_SECRET et validation humaine." },
];

export const pilotDeckOutline = [
  "Probleme : les cabinets doivent simuler vite sans perdre la tracabilite.",
  "Solution : evidence-first, calculs deterministes, sources officielles.",
  "Demo : dossier Claire et Marc.",
  "Confiance : data quality, coverage limits, audit, revue humaine.",
  "Workflow : dossier, simulation persistée, replay, rapport versionne.",
  "Evidence : snapshots, hash, alertes de changement.",
  "Pilote : 1 cabinet, 3 cas fictifs, aucun conseil opposable.",
];

export const rgpdNonAdviceNotices = [
  "Les donnees de demo sont fictives et ne doivent pas etre remplacees par des donnees reelles sans mandat, information et base legale.",
  "Les simulations sont indicatives et doivent etre validees par un professionnel habilite avant toute decision.",
  "La plateforme ne rend pas de conseil fiscal, juridique, financier ou patrimonial definitif.",
  "Toute piece documentaire doit rester privee par defaut et rattachee a un tenant, client et dossier.",
  "L'IA runtime est desactivee ; tout usage futur devra citer ses sources et s'abstenir si la preuve est insuffisante.",
];
