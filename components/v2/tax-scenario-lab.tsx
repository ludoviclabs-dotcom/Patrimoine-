"use client";

import { useMemo, useState } from "react";
import { Calculator, HelpCircle, Play } from "lucide-react";
import { CalculationSteps } from "@/components/calculation-steps";
import { LegalNotice } from "@/components/legal-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { WhyThisResultPanel } from "@/components/v1-1/why-this-result-panel";
import { CheckboxInput, NumberInput } from "@/components/v3/forms/fields";
import { defaultIrFormState, IrBracketsChart, IrForm } from "@/components/v3/forms/ir-form";
import { defaultPfuFormState, PfuComparisonChart, PfuForm } from "@/components/v3/forms/pfu-form";
import {
  defaultPvImmoFormState,
  PvAllowancesChart,
  PvImmoForm,
} from "@/components/v3/forms/pv-immo-form";
import { formatEuro } from "@/lib/format";
import { simulateIrBareme2026 } from "@/lib/tax/engines/ir";
import { simulatePfuVsBareme } from "@/lib/tax/engines/pfu-arbitrage";
import {
  simulateDutreilV2,
  simulateBankImportV2,
  simulateHoldingTaxV2,
  simulatePeaWithdrawalV2,
  simulatePerDeductionV2,
  simulatePerEarlyExitV24,
  simulateProductAdequacyV24,
  simulateRealEstateGainV2,
  simulateSuccessionChecklistV24,
  simulateSuccessionLiquidityStressV24,
  simulateTransmissionV2,
} from "@/lib/tax/v2-engines";
import { demoConnectorImport } from "@/lib/patrimonial-model/model";
import type { TaxRun } from "@/lib/types";

export type LabScenario =
  | "ir"
  | "pfu"
  | "plus-value"
  | "transmission"
  | "dutreil"
  | "holding-tax"
  | "pea"
  | "per"
  | "bank-import"
  | "succession-checklist"
  | "per-early-exit"
  | "succession-liquidity-stress"
  | "product-adequacy";

const scenarioLabels: Record<LabScenario, string> = {
  ir: "IR barème 2026",
  pfu: "PFU vs barème",
  "plus-value": "Plus-value",
  transmission: "Transmission",
  dutreil: "Dutreil",
  "holding-tax": "Taxe holding",
  pea: "PEA retrait après 5 ans",
  per: "PER déduction à l’entrée",
  "bank-import": "Import bancaire simulé",
  "succession-checklist": "Succession simple",
  "per-early-exit": "PER sortie anticipée",
  "succession-liquidity-stress": "Stress liquidité succession",
  "product-adequacy": "Adéquation produit",
};

