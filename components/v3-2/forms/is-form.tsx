"use client";

import { NumberInput } from "@/components/v3/forms/fields";

export type IsFormState = {
  profit: number;
  turnover: number;
  individualOwnershipPercent: number;
};

export const defaultIsFormState: IsFormState = {
  profit: 120_000,
  turnover: 900_000,
  individualOwnershipPercent: 100,
};

export function IsForm({
  value,
  onChange,
}: {
  value: IsFormState;
  onChange: (value: IsFormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <NumberInput
        label="Bénéfice fiscal"
        value={value.profit}
        onChange={(profit) => onChange({ ...value, profit })}
      />
      <NumberInput
        label="Chiffre d'affaires"
        value={value.turnover}
        onChange={(turnover) => onChange({ ...value, turnover })}
      />
      <NumberInput
        label="Capital détenu par des personnes physiques (%)"
        value={value.individualOwnershipPercent}
        onChange={(individualOwnershipPercent) =>
          onChange({ ...value, individualOwnershipPercent })
        }
      />
    </div>
  );
}
