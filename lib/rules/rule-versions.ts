import type { RuleVersion } from "@/lib/types";

export const ruleVersions: RuleVersion[] = [
  {
    id: "rule-ifi-simplified-2026-v1",
    ruleSet: "ifi",
    version: "2026.1-demo",
    title: "IFI simplifié : résidence principale, immobilier taxable et dette immobilière",
    effectiveFrom: "2026-01-01",
    status: "active",
    evidenceSourceIds: ["src-service-public-ifi-2026"],
  },
  {
    id: "rule-transmission-checklist-2026-v1",
    ruleSet: "transmission",
    version: "2026.1-demo",
    title: "Transmission familiale : checklist professionnelle non chiffrée",
    effectiveFrom: "2026-01-01",
    status: "active",
    evidenceSourceIds: ["src-legifrance-code-civil-transmission"],
  },
  {
    id: "rule-e-invoicing-readiness-2026-v1",
    ruleSet: "facturation-electronique",
    version: "2026.1-demo",
    title: "Facturation électronique : score de préparation TPE/PME",
    effectiveFrom: "2026-09-01",
    status: "active",
    evidenceSourceIds: ["src-impots-facturation-electronique-2026"],
  },
  {
    id: "rule-rgpd-dpia-demo-2026-v1",
    ruleSet: "rgpd",
    version: "2026.1-demo",
    title: "RGPD : signalement AIPD recommandé pour données patrimoniales",
    effectiveFrom: "2026-01-01",
    status: "active",
    evidenceSourceIds: ["src-cnil-aipd"],
  },
];

export function getRuleVersion(id: string) {
  return ruleVersions.find((rule) => rule.id === id);
}
