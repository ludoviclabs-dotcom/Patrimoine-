"use client";

import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxInput, SelectInput } from "@/components/v3/forms/fields";
import { defaultAmlInput, scoreAmlRisk, type AmlInput } from "@/lib/conformite/lcb-ft";
import type { AmlRiskScoring } from "@/lib/types";

const vigilanceTone: Record<AmlRiskScoring["vigilanceLevel"], "success" | "warning" | "danger"> = {
  standard: "success",
  renforcee: "warning",
  "declaration-soupcon": "danger",
};

const vigilanceLabels: Record<AmlRiskScoring["vigilanceLevel"], string> = {
  standard: "Vigilance standard",
  renforcee: "Vigilance renforcée",
  "declaration-soupcon": "Examen renforcé — déclaration Tracfin à envisager",
};

export function LcbFtBoard() {
  const [input, setInput] = useState<AmlInput>(defaultAmlInput);
  const scoring = useMemo(() => scoreAmlRisk(input), [input]);

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>LCB-FT — directive (UE) 2015/849 · lignes directrices Tracfin</CardEyebrow>
          <CardTitle className="mt-1">Scoring de risque blanchiment</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Score transparent et additif : le produit signale, il ne décide jamais seul d&apos;une
            déclaration de soupçon.
          </p>
        </div>
        <ShieldAlert className="h-5 w-5 text-[var(--danger)]" aria-hidden />
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-2">
        <CheckboxInput
          label="Personne politiquement exposée (PPE)"
          checked={input.isPep}
          onChange={(isPep) => setInput((item) => ({ ...item, isPep }))}
        />
        <SelectInput
          label="Risque pays"
          value={input.countryRisk}
          options={[
            { value: "faible", label: "Faible" },
            { value: "moyen", label: "Moyen" },
            { value: "eleve", label: "Élevé (liste GAFI/UE)" },
          ]}
          onChange={(countryRisk) => setInput((item) => ({ ...item, countryRisk }))}
        />
        <CheckboxInput
          label="Origine des fonds documentée"
          checked={input.sourceOfFundsDocumented}
          onChange={(sourceOfFundsDocumented) =>
            setInput((item) => ({ ...item, sourceOfFundsDocumented }))
          }
        />
        <CheckboxInput
          label="Bénéficiaire effectif identifié"
          checked={input.beneficialOwnerIdentified}
          onChange={(beneficialOwnerIdentified) =>
            setInput((item) => ({ ...item, beneficialOwnerIdentified }))
          }
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="font-serif text-2xl font-semibold text-foreground">Score : {scoring.score}</p>
        <Badge tone={vigilanceTone[scoring.vigilanceLevel]} dot>
          {vigilanceLabels[scoring.vigilanceLevel]}
        </Badge>
      </div>
      <ul className="mt-3 grid gap-2">
        {scoring.rationale.map((reason) => (
          <li key={reason} className="rounded-[var(--r-md)] border border-border p-3 text-sm text-foreground">
            {reason}
          </li>
        ))}
      </ul>
    </Card>
  );
}
