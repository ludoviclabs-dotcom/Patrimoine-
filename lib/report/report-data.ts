import { getAllocation, getGrossWealth, getLiquidity, getNetWealth, getTotalDebt } from "@/lib/demo-data/metrics";
import type { Household } from "@/lib/types";

export function getReportSummary(household: Household) {
  return {
    grossWealth: getGrossWealth(household),
    totalDebt: getTotalDebt(household),
    netWealth: getNetWealth(household),
    liquidity: getLiquidity(household),
    allocation: getAllocation(household),
    limits:
      "Analyse indicative, à valider par un professionnel habilité avant toute décision juridique, fiscale ou patrimoniale.",
    openQuestions: [
      "Nature exacte et déductibilité des dettes immobilières.",
      "Composition détaillée des parts SCI et éventuelles exonérations.",
      "Objectif prioritaire : protection du conjoint, transmission ou liquidité.",
      "Pièces à préparer pour notaire, avocat fiscaliste et expert-comptable.",
    ],
  };
}
