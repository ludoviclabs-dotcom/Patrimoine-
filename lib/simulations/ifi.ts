import { demoHousehold } from "../demo-data/household";
import { getBareOwnershipRate } from "../tax/engine-kit";
import { fullYearsBetweenIso } from "../tax/holding-tax-assets";
import type { Asset, CalculationStep, Household, IfiResult, Liability, SimulationRun } from "../types";

/**
 * PF-02B1 : complète le moteur IFI V2 (barème, décote, plafonnement 75 %,
 * résidence principale, dettes simples) avec les branches déterministes
 * documentées mais non implémentées :
 * - démembrement art. 968 (règle générale + exceptions limitatives, répartition art. 669) ;
 * - dettes in fine / sans terme / dettes liées (art. 974) ;
 * - plafonnement des dettes > 60 % d'un patrimoine > 5 M€ (art. 974, IV) ;
 * - actifs professionnels déclarés (art. 975), exclusion sur déclaration
 *   assortie d'une revue documentaire obligatoire, jamais automatique.
 * Sources vérifiées le 19/08/2026 sur legifrance.gouv.fr (art. 968, 974, 975)
 * en complément de `docs/reference/2026-08/MOTEURS_FISCAUX_2026.ts` § 4 (baseline
 * gelée le 18/08/2026, CGI art. 964 à 983, BOFiP PAT-IFI).
 */

const RULE_ID = "rule-ifi-complete-2026-v3";
const SOURCE_ID = "src-service-public-ifi-2026";
const SOURCE_ID_ADVANCED = "src-legifrance-bofip-ifi-avance-2026";
const THRESHOLD = 1_300_000;
const DISCOUNT_MAX_BASE = 1_400_000;
const CAP_RATE = 0.75;
/** Réduction d'un vingtième par an pour un prêt sans terme (CGI art. 974). */
const NO_TERM_DEBT_DIVISOR_YEARS = 20;
/** Seuils du plafonnement des dettes (CGI art. 974, IV). */
const DEBT_CAP_ASSET_THRESHOLD = 5_000_000;
const DEBT_CAP_RATIO = 0.6;
const DEBT_CAP_EXCESS_RATE = 0.5;

type IfiOptions = {
  annualIncome?: number;
  otherTaxes?: number;
  /** Date de valorisation (ISO), requise pour liquider un prêt in fine ou sans terme. Jamais déduite de l'horloge système. */
  valuationDate?: string;
  /** Permet d'écarter le plafonnement des dettes > 60 % si le motif non principalement fiscal est prouvé. */
  excessiveDebtNonTaxPurposeProven?: boolean;
};

