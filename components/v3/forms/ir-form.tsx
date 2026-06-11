"use client";

import { NumberInput, SelectInput } from "@/components/v3/forms/fields";
import { Bars } from "@/components/viz/bars";
import { IR_BRACKETS_2026, type IrSituation } from "@/lib/tax/engines/ir";
import { formatEuro } from "@/lib/format";
import type { TaxRun } from "@/lib/types";

export type IrFormState = {
  taxableIncome: number;
  situation: IrSituation;
  childrenHalfParts: number;
  referenceIncome: number;
};

export const defaultIrFormState: IrFormState = {
  taxableIncome: 30_000,
  situation: "single",
  childrenHalfParts: 0,
  referenceIncome: 0,
};

export function IrForm({
  value,
  onChange,
}: {
  value: IrFormState;
  onChange: (value: IrFormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <NumberInput
        label="Revenu net imposable"
        value={value.taxableIncome}
        onChange={(taxableIncome) => onChange({ ...value, taxableIncome })}
      />
      <SelectInput
        label="Situation du foyer"
        value={value.situation}
        options={[
          { value: "single", label: "Célibataire / divorcé / veuf" },
          { value: "couple", label: "Couple (imposition commune)" },
        ]}
        onChange={(situation) => onChange({ ...value, situation })}
      />
      <NumberInput
        label="Demi-parts enfants (1 enfant = 1)"
        value={value.childrenHalfParts}
        onChange={(childrenHalfParts) => onChange({ ...value, childrenHalfParts })}
      />
      <NumberInput
        label="RFR si différent (CEHR/CDHR), 0 = identique"
        value={value.referenceIncome}
        onChange={(referenceIncome) => onChange({ ...value, referenceIncome })}
      />
    </div>
  );
}

/** Décomposition de l'IR par tranche du barème (sur le quotient × parts). */
export function IrBracketsChart({ run }: { run: TaxRun }) {
  const quotient = Number(run.computedResult?.quotient ?? 0);
  const parts = Number(run.computedResult?.parts ?? 1);

  const positiveBrackets = IR_BRACKETS_2026.filter((bracket) => bracket.rate > 0);
  const groups = positiveBrackets.map((bracket, index) => {
    const floor = index === 0 ? IR_BRACKETS_2026[0].ceiling : positiveBrackets[index - 1].ceiling;
    const slice = Math.max(0, Math.min(quotient, bracket.ceiling) - floor);
    return {
      label: `${Math.round(bracket.rate * 100)} %`,
      bars: [
        {
          label: "IR de la tranche",
          value: Math.round(slice * bracket.rate * parts),
          color: "var(--accent)",
        },
      ],
    };
  });

  if (groups.every((group) => group.bars[0].value === 0)) return null;

  return (
    <Bars
      groups={groups}
      formatValue={(value) => formatEuro(value)}
      className="rounded-lg border border-border bg-[var(--surface-soft)] p-4"
    />
  );
}
