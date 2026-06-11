"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxInput, NumberInput, SelectInput } from "@/components/v3/forms/fields";
import { AdequationDeclarationPanel } from "@/components/v3-4/adequation-declaration";
import { buildAdequationDeclaration, type AdequationDeclaration } from "@/lib/conformite/adequation";
import { buildKycProfile, defaultKycInput, type KycInput } from "@/lib/conformite/kyc";
import type { ProfessionalDocument } from "@/lib/types";

export function KycQuestionnaire({
  onDocument,
}: {
  onDocument: (document: ProfessionalDocument | null) => void;
}) {
  const [input, setInput] = useState<KycInput>(defaultKycInput);
  const declaration: AdequationDeclaration = useMemo(
    () => buildAdequationDeclaration(buildKycProfile(input)),
    [input],
  );

  useEffect(() => {
    onDocument(declaration.document);
  }, [declaration, onDocument]);

  return (
    <div className="space-y-5">
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>MIF 2 / DDA — préférences de durabilité incluses</CardEyebrow>
            <CardTitle className="mt-1">Questionnaire de connaissance client (KYC)</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Le profil alimente directement le moteur d&apos;adéquation produit : la chaîne
              KYC → adéquation est traçable de bout en bout.
            </p>
          </div>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectInput
            label="Connaissance des instruments financiers"
            value={input.knowledgeLevel}
            options={[
              { value: "novice", label: "Novice" },
              { value: "informe", label: "Informé" },
              { value: "experimente", label: "Expérimenté" },
            ]}
            onChange={(knowledgeLevel) => setInput((item) => ({ ...item, knowledgeLevel }))}
          />
          <NumberInput
            label="Expérience (années)"
            value={input.experienceYears}
            onChange={(experienceYears) => setInput((item) => ({ ...item, experienceYears }))}
          />
          <NumberInput
            label="Capacité de perte (% du patrimoine)"
            value={input.lossCapacityPercent}
            onChange={(lossCapacityPercent) => setInput((item) => ({ ...item, lossCapacityPercent }))}
          />
          <NumberInput
            label="Tolérance au risque (1-7)"
            value={input.riskTolerance}
            onChange={(riskTolerance) => setInput((item) => ({ ...item, riskTolerance }))}
          />
          <NumberInput
            label="Horizon d'investissement (années)"
            value={input.horizonYears}
            onChange={(horizonYears) => setInput((item) => ({ ...item, horizonYears }))}
          />
          <div className="grid gap-3">
            <CheckboxInput
              label="Préférence de durabilité exprimée"
              checked={input.sustainabilityPreference}
              onChange={(sustainabilityPreference) =>
                setInput((item) => ({ ...item, sustainabilityPreference }))
              }
            />
            <CheckboxInput
              label="Préférence documentée (questionnaire ESG)"
              checked={input.sustainabilityDocumented}
              onChange={(sustainabilityDocumented) =>
                setInput((item) => ({ ...item, sustainabilityDocumented }))
              }
            />
          </div>
        </div>
      </Card>

      <AdequationDeclarationPanel declaration={declaration} />
    </div>
  );
}
