"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxInput, NumberInput, SelectInput } from "@/components/v3/forms/fields";
import { DerPdf } from "@/components/pdf/der-pdf";
import { PdfDownloadButton } from "@/components/v3-4/pdf-download-button";
import { buildDer, defaultDerInput, type DerInput } from "@/lib/conformite/der";
import type { ProfessionalDocument } from "@/lib/types";

export function DerGenerator({
  onDocument,
}: {
  onDocument: (document: ProfessionalDocument | null) => void;
}) {
  const [input, setInput] = useState<DerInput>(defaultDerInput);
  const [oriasMissing, setOriasMissing] = useState(false);
  const result = useMemo(
    () => buildDer({ ...input, oriasNumber: oriasMissing ? "" : input.oriasNumber }),
    [input, oriasMissing],
  );

  useEffect(() => {
    onDocument(result.status === "ready" ? result.document : null);
  }, [result, onDocument]);

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>RG AMF 325-5 · L. 541-8-1 CMF</CardEyebrow>
          <CardTitle className="mt-1">Document d&apos;entrée en relation</CardTitle>
        </div>
        {result.status === "ready" ? (
          <Badge tone="success" dot>
            Prêt pour revue
          </Badge>
        ) : (
          <Badge tone="danger" dot>
            Bloqué : champs obligatoires
          </Badge>
        )}
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-2">
        <SelectInput
          label="Association professionnelle"
          value={input.association}
          options={[
            { value: "CNCGP", label: "CNCGP" },
            { value: "ANACOFI-CIF", label: "ANACOFI-CIF" },
            { value: "CNCEF", label: "CNCEF" },
            { value: "Compagnie CIF", label: "Compagnie CIF" },
          ]}
          onChange={(association) => setInput((item) => ({ ...item, association }))}
        />
        <SelectInput
          label="Mode de rémunération"
          value={input.remunerationModel}
          options={[
            { value: "honoraires", label: "Honoraires" },
            { value: "commissions", label: "Commissions" },
            { value: "mixte", label: "Mixte (détaillé)" },
          ]}
          onChange={(remunerationModel) => setInput((item) => ({ ...item, remunerationModel }))}
        />
        <NumberInput
          label="N° ORIAS"
          value={Number(input.oriasNumber) || 0}
          onChange={(value) => setInput((item) => ({ ...item, oriasNumber: value > 0 ? String(value) : "" }))}
        />
        <CheckboxInput
          label="Simuler un ORIAS manquant (blocage)"
          checked={oriasMissing}
          onChange={setOriasMissing}
        />
      </div>

      {result.status === "blocked" ? (
        <div className="mt-4 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--danger)_25%,var(--border))] bg-[var(--danger-soft)] p-4">
          <p className="text-sm font-semibold text-foreground">Génération refusée</p>
          <p className="mt-1 text-sm text-muted">
            Champs manquants : {result.missingFields.join(", ")}. Le DER n&apos;est jamais émis incomplet.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {result.sections.map((section) => (
            <div key={section.label} className="rounded-[var(--r-md)] border border-border p-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-muted">
                {section.label}
              </p>
              <p className="mt-1 text-sm text-foreground">{section.value}</p>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <PdfDownloadButton
              documentElement={<DerPdf sections={result.sections} hash={result.document.hash} />}
              fileName="der-claire-marc.pdf"
            />
            <p className="font-mono text-xs text-muted">Empreinte : {result.document.hash}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
