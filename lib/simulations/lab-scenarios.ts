import type { TaxRun } from "../types";

/**
 * Source unique des scénarios du laboratoire de simulation.
 * Extraction pure depuis components/v2/tax-scenario-lab.tsx et
 * app/simulations/page.tsx (où la liste et le mapping étaient dupliqués) :
 * l'accueil guidé, le labo expert et les recommandations d'intention
 * consomment désormais le même module — une faute de frappe devient une
 * erreur de compilation.
 */

export type LabScenario =
  | "ir"
  | "pfu"
  | "plus-value"
  | "transmission"
  | "demembrement"
  | "assurance-vie"
  | "dutreil"
  | "holding-tax"
  | "is"
  | "sci-arbitrage"
  | "exit-tax"
  | "pea"
  | "per"
  | "bank-import"
  | "succession-checklist"
  | "per-early-exit"
  | "succession-liquidity-stress"
  | "product-adequacy";

export const labScenarios = new Set<LabScenario>([
  "ir",
  "pfu",
  "plus-value",
  "transmission",
  "demembrement",
  "assurance-vie",
  "dutreil",
  "holding-tax",
  "is",
  "sci-arbitrage",
  "exit-tax",
  "pea",
  "per",
  "bank-import",
  "succession-checklist",
  "per-early-exit",
  "succession-liquidity-stress",
  "product-adequacy",
]);

export const taxRunScenarioByLab: Record<LabScenario, TaxRun["scenario"]> = {
  ir: "ir",
  pfu: "pfu",
  "plus-value": "plus-value",
  transmission: "transmission",
  demembrement: "demembrement",
  "assurance-vie": "assurance-vie",
  dutreil: "dutreil",
  "holding-tax": "holding-tax",
  is: "is",
  "sci-arbitrage": "sci-arbitrage",
  "exit-tax": "exit-tax",
  pea: "pea-withdrawal",
  per: "per-deduction",
  "bank-import": "bank-import",
  "succession-checklist": "succession-checklist",
  "per-early-exit": "per-early-exit",
  "succession-liquidity-stress": "succession-liquidity-stress",
  "product-adequacy": "product-adequacy",
};

export function isLabScenario(value: string | null | undefined): value is LabScenario {
  return value != null && labScenarios.has(value as LabScenario);
}
