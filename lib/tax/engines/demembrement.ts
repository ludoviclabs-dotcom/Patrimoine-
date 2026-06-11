import { demoTenant } from "../../demo-data/v1";
import { demoHousehold } from "../../demo-data/household";
import { createTaxRunFactory, getBareOwnershipRate, makeStep } from "../engine-kit";
import { computeDmtgForShare, DMTG_RELATIONSHIP_LABELS, type DmtgRelationship } from "./dmtg";

/**
 * Démembrement de propriété — art. 669 CGI (vérifié le 11/06/2026 sur
 * Légifrance, LEGIARTI000006310173) :
 * - usufruit viager : barème décennal selon l'âge de l'usufruitier
 *   (usufruit 90 % → 10 %, nue-propriété complémentaire) ;
 * - usufruit temporaire : 23 % de la pleine propriété par période de dix ans
 *   entamée, sans pouvoir excéder la valeur de l'usufruit viager.
 * Les droits sur la nue-propriété transmise sont chaînés sur le moteur DMTG.
 * Note IFI : l'usufruitier déclare en principe la pleine propriété (art. 968
 * CGI, exceptions notamment en cas d'usufruit légal du conjoint) — coverage.
 */

export type DemembrementInput = {
  mode?: "viager" | "temporaire";
  usufructuaryAge?: number;
  temporaryYears?: number;
  fullOwnershipValue?: number;
  relationship?: DmtgRelationship;
  priorDonationsWithin15Years?: number;
};