export function TaxScenarioLab({ initialScenario = "dutreil" }: { initialScenario?: LabScenario }) {
  const [activeScenario, setActiveScenario] = useState<LabScenario>(initialScenario);
  const [showWhy, setShowWhy] = useState(true);
  const [runStatus, setRunStatus] = useState("Simulation prête à lancer");

  const [ir, setIr] = useState(defaultIrFormState);
  const [pfu, setPfu] = useState(defaultPfuFormState);
  const [realEstate, setRealEstate] = useState(defaultPvImmoFormState);
  const [transmission, setTransmission] = useState({
    assetValue: 300_000,
    donorAge: 51,
    children: 2,
    priorDonations: 0,
    useDismemberment: true,
    familyCashGift: 0,
  });
  const [dutreil, setDutreil] = useState({
    companyValue: 850_000,
    eligibleOperatingValue: 790_000,
    nonEligibleAssets: 60_000,
    excludedLuxuryAssetsValue: 0,
    collectiveCommitmentSigned: true,
    managementCommitmentSigned: true,
    individualCommitmentYears: 6,
  });
  const [holding, setHolding] = useState({
    isSubjectToCorporateTax: true,
    totalAssets: 5_400_000,
    passiveIncomePercent: 56,
    individualControlPercent: 72,
    luxuryAssetsValue: 420_000,
    financialAssetsValue: 0,
    realEstateLuxuryValue: 0,
    cashAndReceivablesValue: 0,
  });
  const [pea, setPea] = useState({
    yearsHeld: 7,
    withdrawnGains: 42_000,
    socialContributionRate: 17.2,
    partialWithdrawal: true,
  });
  const [per, setPer] = useState({
    voluntaryPayments: 18_000,
    annualCeiling: 12_000,
    unusedCeilingN1: 3_000,
    unusedCeilingN2: 2_400,
    unusedCeilingN3: 1_600,
    spouseMutualization: 4_000,
  });
  const [successionChecklist, setSuccessionChecklist] = useState({
    grossEstate: 1_150_000,
    children: 2,
    priorDonations: 80_000,
    hasRealEstate: true,
    hasWill: true,
    spousePresent: true,
    documentsReceived: 4,
    documentsExpected: 7,
  });
  const [perExit, setPerExit] = useState({
    capitalReleased: 80_000,
    voluntaryPayments: 62_000,
    gainPortion: 18_000,
    usedDeductionAtEntry: true,
    primaryResidencePurpose: true,
  });
  const [liquidityStress, setLiquidityStress] = useState({
    estimatedDuties: 145_000,
    cashAvailable: 90_000,
    reservedExpenses: 20_000,
    saleDelayMonths: 9,
  });
  const [adequacy, setAdequacy] = useState({
    horizonYears: 6,
    riskTolerance: 3,
    productRisk: 4,
    sustainabilityPreference: true,
    sustainabilityDocumented: false,
    targetMarketAligned: false,
  });

  const activeRun = useMemo<TaxRun>(() => {
    if (activeScenario === "ir")
      return simulateIrBareme2026({
        taxableIncome: ir.taxableIncome,
        situation: ir.situation,
        childrenHalfParts: ir.childrenHalfParts,
        referenceIncome: ir.referenceIncome > 0 ? ir.referenceIncome : undefined,
      });
    if (activeScenario === "pfu")
      return simulatePfuVsBareme({
        dividends: pfu.dividends,
        gains: pfu.gains,
        tmi: pfu.tmiPercent / 100,
        psRateAtBareme: pfu.psRateAtBaremePercent / 100,
        titlesPre2018: pfu.titlesPre2018,
        holdingYears: pfu.holdingYears,
      });
    if (activeScenario === "plus-value") return simulateRealEstateGainV2(realEstate);
    if (activeScenario === "transmission") return simulateTransmissionV2(transmission);
    if (activeScenario === "dutreil") return simulateDutreilV2(dutreil);
    if (activeScenario === "holding-tax") return simulateHoldingTaxV2({
      ...holding,
      passiveIncomeRatio: holding.passiveIncomePercent / 100,
      individualControlRatio: holding.individualControlPercent / 100,
    });
    if (activeScenario === "pea") return simulatePeaWithdrawalV2({
      ...pea,
      socialContributionRate: pea.socialContributionRate / 100,
    });
    if (activeScenario === "per") return simulatePerDeductionV2({
      voluntaryPayments: per.voluntaryPayments,
      annualCeiling: per.annualCeiling,
      unusedCeilings: [per.unusedCeilingN1, per.unusedCeilingN2, per.unusedCeilingN3],
      spouseMutualization: per.spouseMutualization,
    });
    if (activeScenario === "succession-checklist") return simulateSuccessionChecklistV24(successionChecklist);
    if (activeScenario === "per-early-exit") return simulatePerEarlyExitV24(perExit);
    if (activeScenario === "succession-liquidity-stress") return simulateSuccessionLiquidityStressV24(liquidityStress);
    if (activeScenario === "product-adequacy") return simulateProductAdequacyV24(adequacy);
    return simulateBankImportV2();
  }, [
    activeScenario,
    adequacy,
    dutreil,
    holding,
    ir,
    liquidityStress,
    pea,
    per,
    perExit,
    pfu,
    realEstate,
    successionChecklist,
    transmission,
  ]);

  const firstStep = activeRun.steps[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Laboratoire de simulation paramétrable</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Les calculs partent des hypothèses saisies par le conseiller, puis produisent étapes,
                sources, limites et action professionnelle.
              </p>
            </div>
            <Calculator className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>

          <div className="mb-5 grid grid-cols-2 gap-2">
            {(Object.keys(scenarioLabels) as LabScenario[]).map((scenario) => (
              <button
                key={scenario}
                type="button"
                onClick={() => {
                  setActiveScenario(scenario);
                  setRunStatus("Simulation prête à lancer");
                }}
                className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition ${
                  activeScenario === scenario
                    ? "border-[var(--surface-strong)] bg-[var(--surface-soft)] text-foreground"
                    : "border-border bg-white text-muted hover:bg-[var(--surface-soft)]"
                }`}
              >
                {scenarioLabels[scenario]}
              </button>
            ))}
          </div>

          {activeScenario === "ir" ? <IrForm value={ir} onChange={setIr} /> : null}

          {activeScenario === "pfu" ? <PfuForm value={pfu} onChange={setPfu} /> : null}

          {activeScenario === "plus-value" ? (
            <PvImmoForm value={realEstate} onChange={setRealEstate} />
          ) : null}

          {activeScenario === "transmission" ? (
            <div className="grid gap-3">
              <NumberInput label="Valeur transmise" value={transmission.assetValue} onChange={(value) => setTransmission((item) => ({ ...item, assetValue: value }))} />
              <NumberInput label="Âge donateur" value={transmission.donorAge} onChange={(value) => setTransmission((item) => ({ ...item, donorAge: value }))} />
              <NumberInput label="Enfants" value={transmission.children} onChange={(value) => setTransmission((item) => ({ ...item, children: value }))} />
              <NumberInput label="Donations antérieures" value={transmission.priorDonations} onChange={(value) => setTransmission((item) => ({ ...item, priorDonations: value }))} />
              <NumberInput label="Don familial déclaré" value={transmission.familyCashGift} onChange={(value) => setTransmission((item) => ({ ...item, familyCashGift: value }))} />
              <CheckboxInput label="Donation en nue-propriété" checked={transmission.useDismemberment} onChange={(checked) => setTransmission((item) => ({ ...item, useDismemberment: checked }))} />
            </div>
          ) : null}

          {activeScenario === "dutreil" ? (
            <div className="grid gap-3">
              <NumberInput label="Valeur entreprise" value={dutreil.companyValue} onChange={(value) => setDutreil((item) => ({ ...item, companyValue: value }))} />
              <NumberInput label="Valeur éligible Dutreil" value={dutreil.eligibleOperatingValue} onChange={(value) => setDutreil((item) => ({ ...item, eligibleOperatingValue: value }))} />
              <NumberInput label="Actifs non éligibles" value={dutreil.nonEligibleAssets} onChange={(value) => setDutreil((item) => ({ ...item, nonEligibleAssets: value }))} />
              <NumberInput label="Actifs somptuaires exclus" value={dutreil.excludedLuxuryAssetsValue} onChange={(value) => setDutreil((item) => ({ ...item, excludedLuxuryAssetsValue: value }))} />
              <NumberInput label="Engagement individuel" value={dutreil.individualCommitmentYears} onChange={(value) => setDutreil((item) => ({ ...item, individualCommitmentYears: value }))} />
              <CheckboxInput label="Engagement collectif signé" checked={dutreil.collectiveCommitmentSigned} onChange={(checked) => setDutreil((item) => ({ ...item, collectiveCommitmentSigned: checked }))} />
              <CheckboxInput label="Fonction de direction documentée" checked={dutreil.managementCommitmentSigned} onChange={(checked) => setDutreil((item) => ({ ...item, managementCommitmentSigned: checked }))} />
            </div>
          ) : null}

          {activeScenario === "holding-tax" ? (
            <div className="grid gap-3">
              <NumberInput label="Total actif holding" value={holding.totalAssets} onChange={(value) => setHolding((item) => ({ ...item, totalAssets: value }))} />
              <NumberInput label="Revenus passifs (%)" value={holding.passiveIncomePercent} onChange={(value) => setHolding((item) => ({ ...item, passiveIncomePercent: value }))} />
              <NumberInput label="Contrôle personne physique (%)" value={holding.individualControlPercent} onChange={(value) => setHolding((item) => ({ ...item, individualControlPercent: value }))} />
              <NumberInput label="Biens somptuaires" value={holding.luxuryAssetsValue} onChange={(value) => setHolding((item) => ({ ...item, luxuryAssetsValue: value }))} />
              <NumberInput label="Actifs financiers ciblés" value={holding.financialAssetsValue} onChange={(value) => setHolding((item) => ({ ...item, financialAssetsValue: value }))} />
              <NumberInput label="Immobilier de jouissance" value={holding.realEstateLuxuryValue} onChange={(value) => setHolding((item) => ({ ...item, realEstateLuxuryValue: value }))} />
              <NumberInput label="Liquidités ciblées" value={holding.cashAndReceivablesValue} onChange={(value) => setHolding((item) => ({ ...item, cashAndReceivablesValue: value }))} />
              <CheckboxInput label="Holding soumise à l'IS" checked={holding.isSubjectToCorporateTax} onChange={(checked) => setHolding((item) => ({ ...item, isSubjectToCorporateTax: checked }))} />
            </div>
          ) : null}

          {activeScenario === "pea" ? (
            <div className="grid gap-3">
              <NumberInput label="Durée de détention" value={pea.yearsHeld} onChange={(value) => setPea((item) => ({ ...item, yearsHeld: value }))} />
              <NumberInput label="Gains retirés" value={pea.withdrawnGains} onChange={(value) => setPea((item) => ({ ...item, withdrawnGains: value }))} />
              <NumberInput label="Prélèvements sociaux (%)" value={pea.socialContributionRate} onChange={(value) => setPea((item) => ({ ...item, socialContributionRate: value }))} />
              <CheckboxInput label="Retrait partiel" checked={pea.partialWithdrawal} onChange={(checked) => setPea((item) => ({ ...item, partialWithdrawal: checked }))} />
            </div>
          ) : null}

          {activeScenario === "per" ? (
            <div className="grid gap-3">
              <NumberInput label="Versement volontaire" value={per.voluntaryPayments} onChange={(value) => setPer((item) => ({ ...item, voluntaryPayments: value }))} />
              <NumberInput label="Plafond disponible" value={per.annualCeiling} onChange={(value) => setPer((item) => ({ ...item, annualCeiling: value }))} />
              <NumberInput label="Reliquat N-1" value={per.unusedCeilingN1} onChange={(value) => setPer((item) => ({ ...item, unusedCeilingN1: value }))} />
              <NumberInput label="Reliquat N-2" value={per.unusedCeilingN2} onChange={(value) => setPer((item) => ({ ...item, unusedCeilingN2: value }))} />
              <NumberInput label="Reliquat N-3" value={per.unusedCeilingN3} onChange={(value) => setPer((item) => ({ ...item, unusedCeilingN3: value }))} />
              <NumberInput label="Mutualisation conjoint" value={per.spouseMutualization} onChange={(value) => setPer((item) => ({ ...item, spouseMutualization: value }))} />
            </div>
          ) : null}

          {activeScenario === "bank-import" ? (
            <div className="grid gap-3">
              <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-3">
                <p className="text-sm font-semibold text-foreground">Démo sans connecteur externe</p>
                <p className="mt-1 text-sm leading-6 text-muted">{demoConnectorImport.userFacingExplanation}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>Consentement pédagogique</Badge>
                  <Badge>Aucun secret bancaire</Badge>
                </div>
              </div>
              {demoConnectorImport.steps.map((step) => (
                <div key={step.label} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">{step.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">{step.status}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.detail}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activeScenario === "succession-checklist" ? (
            <div className="grid gap-3">
              <NumberInput label="Actif brut déclaré" value={successionChecklist.grossEstate} onChange={(value) => setSuccessionChecklist((item) => ({ ...item, grossEstate: value }))} />
              <NumberInput label="Enfants" value={successionChecklist.children} onChange={(value) => setSuccessionChecklist((item) => ({ ...item, children: value }))} />
              <NumberInput label="Donations antérieures" value={successionChecklist.priorDonations} onChange={(value) => setSuccessionChecklist((item) => ({ ...item, priorDonations: value }))} />
              <NumberInput label="Documents reçus" value={successionChecklist.documentsReceived} onChange={(value) => setSuccessionChecklist((item) => ({ ...item, documentsReceived: value }))} />
              <NumberInput label="Documents attendus" value={successionChecklist.documentsExpected} onChange={(value) => setSuccessionChecklist((item) => ({ ...item, documentsExpected: value }))} />
              <CheckboxInput label="Actif immobilier" checked={successionChecklist.hasRealEstate} onChange={(checked) => setSuccessionChecklist((item) => ({ ...item, hasRealEstate: checked }))} />
              <CheckboxInput label="Testament ou disposition" checked={successionChecklist.hasWill} onChange={(checked) => setSuccessionChecklist((item) => ({ ...item, hasWill: checked }))} />
              <CheckboxInput label="Conjoint survivant" checked={successionChecklist.spousePresent} onChange={(checked) => setSuccessionChecklist((item) => ({ ...item, spousePresent: checked }))} />
            </div>
          ) : null}

          {activeScenario === "per-early-exit" ? (
            <div className="grid gap-3">
              <NumberInput label="Capital débloqué" value={perExit.capitalReleased} onChange={(value) => setPerExit((item) => ({ ...item, capitalReleased: value }))} />
              <NumberInput label="Versements" value={perExit.voluntaryPayments} onChange={(value) => setPerExit((item) => ({ ...item, voluntaryPayments: value }))} />
              <NumberInput label="Gains" value={perExit.gainPortion} onChange={(value) => setPerExit((item) => ({ ...item, gainPortion: value }))} />
              <CheckboxInput label="Versements déduits à l'entrée" checked={perExit.usedDeductionAtEntry} onChange={(checked) => setPerExit((item) => ({ ...item, usedDeductionAtEntry: checked }))} />
              <CheckboxInput label="Acquisition résidence principale" checked={perExit.primaryResidencePurpose} onChange={(checked) => setPerExit((item) => ({ ...item, primaryResidencePurpose: checked }))} />
            </div>
          ) : null}

          {activeScenario === "succession-liquidity-stress" ? (
            <div className="grid gap-3">
              <NumberInput label="Droits estimés" value={liquidityStress.estimatedDuties} onChange={(value) => setLiquidityStress((item) => ({ ...item, estimatedDuties: value }))} />
              <NumberInput label="Cash disponible" value={liquidityStress.cashAvailable} onChange={(value) => setLiquidityStress((item) => ({ ...item, cashAvailable: value }))} />
              <NumberInput label="Réserve prudente" value={liquidityStress.reservedExpenses} onChange={(value) => setLiquidityStress((item) => ({ ...item, reservedExpenses: value }))} />
              <NumberInput label="Délai de cession (mois)" value={liquidityStress.saleDelayMonths} onChange={(value) => setLiquidityStress((item) => ({ ...item, saleDelayMonths: value }))} />
            </div>
          ) : null}

          {activeScenario === "product-adequacy" ? (
            <div className="grid gap-3">
              <NumberInput label="Horizon client (années)" value={adequacy.horizonYears} onChange={(value) => setAdequacy((item) => ({ ...item, horizonYears: value }))} />
              <NumberInput label="Tolérance risque (1-7)" value={adequacy.riskTolerance} onChange={(value) => setAdequacy((item) => ({ ...item, riskTolerance: value }))} />
              <NumberInput label="Risque produit (1-7)" value={adequacy.productRisk} onChange={(value) => setAdequacy((item) => ({ ...item, productRisk: value }))} />
              <CheckboxInput label="Préférence durabilité" checked={adequacy.sustainabilityPreference} onChange={(checked) => setAdequacy((item) => ({ ...item, sustainabilityPreference: checked }))} />
              <CheckboxInput label="Durabilité documentée" checked={adequacy.sustainabilityDocumented} onChange={(checked) => setAdequacy((item) => ({ ...item, sustainabilityDocumented: checked }))} />
              <CheckboxInput label="Marché cible aligné" checked={adequacy.targetMarketAligned} onChange={(checked) => setAdequacy((item) => ({ ...item, targetMarketAligned: checked }))} />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => setRunStatus("Scénario recalculé depuis les hypothèses")}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Lancer avec ces hypothèses
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowWhy((value) => !value)}>
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
              Pourquoi ce résultat ?
            </Button>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{scenarioLabels[activeScenario]}</CardTitle>
                <p className="mt-1 text-sm text-muted">{activeRun.resultLabel}</p>
              </div>
              <Badge tone="warning">Revue {activeRun.reviewerRequired}</Badge>
            </CardHeader>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Résultat indicatif" value={formatRunResult(activeRun)} />
              <Metric label="Statut" value={runStatus} />
              <Metric label="Sources" value={`${activeRun.evidenceSourceIds.length}`} />
              <Metric label="Limites" value={`${activeRun.coverageLimitIds?.length ?? 0}`} />
            </div>
          </Card>

          {activeScenario === "ir" ? <IrBracketsChart run={activeRun} /> : null}
          {activeScenario === "pfu" ? <PfuComparisonChart run={activeRun} /> : null}
          {activeScenario === "plus-value" ? <PvAllowancesChart /> : null}

          <CalculationSteps steps={activeRun.steps} />
        </div>
      </div>

      {showWhy && firstStep ? <WhyThisResultPanel step={firstStep} /> : null}
      <LegalNotice compact />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 break-words text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatRunResult(run: TaxRun) {
  if (["bank-import", "succession", "product-adequacy"].includes(run.module)) return run.resultLabel;
  return typeof run.resultAmount === "number" ? formatEuro(run.resultAmount) : run.resultLabel;
}
