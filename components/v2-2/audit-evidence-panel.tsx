import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getPfuDiffAuditEvents } from "@/lib/evidence/pfu-rule-diff";

export function AuditEvidencePanel() {
  const events = getPfuDiffAuditEvents();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Piste d&apos;audit métier</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Qui a contrôlé quoi, sur quelle règle, et quelle action de recalcul a été déclenchée.
          </p>
        </div>
        <ScrollText className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{event.summary}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {event.createdAt} · {event.actorUserId}
                </p>
              </div>
              <Badge tone={event.action === "simulation.recalculation_required" ? "warning" : "teal"}>
                {event.action}
              </Badge>
            </div>
            <p className="mt-3 font-mono text-xs text-muted">
              {event.entityType}:{event.entityId}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
