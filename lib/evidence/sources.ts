import type { EvidenceSource } from "@/lib/types";

export const evidenceSources: EvidenceSource[] = [
  {
    id: "src-service-public-ifi-2026",
    title: "Impôt sur la fortune immobilière : seuil, résidence principale et dettes",
    authority: "service-public",
    url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F138",
    checkedAt: "2026-05-26",
    legalScope: "IFI",
    reliability: "official",
    status: "active",
  },
  {
    id: "src-impots-facturation-electronique-2026",
    title: "Facturation électronique et plateformes agréées",
    authority: "impots",
    url: "https://www.impots.gouv.fr/facturation-electronique-et-plateformes-partenaires",
    checkedAt: "2026-05-26",
    legalScope: "facturation-electronique",
    reliability: "official",
    status: "active",
  },
  {
    id: "src-cnil-aipd",
    title: "Réaliser une analyse d’impact relative à la protection des données",
    authority: "cnil",
    url: "https://www.cnil.fr/fr/realiser-une-analyse-dimpact-si-necessaire",
    checkedAt: "2026-05-26",
    legalScope: "rgpd",
    reliability: "official",
    status: "active",
  },
  {
    id: "src-legifrance-code-civil-transmission",
    title: "Code civil : succession, réserve et libéralités",
    authority: "legifrance",
    url: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006070721/",
    checkedAt: "2026-05-26",
    legalScope: "transmission",
    reliability: "official",
    status: "to-review",
  },
];

export function getEvidenceSource(id: string) {
  return evidenceSources.find((source) => source.id === id);
}
