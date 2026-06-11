import { demoTenant } from "../../demo-data/v1";
import { demoHousehold } from "../../demo-data/household";
import { createTaxRunFactory, makeStep } from "../engine-kit";
import { applyRate, fromCents, toCents } from "../money";

/**
 * Arbitrage PFU vs barème progressif sur dividendes et plus-values mobilières.
 *
 * Paramètres vérifiés le 11/06/2026 :
 * - LFSS 2026 (adoptée le 16/12/2025, art. 12) : prélèvements sociaux sur les
 *   revenus du capital portés de 17,2 % à 18,6 % → PFU global 31,4 %
 *   (12,8 % IR + 18,6 % PS). L'assurance-vie reste expressément à 17,2 %
 *   (PFU AV 30 %) — voir coverage limit dédiée.
 * - Au barème : abattement 40 % sur dividendes (art. 158-3-2° CGI), abattements
 *   50 %/65 % pour titres acquis avant 2018 (durée ≥ 2 / ≥ 8 ans), PS au taux
 *   `psRateAtBareme` (défaut 18,6 % depuis la LFSS 2026 ; 17,2 % reproduit les
 *   exemples antérieurs), CSG déductible 6,8 points (économie d'IR en N+1,
 *   affichée sans être déduite du total de l'année).
 */

export const PFU_INCOME_TAX_RATE = 0.128;
export const PFU_SOCIAL_RATE_2026 = 0.186;
export const PFU_TOTAL_RATE_2026 = PFU_INCOME_TAX_RATE + PFU_SOCIAL_RATE_2026;
export const DIVIDEND_ALLOWANCE_AT_BAREME = 0.4;
export const DEDUCTIBLE_CSG_RATE = 0.068;

export type PfuVsBaremeInput = {
  dividends?: number;
  /** Plus-values mobilières de cession. */
  gains?: number;
  /** Taux marginal d'imposition du foyer (0,11 / 0,30 / 0,41 / 0,45). */
  tmi?: number;
  /** PS appliqués en cas d'option barème — 18,6 % depuis la LFSS 2026. */
  psRateAtBareme?: number;
  /** Titres acquis avant le 1er janvier 2018 (abattements pour durée). */
  titlesPre2018?: boolean;
  holdingYears?: number;
};

export function computePfuVsBareme({
  dividends = 1_000,
  gains = 0,
  tmi = 0.3,
  psRateAtBareme = PFU_SOCIAL_RATE_2026,
  titlesPre2018 = false,
  holdingYears = 0,
}: PfuVsBaremeInput = {}) {
  const dividendsCents = toCents(Math.max(0, dividends));
  const gainsCents = toCents(Math.max(0, gains));
  const totalIncomeCents = dividendsCents + gainsCents;

  // Option 1 : PFU 31,4 % (12,8 + 18,6).
  const pfuIncomeTaxCents = applyRate(totalIncomeCents, PFU_INCOME_TAX_RATE);
  const pfuSocialCents = applyRate(totalIncomeCents, PFU_SOCIAL_RATE_2026);
  const pfuTotalCents = pfuIncomeTaxCents + pfuSocialCents;

  // Option 2 : barème progressif.
  const gainsAllowanceRate = titlesPre2018 ? (holdingYears >= 8 ? 0.65 : holdingYears >= 2 ? 0.5 : 0) : 0;
  const taxableDividendsCents = applyRate(dividendsCents, 1 - DIVIDEND_ALLOWANCE_AT_BAREME);
  const taxableGainsCents = applyRate(gainsCents, 1 - gainsAllowanceRate);
  const baremeIncomeTaxCents = applyRate(taxableDividendsCents + taxableGainsCents, tmi);
  const baremeSocialCents = applyRate(totalIncomeCents, psRateAtBareme);
  const baremeTotalCents = baremeIncomeTaxCents + baremeSocialCents;
  // CSG déductible : économie d'IR l'année suivante, non déduite du total N.
  const deductibleCsgSavingCents = applyRate(applyRate(totalIncomeCents, DEDUCTIBLE_CSG_RATE), tmi);

  const winner = pfuTotalCents <= baremeTotalCents ? "pfu" : "bareme";

  return {
    dividends,
    gains,
    tmi,
    psRateAtBareme,
    titlesPre2018,
    holdingYears,
    gainsAllowanceRate,
    pfuIncomeTax: fromCents(pfuIncomeTaxCents),
    pfuSocial: fromCents(pfuSocialCents),
    pfuTotal: fromCents(pfuTotalCents),
    baremeIncomeTax: fromCents(baremeIncomeTaxCents),
    baremeSocial: fromCents(baremeSocialCents),
    baremeTotal: fromCents(baremeTotalCents),
    deductibleCsgSaving: fromCents(deductibleCsgSavingCents),
    winner,
    delta: fromCents(Math.abs(pfuTotalCents - baremeTotalCents)),
  };
}

