import { ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { controlOfflineEvidenceSources } from "@/lib/evidence/offline-control";
import { evidenceSources } from "@/lib/evidence/sources";

export function OfflineEvidenceControlPanel() {
  const results = controlOfflineEvidenceSources();
  const sourceById = new Map(evidenceSources.map((source) => [source.id, source]));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Snapshots offline contrôlés</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Comparaison déterministe de contenus canoniques, sans scraping live ni dépendance réseau.
          </p>
        </div>
        <ScanSearch className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>

      <div className="grid gap-3">
        {results.map((result) => {
          const source = sourceById.get(result.sourceId);

          return (
            <div key={result.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{source?.title ?? result.sourceId}</p>
                  <p className="mt-2 break-all font-mono text-xs text-muted">
                    {result.previousHash} vers {result.canonicalContentHash}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">{result.recommendedAction}</p>
                </div>
                <Badge tone={result.status === "unchanged" ? "success" : "warning"}>{result.status}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