export function computeDemembrement({
  mode = "viager",
  usufructuaryAge = 65,
  temporaryYears = 10,
  fullOwnershipValue = 400_000,
  relationship = "direct-line" as DmtgRelationship,
  priorDonationsWithin15Years = 0,
}: DemembrementInput = {}) {
  const viagerBareRate = getBareOwnershipRate(usufructuaryAge);
  const viagerUsufructRate = 1 - viagerBareRate;

  const startedDecades = Math.max(1, Math.ceil(Math.max(1, temporaryYears) / 10));
  const rawTemporaryRate = Math.min(0.9, startedDecades * 0.23);
  const temporaryCappedByViager = rawTemporaryRate > viagerUsufructRate;
  const temporaryUsufructRate = Math.min(rawTemporaryRate, viagerUsufructRate);

  const usufructRate = mode === "viager" ? viagerUsufructRate : temporaryUsufructRate;
  const bareRate = 1 - usufructRate;
  const usufructValue = Math.round(fullOwnershipValue * usufructRate);
  const bareOwnershipValue = fullOwnershipValue - usufructValue;

  const dmtg = computeDmtgForShare({
    grossShare: bareOwnershipValue,
    relationship,
    priorDonationsWithin15Years,
  });

  return {
    mode,
    usufructuaryAge,
    temporaryYears,
    fullOwnershipValue,
    relationship,
    viagerUsufructRate,
    startedDecades,
    rawTemporaryRate,
    temporaryCappedByViager: mode === "temporaire" && temporaryCappedByViager,
    usufructRate,
    bareRate,
    usufructValue,
    bareOwnershipValue,
    availableAllowance: dmtg.availableAllowance,
    taxableShare: dmtg.taxableShare,
    indicativeRights: dmtg.tax,
    dmtgMarginalRate: dmtg.marginalRate,
    exempt: dmtg.exempt,
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

const RULE_ID = "rule-demembrement-669-2026-v1";
const RULE_DMTG = "rule-dmtg-bareme-2026-v1";
const SOURCE_669 = "src-legifrance-cgi-669-2026";
const SOURCE_DMTG = "src-impots-dmtg-bareme-2026";
const COVERAGE = ["coverage-donation-usufruit-simple", "coverage-demembrement-ifi-968"];

export function simulateDemembrement(input: DemembrementInput = {}) {
  const result = computeDemembrement(input);

  const steps = [
    makeStep({
      id: "demembrement-step-rate",
      order: 1,
      label:
        result.mode === "viager"
          ? "Barème viager art. 669 I"
          : "Usufruit temporaire art. 669 II",
      inputValue:
        result.mode === "viager"
          ? `${result.usufructuaryAge} ans`
          : `${result.temporaryYears} ans (${result.startedDecades} décennie(s) entamée(s))`,
      formula:
        result.mode === "viager"
          ? "usufruit par tranche d'âge décennale"
          : "23 % de la pleine propriété par décennie entamée, plafonné au viager",
      outputValue: `usufruit ${Math.round(result.usufructRate * 100)} % / NP ${Math.round(result.bareRate * 100)} %`,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_669,
      coverageLimitIds: COVERAGE,
      confidenceStatus: result.temporaryCappedByViager ? "needs_review" : "indicative",
      nextAction: result.temporaryCappedByViager
        ? "Plafond viager appliqué : faire valider la durée et l'âge par le notaire."
        : "Vérifier l'âge de l'usufruitier à la date de l'acte.",
    }),
    makeStep({
      id: "demembrement-step-values",
      order: 2,
      label: "Valeurs fiscales usufruit / nue-propriété",
      inputValue: result.fullOwnershipValue,
      formula: `pleine propriété × ${Math.round(result.usufructRate * 100)} % / × ${Math.round(result.bareRate * 100)} %`,
      outputValue: `${result.usufructValue} € / ${result.bareOwnershipValue} €`,
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_669,
      coverageLimitIds: COVERAGE,
    }),
    makeStep({
      id: "demembrement-step-allowance",
      order: 3,
      label: `Abattement ${DMTG_RELATIONSHIP_LABELS[result.relationship]}`,
      inputValue: result.bareOwnershipValue,
      formula: "nue-propriété − abattement disponible (rappel fiscal 15 ans)",
      outputValue: result.taxableShare,
      ruleVersionId: RULE_DMTG,
      evidenceSourceId: SOURCE_DMTG,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Vérifier les donations antérieures de moins de 15 ans (art. 784).",
    }),
    makeStep({
      id: "demembrement-step-rights",
      order: 4,
      label: "Droits indicatifs sur la nue-propriété",
      inputValue: result.taxableShare,
      formula: "barème DMTG du lien de parenté, arrondi par tranche",
      outputValue: result.indicativeRights,
      ruleVersionId: RULE_DMTG,
      evidenceSourceId: SOURCE_DMTG,
      coverageLimitIds: COVERAGE,
      confidenceStatus: "needs_review",
      nextAction: "Faire liquider les droits par le notaire avant tout acte.",
    }),
    makeStep({
      id: "demembrement-step-ifi",
      order: 5,
      label: "Alerte IFI art. 968",
      inputValue: "Usufruitier",
      formula: "l'usufruitier déclare en principe la pleine propriété à l'IFI",
      outputValue: "Répartition IFI à vérifier",
      ruleVersionId: RULE_ID,
      evidenceSourceId: SOURCE_669,
      coverageLimitIds: ["coverage-demembrement-ifi-968"],
      confidenceStatus: "needs_review",
      nextAction: "Vérifier les exceptions art. 968 (usufruit légal du conjoint survivant…).",
    }),
  ];

  if (result.mode === "temporaire") {
    steps.push(
      makeStep({
        id: "demembrement-step-decennial",
        order: 6,
        label: "Alerte anniversaire décennal",
        inputValue: `${result.temporaryYears} ans`,
        formula: "chaque décennie entamée ajoute 23 % à la valeur de l'usufruit",
        outputValue: `${result.startedDecades} décennie(s) → ${Math.round(result.rawTemporaryRate * 100)} % avant plafond`,
        ruleVersionId: RULE_ID,
        evidenceSourceId: SOURCE_669,
        coverageLimitIds: COVERAGE,
        confidenceStatus: "needs_review",
        nextAction: "Caler la durée de l'usufruit juste sous le seuil décennal si pertinent (revue notaire).",
      }),
    );
  }

  return taxRun({
    module: "demembrement",
    scenario: "demembrement",
    steps,
    resultLabel: `NP ${Math.round(result.bareRate * 100)} % · ${DMTG_RELATIONSHIP_LABELS[result.relationship]}`,
    resultAmount: result.indicativeRights,
    evidenceSourceIds: [SOURCE_669, SOURCE_DMTG],
    reviewerRequired: "notaire",
    computedResult: { ...result },
  });
}
