import { demoHousehold } from "../demo-data/household";
import { getNetWealth, getTotalDebt } from "../demo-data/metrics";
import type { AssetCategory, Household } from "../types";

/**
 * Projections patrimoniales déterministes (rule-projections-2026-v1).
 *
 * Hypothèses = paramètres de la règle (aucune prévision de marché) :
 * capitalisation annuelle composée par catégorie d'actif, dettes constantes.
 * Scénarios : statu quo · donation (300 000 € d'immobilier transmis en
 * année 0) · cession (titres de société convertis en financier, frottement
 * fiscal forfaitaire 15 % documenté comme hypothèse à réviser).
 * Sorties indicatives, revue professionnelle requise.
 */

export const PROJECTION_GROWTH_ASSUMPTIONS: Record<AssetCategory, number> = {
  liquidity: 0.01,
  financial: 0.04,
  insurance: 0.025,
  "real-estate": 0.02,
  company: 0.03,
  retirement: 0.025,
  holding: 0.03,
  other: 0,
};

export const PROJECTION_SCENARIOS = [
  { id: "statu-quo", label: "Statu quo" },
  { id: "donation", label: "Donation 300 k€" },
  { id: "cession", label: "Cession société" },
] as const;

export type ProjectionScenarioId = (typeof PROJECTION_SCENARIOS)[number]["id"];

const DONATION_AMOUNT = 300_000;
const SALE_TAX_FRICTION = 0.15;

/** Capitalisation composée arrondie à l'euro — brique testée à la main. */
export function compound(value: number, annualRate: number, years: number) {
  return Math.round(value * (1 + annualRate) ** years);
}

function scenarioAssets(household: Household, scenario: ProjectionScenarioId) {
  if (scenario === "donation") {
    let remainingToRemove = DONATION_AMOUNT;
    return household.assets.map((asset) => {
      if (asset.category !== "real-estate" || remainingToRemove <= 0) return asset;
      const removed = Math.min(asset.value, remainingToRemove);
      remainingToRemove -= removed;
      return { ...asset, value: asset.value - removed };
    });
  }

  if (scenario === "cession") {
    return household.assets.map((asset) =>
      asset.category === "company"
        ? {
            ...asset,
            category: "financial" as AssetCategory,
            value: Math.round(asset.value * (1 - SALE_TAX_FRICTION)),
          }
        : asset,
    );
  }

  return household.assets;
}

export function projectNetWealth({
  household = demoHousehold,
  scenario = "statu-quo" as ProjectionScenarioId,
  years = 10,
}: {
  household?: Household;
  scenario?: ProjectionScenarioId;
  years?: number;
} = {}) {
  const assets = scenarioAssets(household, scenario);
  const debt = getTotalDebt(household);

  return Array.from({ length: years + 1 }, (_, year) => {
    const grossWealth = assets.reduce(
      (sum, asset) => sum + compound(asset.value, PROJECTION_GROWTH_ASSUMPTIONS[asset.category], year),
      0,
    );
    return { year, netWealth: grossWealth - debt };
  });
}

/** Estimations à horizon donné pour le comparateur de scénarios. */
export function getScenarioNetWealthEstimates(years = 10) {
  return Object.fromEntries(
    PROJECTION_SCENARIOS.map((scenario) => [
      scenario.id,
      projectNetWealth({ scenario: scenario.id, years }).at(-1)?.netWealth ?? getNetWealth(demoHousehold),
    ]),
  ) as Record<ProjectionScenarioId, number>;
}
