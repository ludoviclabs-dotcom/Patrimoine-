import { demoHousehold } from "../demo-data/household";
import { getGrossWealth } from "../demo-data/metrics";
import { formatEuro } from "../format";
import type { LabScenario } from "./lab-scenarios";

/**
 * Seed de la carte mentale patrimoniale de l'accueil guidé.
 *
 * Centre = le foyer (demoHousehold) ; 6 branches dérivées des actifs et
 * objectifs réels du dossier démo. Chaque branche suggère des scénarios du
 * laboratoire (typés LabScenario). Le composant SVG est purement
 * présentationnel : tout le mapping vit ici pour être testable.
 */

export type MindmapBranch = {
  id: string;
  label: string;
  summary: string;
  scenarios: LabScenario[];
  /** Angle de la branche en degrés (0° = droite, -90° = haut). */
  angleDeg: number;
};

function sumByCategory(category: string) {
  return demoHousehold.assets
    .filter((asset) => asset.category === category)
    .reduce((sum, asset) => sum + asset.value, 0);
}

const realEstateTotal = sumByCategory("real-estate");
const companyTotal = sumByCategory("company");
const envelopesTotal =
  sumByCategory("financial") + sumByCategory("insurance") + sumByCategory("liquidity");

export const mindmapCenter = {
  label: demoHousehold.name,
  caption: `${demoHousehold.profile} · ${formatEuro(getGrossWealth(demoHousehold))} brut`,
};

export const mindmapBranches: MindmapBranch[] = [
  {
    id: "foyer",
    label: "Foyer",
    summary: `${demoHousehold.members.join(" · ")} · ${demoHousehold.children} enfants`,
    scenarios: ["ir", "pfu"],
    angleDeg: -90,
  },
  {
    id: "immobilier",
    label: "Immobilier",
    summary: `${formatEuro(realEstateTotal)} (résidence, locatif, SCI) · dettes rattachées`,
    scenarios: ["plus-value", "sci-arbitrage"],
    angleDeg: -30,
  },
  {
    id: "societe",
    label: "Société / Holding",
    summary: `${formatEuro(companyTotal)} de titres · dirigeants de PME`,
    scenarios: ["is", "holding-tax", "dutreil"],
    angleDeg: 30,
  },
  {
    id: "transmission",
    label: "Transmission",
    summary: "Objectif : préparer la transmission aux deux enfants",
    scenarios: ["transmission", "demembrement", "assurance-vie", "succession-checklist"],
    angleDeg: 90,
  },
  {
    id: "enveloppes",
    label: "Enveloppes",
    summary: `${formatEuro(envelopesTotal)} (PEA, CTO, assurance-vie, liquidités)`,
    scenarios: ["pea", "per", "assurance-vie"],
    angleDeg: 150,
  },
  {
    id: "alertes",
    label: "Alertes & revues",
    summary: "Exposition IFI à surveiller · revues notaire/avocat attendues",
    scenarios: ["succession-liquidity-stress", "product-adequacy", "exit-tax"],
    angleDeg: 210,
  },
];

export function getMindmapBranch(id: string | null | undefined): MindmapBranch | null {
  return mindmapBranches.find((branch) => branch.id === id) ?? null;
}
