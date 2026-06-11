"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { AdequationPdf } from "@/components/pdf/adequation-pdf";
import { PdfDownloadButton } from "@/components/v3-4/pdf-download-button";
import type { AdequationDeclaration } from "@/lib/conformite/adequation";

export function AdequationDeclarationPanel({
  declaration,
}: {
  declaration: AdequationDeclaration;
}) {
  const sections = [
    { label: "Conclusion", value: declaration.conclusion },
    ...declaration.mismatches.map((mismatch, index) => ({
      label: `Écart ${index + 1}`,
      value: mismatch,
    })),
    {
      label: "Garde-fou",
      value:
        "Aucune recommandation automatique : ce document prépare la revue du conseiller, il ne la remplace pas.",
    },
  ];

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Déclaration générée depuis le KYC</CardEyebrow>
          <CardTitle className="mt-1">Adéquation MIF 2</CardTitle>
        </div>
        <Badge tone={declaration.mismatches.length > 0 ? "warning" : "success"} dot>
          {declaration.mismatches.length} écart(s)
        </Badge>
      </CardHeader>
      <p className="text-sm leading-6 text-muted">{declaration.conclusion}</p>
      <ul className="mt-3 grid gap-2">
        {declaration.mismatches.map((mismatch) => (
          <li key={mismatch} className="rounded-[var(--r-md)] border border-border p-3 text-sm text-foreground">
            {mismatch}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PdfDownloadButton
          documentElement={<AdequationPdf sections={sections} hash={declaration.document.hash} />}
          fileName="declaration-adequation-claire-marc.pdf"
        />
        <p className="font-mono text-xs text-muted">
          Empreinte : {declaration.document.hash} · archivée en audit append-only
        </p>
      </div>
    </Card>
  );
}
