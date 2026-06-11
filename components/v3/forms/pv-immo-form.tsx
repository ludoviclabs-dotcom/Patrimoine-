"use client";

import { CheckboxInput, NumberInput } from "@/components/v3/forms/fields";
import { Curve } from "@/components/viz/curve";
import { calculateRealEstateHoldingAllowances } from "@/lib/tax/engines/pv-immo";

export type PvImmoFormState = {
  salePrice: number;
  purchasePrice: number;
  acquisitionCosts: number;
  works: number;
  yearsHeld: number;
  isMainResidence: boolean;
  useAcquisitionLumpSum: boolean;
  useWorksLumpSum: boolean;
};

export const defaultPvImmoFormState: PvImmoFormState = {
  salePrice: 720_000,
  purchasePrice: 420_000,
  acquisitionCosts: 31_500,
  works: 35_000,
  yearsHeld: 9,
  isMainResidence: false,
  useAcquisitionLumpSum: false,
  useWorksLumpSum: false,
};

export function PvImmoForm({
  value,
  onChange,
}: {
  value: PvImmoFormState;
  onChange: (value: PvImmoFormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <NumberInput label="Prix de cession" value={value.salePrice} onChange={(salePrice) => onChange({ ...value, salePrice })} />
      <NumberInput
        label="Prix d'acquisition"
        value={value.purchasePrice}
        onChange={(purchasePrice) => onChange({ ...value, purchasePrice })}
      />
      <NumberInput
        label="Frais d'acquisition réels"
        value={value.acquisitionCosts}
        onChange={(acquisitionCosts) => onChange({ ...value, acquisitionCosts })}
      />
      <CheckboxInput
        label="Forfait frais 7,5 % du prix d'achat"
        checked={value.useAcquisitionLumpSum}
        onChange={(useAcquisitionLumpSum) => onChange({ ...value, useAcquisitionLumpSum })}
      />
      <NumberInput label="Travaux justifiés" value={value.works} onChange={(works) => onChange({ ...value, works })} />
      <CheckboxInput
        label="Forfait travaux 15 % (détention > 5 ans)"
        checked={value.useWorksLumpSum}
        onChange={(useWorksLumpSum) => onChange({ ...value, useWorksLumpSum })}
      />
      <NumberInput
        label="Durée de détention (années révolues)"
        value={value.yearsHeld}
        onChange={(yearsHeld) => onChange({ ...value, yearsHeld })}
      />
      <CheckboxInput
        label="Résidence principale simple"
        checked={value.isMainResidence}
        onChange={(isMainResidence) => onChange({ ...value, isMainResidence })}
      />
    </div>
  );
}

const allowanceYears = Array.from({ length: 31 }, (_, year) => year);

/** Courbes des abattements pour durée de détention (IR 22 ans / PS 30 ans). */
export function PvAllowancesChart() {
  return (
    <Curve
      series={[
        {
          label: "Abattement IR (exonération à 22 ans)",
          color: "var(--accent)",
          points: allowanceYears.map((year) => ({
            x: year,
            y: Math.round(calculateRealEstateHoldingAllowances(year).incomeTaxAllowanceRate * 100),
          })),
        },
        {
          label: "Abattement PS (exonération à 30 ans)",
          color: "var(--gold)",
          points: allowanceYears.map((year) => ({
            x: year,
            y: Math.round(calculateRealEstateHoldingAllowances(year).socialAllowanceRate * 100),
          })),
        },
      ]}
      formatX={(year) => `${year} ans`}
      formatY={(value) => `${value} %`}
      className="rounded-lg border border-border bg-[var(--surface-soft)] p-4"
    />
  );
}
