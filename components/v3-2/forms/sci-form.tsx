"use client";

import { NumberInput } from "@/components/v3/forms/fields";
import { Bars } from "@/components/viz/bars";
import { formatEuro } from "@/lib/format";
import type { TaxRun } from "@/lib/types";

export type SciFormState = {
  annualRent: number;
  charges: number;
  loanInterest: number;
  depreciationBase: number;
  depreciationRatePercent: number;
  tmiPercent: number;
  holdingYears: number;
  projectedSalePrice: number;
  acquisitionValue: number;
};

export const defaultSciFormState: SciFormState = {
  annualRent: 30_000,
  charges: 8_000,
  loanInterest: 0,
  depreciationBase: 250_000,
  depreciationRatePercent: 2.5,
  tmiPercent: 30,
  holdingYears: 10,
  projectedSalePrice: 400_000,
  acquisitionValue: 300_000,
};

export function SciForm({
  value,
  onChange,
}: {
  value: SciFormState;
  onChange: (value: SciFormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <NumberInput label="Loyers annuels" value={value.annualRent} onChange={(annualRent) => onChange({ ...value, annualRent })} />
      <NumberInput label="Charges annuelles" value={value.charges} onChange={(charges) => onChange({ ...value, charges })} />
      <NumberInput label="Intérêts d'emprunt" value={value.loanInterest} onChange={(loanInterest) => onChange({ ...value, loanInterest })} />
      <NumberInput label="Base amortissable (bâti)" value={value.depreciationBase} onChange={(depreciationBase) => onChange({ ...value, depreciationBase })} />
      <NumberInput label="Taux d'amortissement (%)" value={value.depreciationRatePercent} onChange={(depreciationRatePercent) => onChange({ ...value, depreciationRatePercent })} />
      <NumberInput label="TMI de l'associé (%)" value={value.tmiPercent} onChange={(tmiPercent) => onChange({ ...value, tmiPercent })} />
      <NumberInput label="Durée de détention (ans)" value={value.holdingYears} onChange={(holdingYears) => onChange({ ...value, holdingYears })} />
      <NumberInput label="Prix de cession projeté" value={value.projectedSalePrice} onChange={(projectedSalePrice) => onChange({ ...value, projectedSalePrice })} />
      <NumberInput label="Valeur d'acquisition" value={value.acquisitionValue} onChange={(acquisitionValue) => onChange({ ...value, acquisitionValue })} />
    </div>
  );
}

/** Comparatif IR vs IS : imposition annuelle et imposition de sortie. */
export function SciComparisonChart({ run }: { run: TaxRun }) {
  const groups = [
    {
      label: "Imposition annuelle",
      bars: [
        { label: "SCI à l'IR", value: Number(run.computedResult?.annualTaxAtIr ?? 0), color: "var(--accent)" },
        { label: "SCI à l'IS", value: Number(run.computedResult?.annualTaxAtIs ?? 0), color: "var(--gold)" },
      ],
    },
    {
      label: "Imposition de cession",
      bars: [
        { label: "SCI à l'IR", value: Number(run.computedResult?.saleTaxAtIr ?? 0), color: "var(--accent)" },
        { label: "SCI à l'IS", value: Number(run.computedResult?.saleTaxAtIs ?? 0), color: "var(--gold)" },
      ],
    },
  ];

  return (
    <Bars
      groups={groups}
      formatValue={(value) => formatEuro(value)}
      className="rounded-lg border border-border bg-[var(--surface-soft)] p-4"
    />
  );
}
