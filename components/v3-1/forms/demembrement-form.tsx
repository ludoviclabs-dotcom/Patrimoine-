"use client";

import { NumberInput, SelectInput } from "@/components/v3/forms/fields";
import { DMTG_RELATIONSHIP_LABELS, type DmtgRelationship } from "@/lib/tax/engines/dmtg";

export type DemembrementFormState = {
  mode: "viager" | "temporaire";
  usufructuaryAge: number;
  temporaryYears: number;
  fullOwnershipValue: number;
  relationship: DmtgRelationship;
  priorDonationsWithin15Years: number;
};

export const defaultDemembrementFormState: DemembrementFormState = {
  mode: "viager",
  usufructuaryAge: 65,
  temporaryYears: 10,
  fullOwnershipValue: 400_000,
  relationship: "direct-line",
  priorDonationsWithin15Years: 0,
};

const relationshipOptions = (
  Object.entries(DMTG_RELATIONSHIP_LABELS) as Array<[DmtgRelationship, string]>
).map(([value, label]) => ({ value, label }));

export function DemembrementForm({
  value,
  onChange,
}: {
  value: DemembrementFormState;
  onChange: (value: DemembrementFormState) => void;
}) {
  return (
    <div className="grid gap-3">
      <SelectInput
        label="Type d'usufruit"
        value={value.mode}
        options={[
          { value: "viager", label: "Viager (selon l'âge)" },
          { value: "temporaire", label: "Temporaire (durée fixe)" },
        ]}
        onChange={(mode) => onChange({ ...value, mode })}
      />
      <NumberInput
        label="Âge de l'usufruitier"
        value={value.usufructuaryAge}
        onChange={(usufructuaryAge) => onChange({ ...value, usufructuaryAge })}
      />
      {value.mode === "temporaire" ? (
        <NumberInput
          label="Durée de l'usufruit (années)"
          value={value.temporaryYears}
          onChange={(temporaryYears) => onChange({ ...value, temporaryYears })}
        />
      ) : null}
      <NumberInput
        label="Valeur en pleine propriété"
        value={value.fullOwnershipValue}
        onChange={(fullOwnershipValue) => onChange({ ...value, fullOwnershipValue })}
      />
      <SelectInput
        label="Lien de parenté du nu-propriétaire"
        value={value.relationship}
        options={relationshipOptions}
        onChange={(relationship) => onChange({ ...value, relationship })}
      />
      <NumberInput
        label="Donations < 15 ans (rappel fiscal)"
        value={value.priorDonationsWithin15Years}
        onChange={(priorDonationsWithin15Years) =>
          onChange({ ...value, priorDonationsWithin15Years })
        }
      />
    </div>
  );
}
