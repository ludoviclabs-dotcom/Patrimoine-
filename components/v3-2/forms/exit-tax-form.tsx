"use client";

import { CheckboxInput, NumberInput } from "@/components/v3/forms/fields";

export type ExitTaxFormState = {
  latentGains: number;
  ownershipPercent: number;
  shareValue: number;
  destinationInEea: boolean;
  yearsResidentInLastTen: number;
};

export const defaultExitTaxFormState: ExitTaxFormState = {
  latentGains: 900_000,
  ownershipPercent: 30,
  shareValue: 1_200_000,
  destinationInEea: true,
  yearsResidentInLastTen: 8,
};

export function ExitTaxForm({
  value,
  onChange,
}: {
  value: ExitTaxFormState;
  onChange: (value: ExitTaxFormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <NumberInput
        label="Plus-values latentes sur titres"
        value={value.latentGains}
        onChange={(latentGains) => onChange({ ...value, latentGains })}
      />
      <NumberInput
        label="Participation dans la société (%)"
        value={value.ownershipPercent}
        onChange={(ownershipPercent) => onChange({ ...value, ownershipPercent })}
      />
      <NumberInput
        label="Valeur globale des titres"
        value={value.shareValue}
        onChange={(shareValue) => onChange({ ...value, shareValue })}
      />
      <NumberInput
        label="Années de résidence (10 dernières)"
        value={value.yearsResidentInLastTen}
        onChange={(yearsResidentInLastTen) => onChange({ ...value, yearsResidentInLastTen })}
      />
      <CheckboxInput
        label="Destination UE / EEE (sursis automatique)"
        checked={value.destinationInEea}
        onChange={(destinationInEea) => onChange({ ...value, destinationInEea })}
      />
    </div>
  );
}
