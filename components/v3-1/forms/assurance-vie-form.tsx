"use client";

import { CheckboxInput, NumberInput, SelectInput } from "@/components/v3/forms/fields";
import { DMTG_RELATIONSHIP_LABELS, type DmtgRelationship } from "@/lib/tax/engines/dmtg";

export type AssuranceVieFormState = {
  deathBenefitBefore70: number;
  premiumsAfter70: number;
  gainsAfter70: number;
  beneficiaries: number;
  relationship: DmtgRelationship;
  spouseBeneficiary: boolean;
};

export const defaultAssuranceVieFormState: AssuranceVieFormState = {
  deathBenefitBefore70: 352_500,
  premiumsAfter70: 0,
  gainsAfter70: 0,
  beneficiaries: 1,
  relationship: "direct-line",
  spouseBeneficiary: false,
};

const relationshipOptions = (
  Object.entries(DMTG_RELATIONSHIP_LABELS) as Array<[DmtgRelationship, string]>
).map(([value, label]) => ({ value, label }));

export function AssuranceVieForm({
  value,
  onChange,
}: {
  value: AssuranceVieFormState;
  onChange: (value: AssuranceVieFormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <NumberInput
        label="Capitaux décès — primes avant 70 ans"
        value={value.deathBenefitBefore70}
        onChange={(deathBenefitBefore70) => onChange({ ...value, deathBenefitBefore70 })}
      />
      <NumberInput
        label="Primes versées après 70 ans"
        value={value.premiumsAfter70}
        onChange={(premiumsAfter70) => onChange({ ...value, premiumsAfter70 })}
      />
      <NumberInput
        label="Produits attachés aux primes après 70 ans"
        value={value.gainsAfter70}
        onChange={(gainsAfter70) => onChange({ ...value, gainsAfter70 })}
      />
      <NumberInput
        label="Nombre de bénéficiaires"
        value={value.beneficiaries}
        onChange={(beneficiaries) => onChange({ ...value, beneficiaries })}
      />
      <SelectInput
        label="Lien de parenté (surplus 757 B)"
        value={value.relationship}
        options={relationshipOptions}
        onChange={(relationship) => onChange({ ...value, relationship })}
      />
      <CheckboxInput
        label="Bénéficiaire conjoint / PACS (exonéré)"
        checked={value.spouseBeneficiary}
        onChange={(spouseBeneficiary) => onChange({ ...value, spouseBeneficiary })}
      />
    </div>
  );
}
