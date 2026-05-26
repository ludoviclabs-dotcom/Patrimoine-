import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineEvent } from "@/lib/types";

const tones: Record<TimelineEvent["status"], Parameters<typeof Badge>[0]["tone"]> = {
  regulatory: "teal",
  planned: "success",
  "to-review": "warning",
};

export function PatrimonialTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Timeline patrimoniale</CardTitle>
          <p className="mt-1 text-sm text-muted">Echeances reglementaires et decisions a rejouer.</p>
        </div>
        <CalendarDays className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-mono text-lg font-semibold text-foreground">{event.year}</span>
              <Badge tone={tones[event.status]}>{event.status}</Badge>
            </div>
            <p className="text-sm font-semibold text-foreground">{event.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{event.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
