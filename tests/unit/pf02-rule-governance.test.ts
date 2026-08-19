import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evidenceSources } from "../../lib/evidence/sources";
import { getRuleVersion, ruleVersions } from "../../lib/rules/rule-versions";
import { getAllTaxRuns } from "../../lib/tax/engines";
import {
  APPORT_CESSION_LF2026_PIVOT_DATE,
  listApportCessionRegimes,
  resolveApportCessionRegime,
} from "../../lib/tax/apport-cession-regimes";

/**
 * PF-02 — invariants de gouvernance des règles fiscales.
 *
 * Ces tests ne vérifient pas un montant : ils protègent l'infrastructure qui
 * rend les montants traçables. Ils doivent échouer si un développeur contourne
 * la gouvernance décrite dans `docs/rule-governance.md` (règle sans source,
 * étape sans version, référence inconnue, portée temporelle ambiguë).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const sourceIds = new Set(evidenceSources.map((source) => source.id));
const registryIds = new Set(ruleVersions.map((rule) => rule.id));
const activeRules = ruleVersions.filter((rule) => rule.status === "active");
const runs = getAllTaxRuns();

/**
 * Jeux de règles portant légitimement plusieurs règles actives simultanément.
 * Toute nouvelle entrée doit être ajoutée ici DÉLIBÉRÉMENT, avec sa raison :
 * c'est le garde-fou contre l'ajout silencieux d'une seconde version active
 * sur une portée déjà couverte.
 */
const MULTI_ACTIVE_RULESETS: Record<string, string> = {
  // Deux régimes temporels distincts, sélectionnés par la date de cession.
  "apport-cession": "Un régime par période (pré/post 21/02/2026), résolu par date de cession.",
  // Règles portant sur des objets différents au sein du même jeu.
  transmission: "Checklist transmission et barème DMTG sont deux règles distinctes.",
  // Éligibilité quantitative Dutreil et qualification holding animatrice sont
  // deux règles distinctes (PF-02B3) : la seconde n'alimente la première que
  // lorsqu'elle est explicitement engagée (transmission de titres de holding).
  dutreil: "Éligibilité Dutreil et qualification holding animatrice sont deux règles distinctes.",
  rgpd: "AIPD et pages légales sont deux règles distinctes.",
  "cif-orias": "DER et lettre de mission sont deux règles distinctes.",
};

const PLACEHOLDER_SOURCE_PATTERN = /^(tbd|todo|xxx|placeholder|n\/a|na|source|src-todo)$/i;

