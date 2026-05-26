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
    evidenceSourceIds: ["src-impots-facturation-electronique-2026", "src-aife-facturation-electronique"],
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
  {
    id: "rule-donation-usufruit-2026-v1",
    ruleSet: "donation",
    version: "2026.1-pilot",
    title: "Donation et demembrement : valorisation indicative usufruit/nue-propriete",
    effectiveFrom: "2026-01-01",
    status: "draft",
    evidenceSourceIds: ["src-impots-donation-usufruit", "src-legifrance-code-civil-transmission"],
  },
  {
    id: "rule-plus-value-immobiliere-2026-v1",
    ruleSet: "plus-value",
    version: "2026.1-pilot",
    title: "Plus-value immobiliere : structure de calcul avant abattements detailles",
    effectiveFrom: "2026-01-01",
    status: "draft",
    evidenceSourceIds: ["src-bofip-plus-value-immobiliere"],
  },
  {
    id: "rule-sci-arbitrage-2026-v1",
    ruleSet: "sci",
    version: "2026.1-pilot",
    title: "Arbitrage detention directe / SCI : flux et points de revue",
    effectiveFrom: "2026-01-01",
    status: "draft",
    evidenceSourceIds: ["src-legifrance-code-civil-transmission"],
  },
  {
    id: "rule-ai-governance-2026-v1",
    ruleSet: "ai-governance",
    version: "2026.1-pilot",
    title: "IA controlee : citations, abstention et validation humaine",
    effectiveFrom: "2026-08-02",
    status: "draft",
    evidenceSourceIds: ["src-eu-ai-act-transparency", "src-cnil-aipd"],
  },
];

export function getRuleVersion(id: string) {
  return ruleVersions.find((rule) => rule.id === id);
}
