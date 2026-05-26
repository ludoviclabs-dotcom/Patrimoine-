import { Clock3 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  event: string;
};

export function AuditTrail({ events }: { events: AuditEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Journal d’audit demo</CardTitle>
          <p className="mt-1 text-sm text-muted">Trace locale des actions du parcours.</p>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="flex gap-3">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-muted">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{event.event}</p>
              <p className="mt-1 font-mono text-xs text-muted">
                {event.at} · {event.actor}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
