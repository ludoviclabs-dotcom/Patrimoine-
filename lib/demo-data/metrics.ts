import type { AssetCategory, Household } from "@/lib/types";

export type AllocationItem = {
  category: AssetCategory;
  label: string;
  value: number;
  color: string;
};

const categoryLabels: Record<AssetCategory, string> = {
  liquidity: "Liquidités",
  financial: "Financier",
  insurance: "Assurance-vie",
  "real-estate": "Immobilier",
  company: "Entreprise",
  retirement: "Retraite",
  holding: "Holding",
  other: "Autres",
};

const categoryColors: Record<AssetCategory, string> = {
  liquidity: "#0f766e",
  financial: "#1f4f46",
  insurance: "#8a6f2a",
  "real-estate": "#b7791f",
  company: "#2f3d37",
  retirement: "#5b6f95",
  holding: "#7c3aed",
  other: "#64748b",
};

export function getGrossWealth(household: Household) {
  return household.assets.reduce((sum, asset) => sum + asset.value, 0);
}

export function getTotalDebt(household: Household) {
  return household.liabilities.reduce((sum, liability) => sum + liability.value, 0);
}

export function getNetWealth(household: Household) {
  return getGrossWealth(household) - getTotalDebt(household);
}

export function getLiquidity(household: Household) {
  return household.assets
    .filter((asset) => asset.category === "liquidity")
    .reduce((sum, asset) => sum + asset.value, 0);
}

export function getAllocation(household: Household): AllocationItem[] {
  const totals = household.assets.reduce<Record<AssetCategory, number>>(
    (acc, asset) => {
      acc[asset.category] += asset.value;
      return acc;
    },
    {
      liquidity: 0,
      financial: 0,
      insurance: 0,
      "real-estate": 0,
      company: 0,
      retirement: 0,
      holding: 0,
      other: 0,
    },
  );

  return Object.entries(totals)
    .map(([category, value]) => ({
      category: category as AssetCategory,
      label: categoryLabels[category as AssetCategory],
      value,
      color: categoryColors[category as AssetCategory],
    }))
    .filter((item) => item.value > 0);
}

export function getDashboardAlerts(household: Household) {
  const gross = getGrossWealth(household);
  const debt = getTotalDebt(household);
  const realEstate =
    getAllocation(household).find((item) => item.category === "real-estate")?.value ?? 0;
  const liquidity = getLiquidity(household);

  return [
    {
      id: "alert-ifi",
      title: "IFI à vérifier",
      detail: "Base sous seuil indicatif, contrôle requis sur SCI, dettes et exonérations.",
      tone: "warning" as const,
    },
    {
      id: "alert-concentration",
      title: "Concentration immobilière",
      detail: `${Math.round((realEstate / gross) * 100)} % du patrimoine brut en immobilier.`,
      tone: "neutral" as const,
    },
    {
      id: "alert-liquidity",
      title: "Liquidité limitée",
      detail: `${Math.round((liquidity / gross) * 100)} % de liquidité immédiate avant arbitrages.`,
      tone: "neutral" as const,
    },
    {
      id: "alert-debt",
      title: "Dette documentée",
      detail: `${Math.round((debt / gross) * 100)} % de dette / actif brut à rattacher aux biens.`,
      tone: "success" as const,
    },
  ];
}
