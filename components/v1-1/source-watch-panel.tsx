import { RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { runDemoSourceWatch } from "@/lib/source-watch/watcher";

const tones = {
  unchanged: "success",
  changed: "warning",
  failed: "danger",
} as const;

export function SourceWatchPanel() {
  const results = [...runDemoSourceWatch()].sort((a, b) => {
    if (a.status === b.status) return a.sourceId.localeCompare(b.sourceId);
    return a.status === "changed" ? -1 : 1;
  });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Source watcher</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Simulation stable du cron Vercel : controle hash sans scraping agressif.
          </p>
        </div>
        <RotateCw className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="space-y-3">
        {results.slice(0, 5).map((result) => (
          <div key={result.sourceId} className="rounded-lg border border-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{result.sourceId}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {result.previousHash} - {result.currentHash}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{result.recommendedAction}</p>
              </div>
              <Badge tone={tones[result.status]}>{result.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
