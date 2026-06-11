import { demoTenant } from "../../demo-data/v1";
import { demoHousehold } from "../../demo-data/household";
import { createTaxRunFactory, makeStep } from "../engine-kit";
import { PFU_TOTAL_RATE_2026 } from "./pfu-arbitrage";

/**
 * Exit tax — art. 167 bis CGI, vérifié le 11/06/2026 (Légifrance
 * LEGIARTI000048806379) :
 * - champ : domiciliation fiscale en France ≥ 6 des 10 dernières années, et
 *   participations ≥ 50 % des bénéfices d'une société OU valeur globale des
 *   titres ≥ 800 000 € ;
 * - imposition des plus-values latentes comme en cas de cession (PFU 31,4 %) ;
 * - sursis de paiement automatique vers l'UE/EEE, sur demande avec garanties
 *   ailleurs ; dégrèvement après 2 ans (5 ans si titres > 2,57 M€).
 * Moteur signal : il alerte et documente, il ne liquide pas — revue avocat.
 */

export const EXIT_TAX_GAINS_THRESHOLD = 800_000;
export const EXIT_TAX_OWNERSHIP_THRESHOLD = 50;
export const EXIT_TAX_EXTENDED_RELIEF_THRESHOLD = 2_570_000;

export type ExitTaxInput = {
  latentGains?: number;
  ownershipPercent?: number;
  shareValue?: number;
  destinationInEea?: boolean;
  yearsResidentInLastTen?: number;
};

export function computeExitTaxSignal({
  latentGains = 900_000,
  ownershipPercent = 30,
  shareValue = 1_200_000,
  destinationInEea = true,
  yearsResidentInLastTen = 8,
}: ExitTaxInput = {}) {
  const residencyConditionMet = yearsResidentInLastTen >= 6;
  const gainsThresholdMet = latentGains >= EXIT_TAX_GAINS_THRESHOLD;
  const ownershipThresholdMet = ownershipPercent >= EXIT_TAX_OWNERSHIP_THRESHOLD;
  const inScope = residencyConditionMet && (gainsThresholdMet || ownershipThresholdMet);
  const indicativeTaxAtPfu = inScope ? Math.round(latentGains * PFU_TOTAL_RATE_2026) : 0;
  const automaticDeferral = destinationInEea;
  const reliefYears = shareValue > EXIT_TAX_EXTENDED_RELIEF_THRESHOLD ? 5 : 2;

  return {
    latentGains,
    ownershipPercent,
    shareValue,
    destinationInEea,
    yearsResidentInLastTen,
    residencyConditionMet,
    gainsThresholdMet,
    ownershipThresholdMet,
    inScope,
    indicativeTaxAtPfu,
    automaticDeferral,
    reliefYears,
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

const RULE_ID = "rule-exit-tax-2026-v1";
const SOURCE = "src-legifrance-cgi-167-bis-2026";
const COVERAGE = ["coverage-exit-tax-signal"];

export function simulateExitTaxSignal(input: ExitTaxInput = {}) {
  const result = computeExitTaxSignal(input);

  const steps = [
    makeStep({
      id: "exit-tax-step-scope",
      order: 1,
      label: "Champ d'application art. 167 bis",
      inputValue: `${result.latentGains} € de PV latentes / ${result.ownershipPercent} % de participation`,
      formula: "résidence ≥ 6/10 ans ET (PV latentes ≥ 800 000 € OU participation ≥ 50 %)",
      outputValue: result.inScope ? "Dans le champ de l'exit tax" : "Hors champ indicatif",
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Faire qualifier la composition exacte du portefeuille de titres par l'avocat.",
    }),
    makeStep({
      id: "exit-tax-step-tax",
      order: 2,
      label: "Imposition indicative des PV latentes",
      inputValue: result.latentGains,
      formula: "PV latentes × PFU 31,4 % (option barème possible)",
      outputValue: result.indicativeTaxAtPfu,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Chiffrage définitif par l'avocat fiscaliste (valeur des titres au départ).",
    }),
    makeStep({
      id: "exit-tax-step-deferral",
      order: 3,
      label: "Sursis de paiement",
      inputValue: result.destinationInEea ? "Destination UE/EEE" : "Destination hors UE/EEE",
      formula: "sursis automatique vers l'UE/EEE, sinon sur demande avec garanties",
      outputValue: result.automaticDeferral ? "Sursis automatique" : "Garanties à constituer",
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Préparer la déclaration 2074-ETD et les garanties éventuelles avant le départ.",
    }),
    makeStep({
      id: "exit-tax-step-relief",
      order: 4,
      label: "Dégrèvement de fin de période",
      inputValue: `titres ${result.shareValue} €`,
      formula: "dégrèvement après 2 ans (5 ans si valeur des titres > 2,57 M€) sans cession",
      outputValue: `${result.reliefYears} ans de conservation`,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Documenter le calendrier de conservation et les obligations déclaratives annuelles.",
    }),
  ];

  return taxRun({
    module: "exit-tax",
    scenario: "exit-tax",
    steps,
    resultLabel: result.inScope ? "Alerte exit tax : dossier avocat requis" : "Hors champ indicatif",
    resultAmount: result.indicativeTaxAtPfu,
    evidenceSourceIds: [SOURCE],
    reviewerRequired: "avocat",
    computedResult: { ...result },
  });
}