function numberOrNull(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

type IfiAssetAllocation = {
  adjustedValue: number;
  professionalExempt: boolean;
  dismembermentBranch: "none" | "general-rule" | "article-968-exception";
};

/**
 * Alloue la valeur taxable d'un actif immobilier IFI :
 * 1. actif professionnel déclaré → exclu, revue documentaire obligatoire (art. 975) ;
 * 2. pleine propriété (par défaut) → valeur entière, comportement inchangé ;
 * 3. démembré sans exception reconnue ou sans âge d'usufruitier → règle générale
 *    art. 968 : pleine valeur chez l'usufruitier, rien chez le nu-propriétaire ;
 * 4. démembré avec exception limitative documentée ET âge fourni → répartition
 *    art. 669 via le barème déjà sourcé `getBareOwnershipRate`.
 */
function allocateIfiAsset(asset: Asset): IfiAssetAllocation {
  if (asset.isProfessionalAsset) {
    return { adjustedValue: 0, professionalExempt: true, dismembermentBranch: "none" };
  }

  const right = asset.ifiOwnershipRight ?? "full-owner";
  if (right === "full-owner") {
    return { adjustedValue: asset.value, professionalExempt: false, dismembermentBranch: "none" };
  }

  const recognizedException =
    asset.ifiDismembermentBasis === "legal-usufruct-surviving-spouse" ||
    asset.ifiDismembermentBasis === "sale-with-reserved-usufruct-unrelated-third-party";

  if (recognizedException && typeof asset.ifiUsufructuaryAge === "number") {
    const bareOwnershipRate = getBareOwnershipRate(asset.ifiUsufructuaryAge);
    const rate = right === "usufructuary" ? 1 - bareOwnershipRate : bareOwnershipRate;
    return {
      adjustedValue: Math.round(asset.value * rate),
      professionalExempt: false,
      dismembermentBranch: "article-968-exception",
    };
  }

  const rate = right === "usufructuary" ? 1 : 0;
  return { adjustedValue: asset.value * rate, professionalExempt: false, dismembermentBranch: "general-rule" };
}

type IfiDebtAdmission = {
  liability: Liability;
  admitted: number;
  status: "amortising-default" | "computed" | "related-party-unproven" | "insufficient-data";
};

/**
 * Détermine le montant de dette admis avant plafonnement global (art. 974) :
 * - dette liée sans preuve d'objectif non principalement fiscal → non admise ;
 * - modalité par défaut ("amortising", comportement historique) → `value` fait foi ;
 * - in fine / échéances non constantes ou sans terme → amortissement légal, jamais
 *   estimé : une date ou un capital manquant rend la dette non admise et signalée,
 *   sans jamais présumer la date du jour.
 */
function admitIfiDebt(liability: Liability, valuationDate: string | undefined): IfiDebtAdmission {
  if (liability.ifiRelatedPartyDebt && !liability.ifiNonTaxPurposeProven) {
    return { liability, admitted: 0, status: "related-party-unproven" };
  }

  const repaymentKind = liability.ifiRepaymentKind ?? "amortising";
  if (repaymentKind === "amortising") {
    return { liability, admitted: liability.value, status: "amortising-default" };
  }

  if (!valuationDate || typeof liability.ifiOriginalPrincipal !== "number" || !liability.ifiDisbursementDate) {
    return { liability, admitted: 0, status: "insufficient-data" };
  }

  const elapsedYears = fullYearsBetweenIso(liability.ifiDisbursementDate, valuationDate);

  if (repaymentKind === "no-term") {
    return {
      liability,
      admitted: Math.max(0, liability.ifiOriginalPrincipal * (1 - elapsedYears / NO_TERM_DEBT_DIVISOR_YEARS)),
      status: "computed",
    };
  }

  if (!liability.ifiContractualEndDate) {
    return { liability, admitted: 0, status: "insufficient-data" };
  }
  const totalYears = Math.max(1, fullYearsBetweenIso(liability.ifiDisbursementDate, liability.ifiContractualEndDate));
  return {
    liability,
    admitted: Math.max(0, liability.ifiOriginalPrincipal * (1 - elapsedYears / totalYears)),
    status: "computed",
  };
}

export function calculateIfi(
  household: Household = demoHousehold,
  options: IfiOptions = {},
): SimulationRun & {
  result: IfiResult;
} {
  const realEstateAssets = household.assets.filter(
    (asset) => asset.category === "real-estate",
  );
  const missingValue = realEstateAssets.some((asset) => numberOrNull(asset.value) === null);
  const flatDeductibleDebt = household.liabilities
    .filter((liability) => liability.linkedCategory === "real-estate")
    .reduce((sum, liability) => sum + liability.value, 0);

  if (missingValue) {
    return {
      id: "run-ifi-demo",
      scenario: "ifi",
      householdId: household.id,
      status: "needs_review",
      createdAt: "2026-05-26T09:00:00.000Z",
      steps: [
        createStep(
          "ifi-step-missing",
          1,
          "Donnees immobilieres incompletes",
          "Valeur manquante",
          "Abstention deterministe",
          "Controle requis",
          "needs_review",
          {
            coverageLimitIds: ["coverage-ifi-rental-simple", "coverage-ifi-sci-simple"],
            nextAction: "Completer les valeurs immobilieres avant de relancer la simulation.",
          },
        ),
      ],
      result: {
        threshold: THRESHOLD,
        taxableBase: null,
        taxableRealEstateBeforeDebt: null,
        deductibleDebt: flatDeductibleDebt,
        triggered: null,
        message: "Simulation suspendue : une valeur immobiliere manque au dossier.",
      },
    };
  }

  const allocationById = new Map(realEstateAssets.map((asset) => [asset.id, allocateIfiAsset(asset)]));
  const adjustedValue = (asset: Asset) => allocationById.get(asset.id)!.adjustedValue;

  const directMainResidence = realEstateAssets
    .filter((asset) => asset.ifiKind === "main-residence" && asset.isDirectlyHeld !== false)
    .reduce((sum, asset) => sum + adjustedValue(asset), 0);
  const indirectMainResidence = realEstateAssets
    .filter((asset) => asset.ifiKind === "main-residence" && asset.isDirectlyHeld === false)
    .reduce((sum, asset) => sum + adjustedValue(asset), 0);
  const mainResidenceTaxable = Math.round(directMainResidence * 0.7);
  const rental = realEstateAssets
    .filter((asset) => asset.ifiKind === "rental")
    .reduce((sum, asset) => sum + adjustedValue(asset), 0);
  const sci = realEstateAssets
    .filter((asset) => asset.ifiKind === "sci")
    .reduce((sum, asset) => sum + adjustedValue(asset), 0);
  const other = realEstateAssets
    .filter((asset) => !["main-residence", "rental", "sci"].includes(asset.ifiKind ?? ""))
    .reduce((sum, asset) => sum + adjustedValue(asset), 0);
  const taxableRealEstateBeforeDebt =
    mainResidenceTaxable + indirectMainResidence + rental + sci + other;

  const professionalAssetsExcludedValue = realEstateAssets
    .filter((asset) => allocationById.get(asset.id)!.professionalExempt)
    .reduce((sum, asset) => sum + asset.value, 0);
  const generalRuleDismembermentAssets = realEstateAssets.filter(
    (asset) => allocationById.get(asset.id)!.dismembermentBranch === "general-rule",
  );
  const exceptionDismembermentAssets = realEstateAssets.filter(
    (asset) => allocationById.get(asset.id)!.dismembermentBranch === "article-968-exception",
  );

  const realEstateLiabilities = household.liabilities.filter(
    (liability) => liability.linkedCategory === "real-estate",
  );
  const debtAdmissions = realEstateLiabilities.map((liability) =>
    admitIfiDebt(liability, options.valuationDate),
  );
  const debtBeforeGlobalCap = debtAdmissions.reduce((sum, admission) => sum + admission.admitted, 0);
  const sixtyPercentOfGross = taxableRealEstateBeforeDebt * DEBT_CAP_RATIO;
  const debtCapEligible =
    taxableRealEstateBeforeDebt > DEBT_CAP_ASSET_THRESHOLD &&
    debtBeforeGlobalCap > sixtyPercentOfGross &&
    !options.excessiveDebtNonTaxPurposeProven;
  const debtAfterGlobalCapRaw = debtCapEligible
    ? sixtyPercentOfGross + (debtBeforeGlobalCap - sixtyPercentOfGross) * DEBT_CAP_EXCESS_RATE
    : debtBeforeGlobalCap;
  const debtAfterGlobalCap = Math.min(taxableRealEstateBeforeDebt, debtAfterGlobalCapRaw);
  const debtCapReduction = Math.max(0, debtBeforeGlobalCap - debtAfterGlobalCap);
  const deductibleDebt = debtAfterGlobalCap;

  const taxableBase = Math.max(0, taxableRealEstateBeforeDebt - deductibleDebt);
  const triggered = taxableBase > THRESHOLD;
  const grossIfi = triggered ? calculateProgressiveIfi(taxableBase) : 0;
  const discount =
    triggered && taxableBase <= DISCOUNT_MAX_BASE
      ? Math.max(0, Math.round(17_500 - taxableBase * 0.0125))
      : 0;
  const ifiAfterDiscount = Math.max(0, grossIfi - discount);
  const capLimit =
    options.annualIncome && options.annualIncome > 0
      ? Math.round(options.annualIncome * CAP_RATE)
      : null;
  const taxBeforeCap = ifiAfterDiscount + (options.otherTaxes ?? 0);
  const capApplied = Boolean(capLimit !== null && taxBeforeCap > capLimit);
  const cappedIfi =
    capLimit !== null && capApplied ? Math.max(0, capLimit - (options.otherTaxes ?? 0)) : ifiAfterDiscount;
  const netIfi = Math.max(0, cappedIfi);

  const stepBuilders: Array<(order: number) => CalculationStep> = [
    (order) =>
      createStep(
        "ifi-step-main-residence",
        order,
        "Résidence principale détenue en direct",
        directMainResidence,
        "Valeur declaree x 70 %",
        mainResidenceTaxable,
        "indicative",
        {
          usedData: ["Résidence principale déclarée", "Détention directe", "Abattement résidence principale"],
          intermediateResult: `${directMainResidence} x 70 % = ${mainResidenceTaxable}`,
          coverageLimitIds: ["coverage-ifi-main-residence"],
          nextAction: "Confirmer la détention directe et la valeur avec un avis récent.",
        },
      ),
    (order) =>
      createStep(
        "ifi-step-indirect-main-residence",
        order,
        "Résidence principale via société ou SCI",
        indirectMainResidence,
        "Pas d'abattement automatique dans le moteur V2",
        indirectMainResidence,
        indirectMainResidence > 0 ? "needs_review" : "indicative",
        {
          usedData: ["Biens indiqués comme résidence principale hors détention directe"],
          intermediateResult: `${indirectMainResidence}`,
          coverageLimitIds: ["coverage-ifi-sci-simple", "coverage-ifi-main-residence"],
          nextAction: "Valider la structure de détention avant d'appliquer un abattement.",
        },
      ),
    (order) =>
      createStep(
        "ifi-step-rental",
        order,
        "Immobilier locatif",
        rental,
        "Valeur immobiliere retenue",
        rental,
        "indicative",
        {
          usedData: ["Immobilier locatif déclaré"],
          intermediateResult: `${rental}`,
          coverageLimitIds: ["coverage-ifi-rental-simple"],
          nextAction: "Vérifier titres, baux et valorisation retenue.",
        },
      ),
    (order) =>
      createStep(
        "ifi-step-sci",
        order,
        "Parts SCI immobilière",
        sci,
        "Valeur immobilière à contrôler",
        sci,
        "needs_review",
        {
          usedData: ["Parts SCI déclarées"],
          intermediateResult: `${sci}`,
          coverageLimitIds: ["coverage-ifi-sci-simple", "coverage-ifi-holdings"],
          nextAction: "Confirmer la répartition des parts et les actifs immobiliers sous-jacents.",
        },
      ),
  ];

  if (professionalAssetsExcludedValue > 0) {
    stepBuilders.push((order) =>
      createStep(
        "ifi-step-professional-assets",
        order,
        "Actifs professionnels déclarés exclus",
        professionalAssetsExcludedValue,
        "Exclusion sur déclaration — CGI art. 975, à documenter chaque année",
        0,
        "needs_review",
        {
          usedData: ["Actifs immobiliers déclarés comme professionnels"],
          intermediateResult: `${professionalAssetsExcludedValue} exclu(s) de l'assiette, sous réserve de justification annuelle`,
          coverageLimitIds: ["coverage-ifi-actifs-pro-complexes"],
          nextAction:
            "Faire valider chaque année l'affectation professionnelle exclusive par l'expert-comptable (CGI art. 975).",
          evidenceSourceId: SOURCE_ID_ADVANCED,
        },
      ),
    );
  }

  if (generalRuleDismembermentAssets.length > 0) {
    const generalRuleValue = generalRuleDismembermentAssets.reduce((sum, asset) => sum + adjustedValue(asset), 0);
    stepBuilders.push((order) =>
      createStep(
        "ifi-step-dismemberment-general-rule",
        order,
        "Démembrement — règle générale art. 968",
        generalRuleDismembermentAssets.map((asset) => asset.label).join(", "),
        "Pleine valeur chez l'usufruitier, rien chez le nu-propriétaire, sauf exception limitative",
        generalRuleValue,
        "needs_review",
        {
          usedData: ["Droit démembré déclaré", "Absence d'exception art. 968 documentée"],
          intermediateResult: `${generalRuleDismembermentAssets.length} actif(s) démembré(s) sans exception reconnue`,
          coverageLimitIds: ["coverage-ifi-demembrement-complexe"],
          nextAction:
            "Vérifier qu'aucune exception art. 968 (usufruit légal du conjoint survivant, vente avec réserve d'usufruit à un tiers non lié) ne s'applique.",
          evidenceSourceId: SOURCE_ID_ADVANCED,
        },
      ),
    );
  }

  if (exceptionDismembermentAssets.length > 0) {
    const exceptionValue = exceptionDismembermentAssets.reduce((sum, asset) => sum + adjustedValue(asset), 0);
    stepBuilders.push((order) =>
      createStep(
        "ifi-step-dismemberment-exception",
        order,
        "Démembrement — exception art. 968 (répartition art. 669)",
        exceptionDismembermentAssets.map((asset) => asset.label).join(", "),
        "Barème art. 669 selon l'âge de l'usufruitier",
        exceptionValue,
        "needs_review",
        {
          usedData: ["Fondement légal de l'exception", "Âge de l'usufruitier"],
          intermediateResult: `${exceptionDismembermentAssets.length} actif(s) réparti(s) selon le barème art. 669`,
          coverageLimitIds: ["coverage-ifi-demembrement-complexe"],
          nextAction: "Conserver l'acte et le fondement légal de l'exception dans le dossier de preuve.",
          evidenceSourceId: SOURCE_ID_ADVANCED,
        },
      ),
    );
  }

  stepBuilders.push((order) =>
    createStep(
      "ifi-step-subtotal",
      order,
      "Sous-total immobilier IFI",
      `${mainResidenceTaxable} + ${indirectMainResidence} + ${rental} + ${sci} + ${other}`,
      "Somme des valeurs retenues",
      taxableRealEstateBeforeDebt,
      "indicative",
      {
        usedData: ["Résidence principale", "Immobilier locatif", "Parts SCI"],
        intermediateResult: `${mainResidenceTaxable} + ${indirectMainResidence} + ${rental} + ${sci} + ${other} = ${taxableRealEstateBeforeDebt}`,
        coverageLimitIds: [
          "coverage-ifi-main-residence",
          "coverage-ifi-rental-simple",
          "coverage-ifi-sci-simple",
        ],
        nextAction: "Contrôler les cas non couverts avant conclusion.",
      },
    ),
  );

  stepBuilders.push((order) =>
    createStep(
      "ifi-step-debt",
      order,
      "Dettes immobilières déclarées",
      debtBeforeGlobalCap,
      "Sous conditions de deductibilite",
      -debtBeforeGlobalCap,
      "needs_review",
      {
        usedData: ["Dettes immobilières déclarées"],
        intermediateResult: `${taxableRealEstateBeforeDebt} - ${debtBeforeGlobalCap} (avant plafonnement art. 974, IV)`,
        coverageLimitIds: ["coverage-ifi-deductible-debt"],
        nextAction: "Vérifier la nature, le justificatif et la déductibilité de chaque dette.",
      },
    ),
  );

  const hasAdvancedDebtHandling = debtAdmissions.some(
    (admission) => admission.status !== "amortising-default",
  );
  if (hasAdvancedDebtHandling) {
    stepBuilders.push((order) =>
      createStep(
        "ifi-step-debt-advanced",
        order,
        "Dettes — prêts in fine, sans terme et dettes liées",
        debtAdmissions.length,
        "Amortissement légal (in fine/non constant) ; 1/20e par an (sans terme) ; dette liée exclue sauf preuve",
        debtBeforeGlobalCap,
        "needs_review",
        {
          usedData: ["Modalité de remboursement", "Capital initial", "Dates", "Caractère lié de la dette"],
          intermediateResult: debtAdmissions
            .map((admission) => `${admission.liability.label} : ${admission.admitted} (${admission.status})`)
            .join(" ; "),
          coverageLimitIds: ["coverage-ifi-deductible-debt"],
          nextAction:
            "Vérifier capital initial, dates et preuve d'objectif non principalement fiscal pour chaque dette signalée.",
          evidenceSourceId: SOURCE_ID_ADVANCED,
        },
      ),
    );
  }

  if (taxableRealEstateBeforeDebt > DEBT_CAP_ASSET_THRESHOLD) {
    stepBuilders.push((order) =>
      createStep(
        "ifi-step-debt-cap",
        order,
        "Plafonnement des dettes > 60 % (patrimoine > 5 M€)",
        debtBeforeGlobalCap,
        "60 % du patrimoine taxable + 50 % de l'excédent, sauf preuve d'un objectif non principalement fiscal",
        debtAfterGlobalCap,
        "needs_review",
        {
          usedData: ["Dettes admises avant plafonnement", "Patrimoine taxable brut"],
          intermediateResult: debtCapEligible
            ? `${Math.round(sixtyPercentOfGross)} + 50 % × (${Math.round(debtBeforeGlobalCap)} − ${Math.round(sixtyPercentOfGross)}) = ${Math.round(debtAfterGlobalCap)}`
            : `dettes ${Math.round(debtBeforeGlobalCap)} ≤ 60 % du patrimoine (${Math.round(sixtyPercentOfGross)}) : pas de plafonnement`,
          coverageLimitIds: ["coverage-ifi-deductible-debt"],
          nextAction: "Documenter, le cas échéant, le caractère non principalement fiscal de l'endettement.",
          evidenceSourceId: SOURCE_ID_ADVANCED,
        },
      ),
    );
  }

  stepBuilders.push((order) =>
    createStep(
      "ifi-step-threshold",
      order,
      "Base nette comparée au seuil",
      taxableBase,
      `Base nette ${triggered ? ">" : "<="} ${THRESHOLD}`,
      triggered ? "Alerte IFI" : "Sous seuil indicatif",
      "indicative",
      {
        usedData: ["Base IFI", "Seuil IFI"],
        intermediateResult: `${taxableBase} ${triggered ? ">" : "<="} ${THRESHOLD}`,
        coverageLimitIds: [
          "coverage-ifi-trusts",
          "coverage-ifi-demembrement-complexe",
          "coverage-ifi-actifs-pro-complexes",
          "coverage-ifi-non-residents-complexes",
        ],
        nextAction:
          "Faire relire les dettes, SCI et situations particulières avant usage professionnel.",
      },
    ),
  );

  stepBuilders.push((order) =>
    createStep(
      "ifi-step-scale-discount-cap",
      order,
      "Barème, décote et plafonnement",
      taxableBase,
      "barème progressif - décote éventuelle - plafonnement 75 %",
      netIfi,
      triggered ? "needs_review" : "indicative",
      {
        usedData: ["Base IFI", "Barème", "Décote 1,3-1,4 M€", "Plafonnement 75 % si revenu fourni"],
        intermediateResult: `IFI brut ${grossIfi} - décote ${discount} = ${ifiAfterDiscount}; IFI net ${netIfi}`,
        coverageLimitIds: ["coverage-ifi-main-residence", "coverage-ifi-deductible-debt"],
        nextAction: "Valider revenus, autres impôts et réductions avant émission d'un rapport.",
      },
    ),
  );

  const steps = stepBuilders.map((build, index) => build(index + 1));

  return {
    id: "run-ifi-demo",
    scenario: "ifi",
    householdId: household.id,
    status: "indicative",
    createdAt: "2026-05-26T09:00:00.000Z",
    steps,
    result: {
      threshold: THRESHOLD,
      taxableBase,
      taxableRealEstateBeforeDebt,
      deductibleDebt,
      triggered,
      grossIfi,
      discount,
      cappedIfi,
      netIfi,
      capApplied,
      professionalAssetsExcludedValue,
      debtBeforeGlobalCap,
      debtAfterGlobalCap,
      debtCapReduction,
      message: triggered
        ? "Alerte IFI : la base simplifiee depasse le seuil, revue professionnelle requise."
        : "Pas d'alerte immediate dans cette simulation, sous reserve de validation des dettes et situations particulieres.",
    },
  };
}

export function calculateProgressiveIfi(taxableBase: number) {
  const brackets = [
    { floor: 800_000, ceiling: 1_300_000, rate: 0.005 },
    { floor: 1_300_000, ceiling: 2_570_000, rate: 0.007 },
    { floor: 2_570_000, ceiling: 5_000_000, rate: 0.01 },
    { floor: 5_000_000, ceiling: 10_000_000, rate: 0.0125 },
    { floor: 10_000_000, ceiling: Number.POSITIVE_INFINITY, rate: 0.015 },
  ];

  return Math.round(
    brackets.reduce((sum, bracket) => {
      const taxableSlice = Math.max(0, Math.min(taxableBase, bracket.ceiling) - bracket.floor);
      return sum + taxableSlice * bracket.rate;
    }, 0),
  );
}

function createStep(
  id: string,
  order: number,
  label: string,
  inputValue: number | string,
  formula: string,
  outputValue: number | string,
  confidenceStatus: CalculationStep["confidenceStatus"],
  meta: Partial<
    Pick<
      CalculationStep,
      | "usedData"
      | "intermediateResult"
      | "coverageLimitIds"
      | "nextAction"
      | "displayStatus"
      | "evidenceSourceId"
    >
  > = {},
): CalculationStep {
  const statusByConfidence: Record<
    CalculationStep["confidenceStatus"],
    CalculationStep["displayStatus"]
  > = {
    validated: "validated_calculation",
    indicative: "indicative_calculation",
    needs_review: "professional_review_required",
  };

  return {
    id,
    order,
    label,
    inputValue,
    formula,
    outputValue,
    ruleVersionId: RULE_ID,
    evidenceSourceId: meta.evidenceSourceId ?? SOURCE_ID,
    confidenceStatus,
    usedData: meta.usedData ?? [label],
    intermediateResult: meta.intermediateResult ?? String(outputValue),
    coverageLimitIds: meta.coverageLimitIds ?? ["coverage-ifi-main-residence"],
    nextAction: meta.nextAction ?? "Conserver l'etape dans le dossier de preuve.",
    displayStatus: meta.displayStatus ?? statusByConfidence[confidenceStatus],
  };
}
