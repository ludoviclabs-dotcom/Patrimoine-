"use client";

import { useMemo, useState } from "react";
import { Calculator, HelpCircle, Play } from "lucide-react";
import { CalculationSteps } from "@/components/calculation-steps";
import { LegalNotice } from "@/components/legal-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { WhyThisResultPanel } from "@/components/v1-1/why-this-result-panel";
import { formatEuro } from "@/lib/format";
import {
  simulateDutreilV2,
  simulateBankImportV2,
  simulateHoldingTaxV2,
  simulatePeaWithdrawalV2,
  simulatePerDeductionV2,
  simulateRealEstateGainV2,
  simulateTransmissionV2,
} from "@/lib/tax/v2-engines";
import { demoConnectorImport } from "@/lib/patrimonial-model/model";
import type { TaxRun } from "@/lib/types";

export type LabScenario =
  | "plus-value"
  | "transmission"
  | "dutreil"
  | "holding-tax"
  | "pea"
  | "per"
  | "bank-import";

const scenarioLabels: Record<LabScenario, string> = {
  "plus-value": "Plus-value",
  transmission: "Transmission",
  dutreil: "Dutreil",
  "holding-tax": "Taxe holding",
  pea: "PEA retrait après 5 ans",
  per: "PER déduction à l’entrée",
  "bank-import": "Import bancaire simulé",
};

export function TaxScenarioLab({ initialScenario = "dutreil" }: { initialScenario?: LabScenario }) {
  const [activeScenario, setActiveScenario] = useState<LabScenario>(initialScenario);
  const [showWhy, setShowWhy] = useState(true);
  const [runStatus, setRunStatus] = useState("Prêt à recalculer");

  const [realEstate, setRealEstate] = useState({
    salePrice: 720_000,
    purchasePrice: 420_000,
    acquisitionCosts: 31_500,
    works: 35_000,
    yearsHeld: 9,
    isMainResidence: false,
  });
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

  const activeRun = useMemo<TaxRun>(() => {
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
    return simulateBankImportV2();
  }, [activeScenario, dutreil, holding, pea, per, realEstate, transmission]);

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
                  setRunStatus("Prêt à recalculer");
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

          {activeScenario === "plus-value" ? (
            <div className="grid gap-3">
              <NumberInput label="Prix de cession" value={realEstate.salePrice} onChange={(value) => setRealEstate((item) => ({ ...item, salePrice: value }))} />
              <NumberInput label="Prix d'acquisition" value={realEstate.purchasePrice} onChange={(value) => setRealEstate((item) => ({ ...item, purchasePrice: value }))} />
              <NumberInput label="Frais d'acquisition" value={realEstate.acquisitionCosts} onChange={(value) => setRealEstate((item) => ({ ...item, acquisitionCosts: value }))} />
              <NumberInput label="Travaux retenus" value={realEstate.works} onChange={(value) => setRealEstate((item) => ({ ...item, works: value }))} />
              <NumberInput label="Durée de détention" value={realEstate.yearsHeld} onChange={(value) => setRealEstate((item) => ({ ...item, yearsHeld: value }))} />
              <CheckboxInput label="Résidence principale simple" checked={realEstate.isMainResidence} onChange={(checked) => setRealEstate((item) => ({ ...item, isMainResidence: checked }))} />
            </div>
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

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => setRunStatus(`Scénario recalculé depuis les hypothèses saisies`)}
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

          <CalculationSteps steps={activeRun.steps} />
        </div>
      </div>

      {showWhy && firstStep ? <WhyThisResultPanel step={firstStep} /> : null}
      <LegalNotice compact />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        className="h-10 min-w-0 rounded-lg border border-border bg-white px-3 font-mono text-sm text-foreground outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(43,122,88,0.18)]"
        inputMode="numeric"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        className="h-4 w-4 accent-[var(--accent)]"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
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
  if (run.module === "bank-import") return run.resultLabel;
  return typeof run.resultAmount === "number" ? formatEuro(run.resultAmount) : run.resultLabel;
}
