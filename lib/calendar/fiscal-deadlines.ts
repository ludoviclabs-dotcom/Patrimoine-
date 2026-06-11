import type { FiscalDeadline, TimelineEvent } from "../types";

/**
 * Calendrier fiscal du dossier (rule-calendrier-fiscal-2026-v1).
 * Dates indicatives de campagne — à confirmer chaque année sur
 * impots.gouv.fr (le calendrier officiel est publié par département).
 */

export const fiscalDeadlines: FiscalDeadline[] = [
  {
    id: "deadline-2042-2026",
    date: "2026-06-05",
    label: "Déclaration 2042 (revenus 2025)",
    scope: "ir",
    detail: "Déclaration d'ensemble des revenus du foyer, y compris 2044 si revenus fonciers.",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
  {
    id: "deadline-2044-2026",
    date: "2026-06-05",
    label: "Annexe 2044 (revenus fonciers)",
    scope: "ir",
    detail: "Détail des loyers, charges et intérêts du locatif nu détenu en direct.",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
  {
    id: "deadline-ifi-2026",
    date: "2026-06-05",
    label: "Déclaration IFI (annexe 2042-IFI)",
    scope: "ifi",
    detail: "Patrimoine immobilier net au 1er janvier ; base démo sous le seuil, à surveiller.",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
  {
    id: "deadline-2072-2026",
    date: "2026-05-19",
    label: "Déclaration 2072 (SCI à l'IR)",
    scope: "sci",
    detail: "Résultat de la SCI et répartition entre associés (deuxième jour ouvré suivant le 1er mai).",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
  {
    id: "deadline-2065-2026",
    date: "2026-05-19",
    label: "Déclaration 2065 (option IS)",
    scope: "is",
    detail: "Liasse IS si l'option est exercée ; solde de l'IS au 15 mai.",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
  {
    id: "deadline-is-acomptes-2026",
    date: "2026-09-15",
    label: "Acompte IS trimestriel",
    scope: "is",
    detail: "Acomptes au 15 mars, 15 juin, 15 septembre et 15 décembre pour les sociétés à l'IS.",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
  {
    id: "deadline-cfe-2026",
    date: "2026-12-15",
    label: "CFE : solde",
    scope: "cfe",
    detail: "Location nue imposable au-delà de 100 000 € de recettes — flag levé par la brique compta.",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
  {
    id: "deadline-dutreil-attestation-2027",
    date: "2027-03-31",
    label: "Dutreil : attestation annuelle",
    scope: "dutreil",
    detail: "Obligations déclaratives annuelles pendant les engagements collectif et individuel.",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
  {
    id: "deadline-holding-tax-2027",
    date: "2027-05-15",
    label: "Taxe holding : première campagne",
    scope: "holding-tax",
    detail: "Première taxation attendue au printemps 2027 sur les exercices clos en 2026 (art. 235 ter C).",
    ruleVersionId: "rule-calendrier-fiscal-2026-v1",
  },
];

export function getUpcomingDeadlines(fromDate = "2026-06-11", limit = 6) {
  return fiscalDeadlines
    .filter((deadline) => deadline.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/** Fusion dans la frise patrimoniale v1.1 (échéances → événements). */
export function deadlinesAsTimelineEvents(): TimelineEvent[] {
  return fiscalDeadlines.map((deadline) => ({
    id: `timeline-${deadline.id}`,
    year: deadline.date.slice(0, 4),
    title: deadline.label,
    description: deadline.detail,
    status: "regulatory" as const,
  }));
}
