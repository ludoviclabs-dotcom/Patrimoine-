import { FileSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCriticalDataQuality, getDataQualityLabel } from "@/lib/quality/completeness";
import type { DataQualityProfile } from "@/lib/types";

const toneByQuality: Record<DataQualityProfile["status"], Parameters<typeof Badge>[0]["tone"]> = {
  user_declared: "neutral",
  supporting_document_received: "teal",
  estimated: "warning",
  external_source: "teal",
  professional_validated: "success",
};

export function DataQualityPanel() {
  const items = getCriticalDataQuality();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Data quality check</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Chaque donnee patrimoniale critique garde qualite, justificatif et action attendue.
          </p>
        </div>
        <FileSearch className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-lg border border-border p-4 lg:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{item.dataQuality.expectedAction}</p>
              {item.dataQuality.supportingDocumentId ? (
                <p className="mt-1 font-mono text-xs text-muted">
                  Piece liee : {item.dataQuality.supportingDocumentId}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Badge tone={toneByQuality[item.dataQuality.status]}>
                {getDataQualityLabel(item.dataQuality)}
              </Badge>
              <Badge tone={item.dataQuality.validationStatus === "validated" ? "success" : "warning"}>
                {item.dataQuality.validationStatus === "validated" ? "Validé cabinet" : "À contrôler"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
