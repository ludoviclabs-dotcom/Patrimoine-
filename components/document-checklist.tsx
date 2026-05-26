import { FileUp, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { demoConsents, demoDocuments } from "@/lib/demo-data/v1";
import { getBlobStorageStatus } from "@/lib/documents/blob";
import type { DocumentRecord } from "@/lib/types";

const documentStatusTone: Record<DocumentRecord["status"], "success" | "warning" | "danger" | "teal"> = {
  missing: "danger",
  received: "teal",
  to_review: "warning",
  validated: "success",
};

const documentStatusLabel: Record<DocumentRecord["status"], string> = {
  missing: "Manquant",
  received: "Reçu",
  to_review: "À vérifier",
  validated: "Validé",
};

export function DocumentChecklist() {
  const blob = getBlobStorageStatus();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Collecte documentaire</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Typologie V1 : fiscal, dette, société, assurance-vie, immobilier, transmission.
            </p>
          </div>
          <FileUp className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="grid gap-3">
          {demoDocuments.map((document) => (
            <div key={document.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-foreground">{document.label}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {document.kind} · {document.storageProvider}
                </p>
              </div>
              <Badge tone={documentStatusTone[document.status]}>{documentStatusLabel[document.status]}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Consentements</CardTitle>
            <p className="mt-1 text-sm text-muted">La collecte reste rattachee au dossier et au tenant.</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="space-y-3">
          {demoConsents.map((consent) => (
            <div key={consent.id} className="rounded-lg bg-[var(--surface-soft)] p-3">
              <p className="text-sm font-semibold text-foreground">{consent.purpose}</p>
              <p className="mt-1 text-sm text-muted">{consent.status}</p>
            </div>
          ))}
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-foreground">Blob privé</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Mode actuel : {blob.uploadPolicy}. Aucun vrai fichier n&apos;est envoyé sans token Blob.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
