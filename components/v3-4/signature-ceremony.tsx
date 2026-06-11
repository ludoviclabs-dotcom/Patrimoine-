"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { getSignatureProvider } from "@/lib/integrations/signature";
import type { ProfessionalDocument, SignatureEnvelope } from "@/lib/types";

export function SignatureCeremony({ documents }: { documents: ProfessionalDocument[] }) {
  const [envelopes, setEnvelopes] = useState<Record<string, SignatureEnvelope>>({});
  const provider = getSignatureProvider();
  const signedCount = Object.values(envelopes).filter((envelope) => envelope.status === "signed").length;

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Signature électronique simulée — niveau SES (eIDAS 910/2014)</CardEyebrow>
          <CardTitle className="mt-1">Cérémonie de signature</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Hash du document + horodatage inscrits dans l&apos;audit append-only. Câblage réel
            Yousign/DocuSign documenté dans lib/integrations/signature.ts.
          </p>
        </div>
        <PenLine className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>

      {documents.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun document prêt : complétez le DER, la lettre de mission et le KYC ci-dessus.
        </p>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => {
            const envelope = envelopes[document.id];
            return (
              <div
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-border p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{document.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {envelope?.status === "signed"
                      ? `Signé · empreinte ${envelope.documentHash} · ${envelope.timestampedAt?.slice(0, 10)}`
                      : `Empreinte ${document.hash}`}
                  </p>
                </div>
                {envelope?.status === "signed" ? (
                  <Badge tone="success" dot>
                    Signé (SES démo) et archivé
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    onClick={() =>
                      setEnvelopes((items) => ({
                        ...items,
                        [document.id]: provider.sign(provider.createEnvelope(document)),
                      }))
                    }
                  >
                    Signer (simulé)
                  </Button>
                )}
              </div>
            );
          })}
          <p className="text-sm font-medium text-foreground">
            {signedCount}/{documents.length} document(s) signé(s) — le dossier est complet lorsque DER,
            lettre de mission et déclaration d&apos;adéquation sont signés et archivés.
          </p>
        </div>
      )}
    </Card>
  );
}
