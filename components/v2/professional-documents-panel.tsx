import { FileSignature } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProfessionalDocument } from "@/lib/types";

const labels: Record<ProfessionalDocument["kind"], string> = {
  der: "DER",
  fil: "FIL",
  "lettre-mission": "Lettre de mission",
  "rapport-adequation": "Rapport d'adéquation",
  "note-synthese-fiscale": "Note fiscale",
  "checklist-lcb-ft": "LCB-FT",
};

export function ProfessionalDocumentsPanel({ documents }: { documents: ProfessionalDocument[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Générateur documentaire cabinet</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Modèles de travail versionnés, non signés, préparés pour revue et signature future.
          </p>
        </div>
        <FileSignature className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <div key={document.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{labels[document.kind]}</p>
              <Badge tone="warning">{document.status}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{document.title}</p>
            <p className="mt-3 font-mono text-xs text-muted">{document.hash}</p>
            <ul className="mt-3 grid gap-1 text-sm leading-5 text-muted">
              {document.requiredInputs.slice(0, 3).map((input) => (
                <li key={input}>{input}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