describe("PF-02 — invariants de gouvernance des règles", () => {
  it("A — toute règle active porte id, version, date d'effet et au moins une source", () => {
    for (const rule of activeRules) {
      expect(rule.id, `${rule.id}: id manquant`).toBeTruthy();
      expect(rule.version?.trim(), `${rule.id}: version manquante`).toBeTruthy();
      expect(rule.effectiveFrom, `${rule.id}: effectiveFrom manquante`).toMatch(ISO_DATE);
      expect(rule.evidenceSourceIds?.length ?? 0, `${rule.id}: aucune source`).toBeGreaterThanOrEqual(
        1,
      );
    }
  });

  it("A bis — aucun identifiant de règle dupliqué dans le registre", () => {
    const ids = ruleVersions.map((rule) => rule.id);
    expect(new Set(ids).size, `doublons: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`).toBe(
      ids.length,
    );
  });

  it("B — pas de second actif non déclaré sur un même jeu de règles", () => {
    const activeByRuleSet = new Map<string, string[]>();
    for (const rule of activeRules) {
      activeByRuleSet.set(rule.ruleSet, [...(activeByRuleSet.get(rule.ruleSet) ?? []), rule.id]);
    }
    for (const [ruleSet, ids] of activeByRuleSet) {
      if (ids.length <= 1) continue;
      expect(
        MULTI_ACTIVE_RULESETS[ruleSet],
        `Le jeu "${ruleSet}" porte ${ids.length} règles actives (${ids.join(", ")}) sans justification déclarée. Archiver la version dépassée, ou déclarer la coexistence dans MULTI_ACTIVE_RULESETS.`,
      ).toBeTruthy();
    }
  });

  it("C — une règle archivée reste résolvable pour les runs historiques", () => {
    const archived = ruleVersions.filter((rule) => rule.status === "archived");
    expect(archived.length).toBeGreaterThan(0);
    for (const rule of archived) {
      const resolved = getRuleVersion(rule.id);
      expect(resolved, `${rule.id} n'est plus résolvable`).toBeDefined();
      expect(resolved?.version).toBe(rule.version);
      // L'historique n'est jamais réécrit : la date d'effet reste intacte.
      expect(resolved?.effectiveFrom).toMatch(ISO_DATE);
    }
  });

  it("D — tout résultat fiscal déterministe expose des calculation_steps", () => {
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(run.steps?.length ?? 0, `${run.module}: aucun calculation_step`).toBeGreaterThan(0);
    }
  });

  it("E — chaque calculation_step porte un ruleVersionId non vide", () => {
    for (const run of runs) {
      for (const step of run.steps) {
        expect(step.ruleVersionId, `${run.module}:${step.id}: ruleVersionId manquant`).toBeTruthy();
      }
    }
  });

  it("F — tout ruleVersionId référencé par un moteur existe dans le registre", () => {
    for (const run of runs) {
      for (const step of run.steps) {
        expect(
          registryIds.has(step.ruleVersionId),
          `${run.module}:${step.id} référence une règle inconnue: ${step.ruleVersionId}`,
        ).toBe(true);
      }
    }
  });

  it("F bis — aucun moteur ne référence une règle archivée", () => {
    for (const run of runs) {
      for (const step of run.steps) {
        const rule = getRuleVersion(step.ruleVersionId);
        expect(
          rule?.status,
          `${run.module}:${step.id} référence la règle archivée ${step.ruleVersionId}`,
        ).not.toBe("archived");
      }
    }
  });

  it("G — aucune source factice, et toute source référencée existe", () => {
    for (const rule of ruleVersions) {
      for (const sourceId of rule.evidenceSourceIds ?? []) {
        expect(
          PLACEHOLDER_SOURCE_PATTERN.test(sourceId),
          `${rule.id}: source factice "${sourceId}"`,
        ).toBe(false);
        expect(sourceIds.has(sourceId), `${rule.id}: source inconnue "${sourceId}"`).toBe(true);
      }
    }
    // Les étapes portent elles aussi une source résolvable.
    for (const run of runs) {
      for (const step of run.steps) {
        expect(step.evidenceSourceId, `${run.module}:${step.id}: source manquante`).toBeTruthy();
        expect(
          sourceIds.has(step.evidenceSourceId),
          `${run.module}:${step.id}: source inconnue "${step.evidenceSourceId}"`,
        ).toBe(true);
      }
    }
  });

  it("H — aucune plage temporelle inversée dans les régimes datés", () => {
    for (const regime of listApportCessionRegimes()) {
      expect(regime.effectiveFrom).toMatch(ISO_DATE);
      if (regime.effectiveTo === null) continue;
      expect(regime.effectiveTo).toMatch(ISO_DATE);
      expect(
        regime.effectiveFrom <= regime.effectiveTo,
        `${regime.regimeId}: plage inversée ${regime.effectiveFrom} → ${regime.effectiveTo}`,
      ).toBe(true);
    }
  });

  it("I — une date frontière résout exactement une version temporelle", () => {
    const regimes = listApportCessionRegimes();
    const probeDates = [
      "2018-12-31",
      "2019-01-01",
      "2026-02-20",
      APPORT_CESSION_LF2026_PIVOT_DATE,
      "2026-06-11",
    ];
    for (const date of probeDates) {
      const matching = regimes.filter(
        (regime) =>
          date >= regime.effectiveFrom &&
          (regime.effectiveTo === null || date <= regime.effectiveTo),
      );
      expect(matching.length, `${date} résout ${matching.length} régimes`).toBe(1);
      // Le résolveur retourne bien l'unique régime applicable.
      expect(resolveApportCessionRegime(date).regimeId).toBe(matching[0].regimeId);
    }
  });

  it("I bis — chaque régime daté pointe une règle existante du registre", () => {
    for (const regime of listApportCessionRegimes()) {
      expect(
        registryIds.has(regime.ruleVersionId),
        `${regime.regimeId} référence une règle inconnue: ${regime.ruleVersionId}`,
      ).toBe(true);
      expect(regime.sourceRefs.length).toBeGreaterThan(0);
    }
  });
});

// --- Audit des constantes fiscales littérales -------------------------------
// Objectif ciblé et volontairement étroit : aucune UI ne doit réinscrire un
// taux ou un seuil fiscal en dur. Les constantes légales vivent dans les
// moteurs et registres versionnés, jamais dans un composant d'affichage.
// C'est exactement la régression corrigée en PF-01C1 (cockpit « 31,4 % » figé).
describe("PF-02 — audit des constantes fiscales dans l'UI", () => {
  const FISCAL_LITERALS = [
    { pattern: /\b0\.128\b/, label: "taux IR forfaitaire 12,8 %" },
    { pattern: /\b0\.172\b/, label: "prélèvements sociaux 17,2 %" },
    { pattern: /\b0\.186\b/, label: "prélèvements sociaux 18,6 %" },
    { pattern: /\b0\.314\b/, label: "PFU agrégé 31,4 %" },
    { pattern: /\b0\.19\b/, label: "IR plus-value immobilière 19 %" },
    { pattern: /\b5_000_000\b|\b5000000\b/, label: "seuil taxe holding 5 M€" },
    { pattern: /\b1_300_000\b|\b1300000\b/, label: "seuil IFI 1,3 M€" },
    { pattern: /\b800_000\b|\b800000\b/, label: "seuil exit tax 800 k€" },
  ];

  function collectSourceFiles(root: string): string[] {
    const entries = readdirSync(root);
    return entries.flatMap((entry) => {
      const full = join(root, entry);
      if (statSync(full).isDirectory()) return collectSourceFiles(full);
      return /\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry) ? [full] : [];
    });
  }

  it("aucun taux ni seuil fiscal codé en dur dans components/ ou app/", () => {
    const files = [...collectSourceFiles("components"), ...collectSourceFiles("app")];
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const { pattern, label } of FISCAL_LITERALS) {
        if (pattern.test(content)) {
          offenders.push(`${file.replace(/\\/g, "/")} → ${label}`);
        }
      }
    }

    expect(
      offenders,
      `Constantes fiscales en dur dans l'UI. Elles doivent être dérivées d'un moteur ou d'un registre versionné :\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