const taxRun = createTaxRunFactory({
  tenantId: demoTenant.id,
  caseId: "case-claire-marc-2026",
  householdId: demoHousehold.id,
  dossierSnapshotId: "snapshot-dossier-claire-marc-v2",
  runIdSuffix: "claire-marc-v3",
  createdAt: "2026-06-11T09:00:00.000Z",
});

const RULE_ID = "rule-pfu-arbitrage-2026-v1";
const SOURCE_PFU = "src-service-public-pfu-2026";
const SOURCE_LFSS = "src-legifrance-lfss-2026-ps-capital";
const COVERAGE = ["coverage-pfu-arbitrage-2026"];

export function simulatePfuVsBareme(input: PfuVsBaremeInput = {}) {
  const result = computePfuVsBareme(input);

  const steps = [
    makeStep({
      id: "pfu-step-flat",
      order: 1,
      label: "Option PFU 31,4 %",
      inputValue: `${result.dividends + result.gains} €`,
      formula: "12,8 % IR + 18,6 % PS (LFSS 2026) — assurance-vie maintenue à 30 %",
      outputValue: result.pfuTotal,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_LFSS,
      coverageLimitIds: [...COVERAGE, "coverage-pfu-assurance-vie-30"],
    }),
    makeStep({
      id: "pfu-step-bareme-ir",
      order: 2,
      label: "Option barème : IR après abattements",
      inputValue: `dividendes ${result.dividends} € / PV ${result.gains} €`,
      formula: `abattement 40 % dividendes${
        result.gainsAllowanceRate > 0 ? ` · ${Math.round(result.gainsAllowanceRate * 100)} % titres pré-2018` : ""
      } × TMI ${Math.round(result.tmi * 100)} %`,
      outputValue: result.baremeIncomeTax,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_PFU,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "pfu-step-bareme-ps",
      order: 3,
      label: "Option barème : prélèvements sociaux",
      inputValue: `${result.dividends + result.gains} €`,
      formula: `revenus bruts × ${(result.psRateAtBareme * 100).toLocaleString("fr-FR")} %`,
      outputValue: result.baremeSocial,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_LFSS,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.psRateAtBareme !== PFU_SOCIAL_RATE_2026 ? "needs_review" : "indicative",
      nextAction: "Confirmer le taux de PS applicable à l'assiette au jour du fait générateur.",
    }),
    makeStep({
      id: "pfu-step-csg-deductible",
      order: 4,
      label: "CSG déductible 6,8 % (info N+1)",
      inputValue: `${result.dividends + result.gains} €`,
      formula: "6,8 % × revenus × TMI = économie d'IR l'année suivante (non déduite ici)",
      outputValue: result.deductibleCsgSaving,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_PFU,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Intégrer l'effet CSG déductible dans la comparaison pluriannuelle.",
    }),
    makeStep({
      id: "pfu-step-winner",
      order: 5,
      label: "Option indicativement favorable",
      inputValue: `PFU ${result.pfuTotal} € / barème ${result.baremeTotal} €`,
      formula: "comparaison côte à côte, option globale et irrévocable pour l'année",
      outputValue: result.winner === "pfu" ? "PFU favorable" : "Barème favorable",
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_PFU,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "L'option barème est globale pour tous les revenus de capitaux : valider sur l'avis complet.",
    }),
  ];

  return taxRun({
    module: "pfu-arbitrage",
    scenario: "pfu",
    steps,
    resultLabel: result.winner === "pfu" ? "PFU indicativement favorable" : "Barème indicativement favorable",
    resultAmount: Math.min(result.pfuTotal, result.baremeTotal),
    evidenceSourceIds: [SOURCE_PFU, SOURCE_LFSS],
    reviewerRequired: "avocat",
    computedResult: { ...result },
  });
}
