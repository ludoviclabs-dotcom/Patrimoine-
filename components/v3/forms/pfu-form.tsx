"use client";

import { CheckboxInput, NumberInput } from "@/components/v3/forms/fields";
import { Bars } from "@/components/viz/bars";
import { formatEuro } from "@/lib/format";
import type { TaxRun } from "@/lib/types";

export type PfuFormState = {
  dividends: number;
  gains: number;
  tmiPercent: number;
  psRateAtBaremePercent: number;
  titlesPre2018: boolean;
  holdingYears: number;
};

export const defaultPfuFormState: PfuFormState = {
  dividends: 1_000,
  gains: 0,
  tmiPercent: 30,
  psRateAtBaremePercent: 18.6,
  titlesPre2018: false,
  holdingYears: 0,
};

export function PfuForm({
  value,
  onChange,
}: {
  value: PfuFormState;
  onChange: (value: PfuFormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <NumberInput
        label="Dividendes bruts"
        value={value.dividends}
        onChange={(dividends) => onChange({ ...value, dividends })}
      />
      <NumberInput
        label="Plus-values mobilières"
        value={value.gains}
        onChange={(gains) => onChange({ ...value, gains })}
      />
      <NumberInput
        label="TMI (%)"
        value={value.tmiPercent}
        onChange={(tmiPercent) => onChange({ ...value, tmiPercent })}
      />
      <NumberInput
        label="PS au barème (%) — 18,6 LFSS 2026"
        value={value.psRateAtBaremePercent}
        onChange={(psRateAtBaremePercent) => onChange({ ...value, psRateAtBaremePercent })}
      />
      <CheckboxInput
        label="Titres acquis avant 2018"
        checked={value.titlesPre2018}
        onChange={(titlesPre2018) => onChange({ ...value, titlesPre2018 })}
      />
      <NumberInput
        label="Durée de détention des titres (ans)"
        value={value.holdingYears}
        onChange={(holdingYears) => onChange({ ...value, holdingYears })}
      />
    </div>
  );
}

/** PFU vs barème : barres empilées IR + prélèvements sociaux. */
export function PfuComparisonChart({ run }: { run: TaxRun }) {
  const groups = [
    {
      label: "PFU 31,4 %",
      bars: [
        { label: "IR", value: Number(run.computedResult?.pfuIncomeTax ?? 0), color: "var(--accent)" },
        { label: "Prélèvements sociaux", value: Number(run.computedResult?.pfuSocial ?? 0), color: "var(--gold)" },
      ],
    },
    {
      label: "Barème",
      bars: [
        { label: "IR", value: Number(run.computedResult?.baremeIncomeTax ?? 0), color: "var(--accent)" },
        {
          label: "Prélèvements sociaux",
          value: Number(run.computedResult?.baremeSocial ?? 0),
          color: "var(--gold)",
        },
      ],
    },
  ];

  return (
    <Bars
      groups={groups}
      stacked
      formatValue={(value) => formatEuro(value)}
      className="rounded-lg border border-border bg-[var(--surface-soft)] p-4"
    />
  );
}
