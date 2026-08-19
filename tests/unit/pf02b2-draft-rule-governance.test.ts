import { describe, expect, it } from "vitest";
import { getRuleVersion, ruleVersions } from "../../lib/rules/rule-versions";
import { getAllTaxRuns } from "../../lib/tax/engines";

/**
 * PF-02B2 — invariants empêchant qu'une règle `draft` produise un résultat
 * présenté comme confirmé/définitif.
 *
 * Neuf règles `draft` sont effectivement consommées par un moteur produisant
 * des `calculation_steps` (inventaire empirique, `docs/agent/PF02B_FISCAL_COMPLETENESS.md`) :
 * rule-donation-usufruit-2026-v1, rule-per-deduction-2026-v2,
 * rule-bank-import-demo-2026-v1, rule-succession-checklist-2026-v1,
 * rule-per-early-exit-primary-home-2026-v1,
 * rule-succession-liquidity-stress-2026-v1, rule-product-adequacy-demo-2026-v1,
 * rule-assurance-vie-990i-757b-2026-v1, rule-sci-arbitrage-2026-v2.
 * Les dix autres règles `draft` du registre ne sont référencées par aucun run
 * (catalogue, calendrier ou régime non atteint par la fixture de démonstration).
 *
 * Ces tests ne verrouillent pas un montant : ils garantissent qu'aucune étape
 * ni aucun run rattaché à une règle non promue ne peut jamais s'afficher comme
 * `validated`, ni sortir du statut `needs_review` avec
 * `professionalValidationRequired`. Ils doivent échouer si une future
 * modification affaiblit cette garantie — y compris pour une règle `draft`
 * pas encore écrite aujourd'hui.
 */

const runs = getAllTaxRuns();
const draftRuleIds = new Set(ruleVersions.filter((rule) => rule.status === "draft").map((rule) => rule.id));

function draftRuleIdsConsumedByRuns(): Set<string> {
  const consumed = new Set<string>();
  for (const run of runs) {
    for (const step of run.steps) {
      if (draftRuleIds.has(step.ruleVersionId)) consumed.add(step.ruleVersionId);
    }
  }
  return consumed;
}

describe("PF-02B2 — gouvernance des règles draft", () => {
  it("au moins une règle draft est effectivement consommée par un moteur (test non vide)", () => {
    expect(draftRuleIdsConsumedByRuns().size).toBeGreaterThan(0);
  });

  it("aucune étape référençant une règle draft n'est jamais confidenceStatus \"validated\"", () => {
    for (const run of runs) {
      for (const step of run.steps) {
        if (!draftRuleIds.has(step.ruleVersionId)) continue;
        expect(
          step.confidenceStatus,
          `${run.module}:${step.id} référence la règle draft ${step.ruleVersionId} mais confidenceStatus="${step.confidenceStatus}"`,
        ).not.toBe("validated");
      }
    }
  });

  it("aucune étape référençant une règle draft n'a displayStatus \"validated_calculation\"", () => {
    for (const run of runs) {
      for (const step of run.steps) {
        if (!draftRuleIds.has(step.ruleVersionId)) continue;
        expect(
          step.displayStatus,
          `${run.module}:${step.id} référence la règle draft ${step.ruleVersionId} mais displayStatus="${step.displayStatus}"`,
        ).not.toBe("validated_calculation");
      }
    }
  });

  it("tout run contenant une étape draft porte status \"needs_review\", jamais présenté comme définitif", () => {
    for (const run of runs) {
      const hasDraftStep = run.steps.some((step) => draftRuleIds.has(step.ruleVersionId));
      if (!hasDraftStep) continue;
      expect(
        run.status,
        `${run.module} référence au moins une règle draft mais status="${run.status}"`,
      ).toBe("needs_review");
    }
  });

  it("tout run contenant une étape draft exige une validation professionnelle explicite", () => {
    for (const run of runs) {
      const hasDraftStep = run.steps.some((step) => draftRuleIds.has(step.ruleVersionId));
      if (!hasDraftStep) continue;
      expect(
        run.professionalValidationRequired,
        `${run.module} référence au moins une règle draft mais professionalValidationRequired n'est pas true`,
      ).toBe(true);
    }
  });

  it("chaque règle draft consommée reste résolvable et distincte d'une règle archivée", () => {
    for (const id of draftRuleIdsConsumedByRuns()) {
      const rule = getRuleVersion(id);
      expect(rule, `${id} introuvable dans le registre`).toBeDefined();
      expect(rule?.status).toBe("draft");
    }
  });

  it("inventaire des règles draft consommées par un moteur — toute nouvelle entrée doit être ajoutée ici délibérément", () => {
    // Registre figé au 19/08/2026 (PF-02B2). Si ce test échoue parce qu'une
    // règle draft supplémentaire est désormais consommée par un moteur (ou
    // qu'une des neuf ne l'est plus), mettre à jour cette liste ET la
    // documenter dans docs/agent/PF02B_FISCAL_COMPLETENESS.md — jamais
    // silencieusement.
    const EXPECTED = [
      "rule-assurance-vie-990i-757b-2026-v1",
      "rule-bank-import-demo-2026-v1",
      "rule-donation-usufruit-2026-v1",
      "rule-per-deduction-2026-v2",
      "rule-per-early-exit-primary-home-2026-v1",
      "rule-product-adequacy-demo-2026-v1",
      "rule-sci-arbitrage-2026-v2",
      "rule-succession-checklist-2026-v1",
      "rule-succession-liquidity-stress-2026-v1",
    ].sort();
    expect([...draftRuleIdsConsumedByRuns()].sort()).toEqual(EXPECTED);
  });
});
