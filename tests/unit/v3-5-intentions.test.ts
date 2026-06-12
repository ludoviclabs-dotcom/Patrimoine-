import { describe, expect, it } from "vitest";
import {
  cabinetStatuses,
  getSimulationByParam,
  statusDictionary,
} from "../../lib/cabinet-refonte/v2-6";
import { getDisplayTier, tierTone } from "../../lib/cabinet-refonte/status-tiers";
import { getIntention, intentions } from "../../lib/simulations/intentions";
import { isLabScenario, labScenarios, taxRunScenarioByLab } from "../../lib/simulations/lab-scenarios";
import { mindmapBranches, mindmapCenter } from "../../lib/simulations/mindmap";

describe("V3.5 — module partagé lab-scenarios", () => {
  it("couvre les 18 scénarios et garde le mapping TaxRun exhaustif", () => {
    expect(labScenarios.size).toBe(18);
    for (const scenario of labScenarios) {
      expect(taxRunScenarioByLab[scenario]).toBeTruthy();
      expect(getSimulationByParam(scenario)?.scenarioParam).toBe(scenario);
    }
    expect(isLabScenario("plus-value")).toBe(true);
    expect(isLabScenario("inconnu")).toBe(false);
    expect(isLabScenario(null)).toBe(false);
  });
});

describe("V3.5 — intentions guidées", () => {
  it("propose 6 familles, chacune avec 3 à 5 recommandations résolues dans le catalogue", () => {
    expect(intentions).toHaveLength(6);
    for (const intention of intentions) {
      expect(intention.recommendations.length).toBeGreaterThanOrEqual(3);
      expect(intention.recommendations.length).toBeLessThanOrEqual(5);
      for (const recommendation of intention.recommendations) {
        expect(labScenarios.has(recommendation.scenarioParam), recommendation.scenarioParam).toBe(true);
        expect(getSimulationByParam(recommendation.scenarioParam)).not.toBeNull();
        expect(recommendation.pourquoi.length).toBeGreaterThan(20);
      }
      // Chaque intention ouvre sur un scénario prioritaire.
      expect(intention.recommendations[0].priority).toBe("prioritaire");
    }
  });

  it("garde le mapping intention → scénarios déterministe (contrat verrouillé)", () => {
    const mapping = Object.fromEntries(
      intentions.map((intention) => [
        intention.id,
        intention.recommendations.map((recommendation) => recommendation.scenarioParam),
      ]),
    );
    expect(mapping).toEqual({
      "vendre-bien": ["plus-value", "sci-arbitrage", "succession-liquidity-stress", "exit-tax"],
      "optimiser-revenus": ["pfu", "ir", "pea"],
      "preparer-transmission": [
        "transmission",
        "demembrement",
        "assurance-vie",
        "dutreil",
        "succession-checklist",
      ],
      "enveloppe-retraite": ["per", "per-early-exit", "pea"],
      "auditer-structure": ["is", "sci-arbitrage", "holding-tax", "dutreil"],
      "verifier-conformite": ["product-adequacy", "bank-import", "succession-checklist"],
    });
  });

  it("résout les intentions par identifiant", () => {
    expect(getIntention("vendre-bien")?.label).toBe("Je prépare une vente");
    expect(getIntention("inconnu")).toBeNull();
    expect(getIntention(null)).toBeNull();
  });
});

describe("V3.5 — carte mentale patrimoniale", () => {
  it("seed 6 branches dont chaque scénario résout dans le catalogue", () => {
    expect(mindmapBranches).toHaveLength(6);
    expect(mindmapCenter.label).toBe("Claire et Marc");
    for (const branch of mindmapBranches) {
      expect(branch.scenarios.length).toBeGreaterThan(0);
      for (const scenario of branch.scenarios) {
        expect(labScenarios.has(scenario), scenario).toBe(true);
        expect(getSimulationByParam(scenario)).not.toBeNull();
      }
    }
    // Angles uniques et répartis (lisibilité du SVG radial).
    const angles = mindmapBranches.map((branch) => branch.angleDeg);
    expect(new Set(angles).size).toBe(angles.length);
  });
});

describe("V3.5 — badges 3 niveaux (présentation seulement)", () => {
  it("mappe chacun des 10 statuts vers un niveau d'affichage", () => {
    for (const status of cabinetStatuses) {
      const tier = getDisplayTier(status);
      expect(["Indicatif", "Revue requise", "Bloquant"]).toContain(tier);
      expect(tierTone[tier]).toBeTruthy();
    }
  });

  it("verrouille le contrat des niveaux clés", () => {
    expect(getDisplayTier("Simulation indicative")).toBe("Indicatif");
    expect(getDisplayTier("Donnée simulée")).toBe("Indicatif");
    expect(getDisplayTier("Revue requise")).toBe("Revue requise");
    expect(getDisplayTier("À vérifier")).toBe("Revue requise");
    expect(getDisplayTier("Bloqué")).toBe("Bloquant");
    expect(getDisplayTier("Hors couverture")).toBe("Bloquant");
  });

  it("ne touche pas au vocabulaire détaillé sous-jacent", () => {
    expect(statusDictionary.map((status) => status.id)).toEqual([...cabinetStatuses]);
    expect(cabinetStatuses).toHaveLength(10);
  });
});
