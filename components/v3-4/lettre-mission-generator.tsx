"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/v3/forms/fields";
import { LettreMissionPdf } from "@/components/pdf/lettre-mission-pdf";
import { PdfDownloadButton } from "@/components/v3-4/pdf-download-button";
import {
  buildLettreMission,
  defaultLettreMissionInput,
} from "@/lib/conformite/lettre-mission";
import type { ProfessionalDocument } from "@/lib/types";

export function LettreMissionGenerator({
  onDocument,
}: {
  onDocument: (document: ProfessionalDocument | null) => void;
}) {
  const [durationMonths, setDurationMonths] = useState(defaultLettreMissionInput.durationMonths);
  const result = useMemo(
    () => buildLettreMission({ ...defaultLettreMissionInput, durationMonths }),
    [durationMonths],
  );

  useEffect(() => {
    onDocument(result.status === "ready" ? result.document : null);
  }, [result, onDocument]);

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Recommandations CNCGP</CardEyebrow>
          <CardTitle className="mt-1">Lettre de mission</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Le délai de mission est obligatoire : à zéro, la lettre est bloquée.
          </p>
        </div>
        {result.status === "ready" ? (
          <Badge tone="success" dot>
            Prête pour revue
          </Badge>
        ) : (
          <Badge tone="danger" dot>
            Bloquée : délai manquant
          </Badge>
        )}
      </CardHeader>
      <div className="max-w-xs">
        <NumberInput label="Délai de mission (mois)" value={durationMonths} onChange={setDurationMonths} />
      </div>

      {result.status === "blocked" ? (
        <div className="mt-4 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--danger)_25%,var(--border))] bg-[var(--danger-soft)] p-4">
          <p className="text-sm font-semibold text-foreground">Génération refusée</p>
          <p className="mt-1 text-sm text-muted">Champs manquants : {result.missingFields.join(", ")}.</p>
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
              documentElement={
                <LettreMissionPdf sections={result.sections} hash={result.document.hash} />
              }
              fileName="lettre-mission-claire-marc.pdf"
            />
            <p className="font-mono text-xs text-muted">Empreinte : {result.document.hash}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
