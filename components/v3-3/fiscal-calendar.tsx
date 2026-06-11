import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { getUpcomingDeadlines } from "@/lib/calendar/fiscal-deadlines";
import type { FiscalDeadline } from "@/lib/types";

const scopeLabels: Record<FiscalDeadline["scope"], string> = {
  ir: "IR",
  is: "IS",
  sci: "SCI",
  ifi: "IFI",
  cfe: "CFE",
  dutreil: "Dutreil",
  "holding-tax": "Taxe holding",
};

export function FiscalCalendar({ limit = 6 }: { limit?: number }) {
  const deadlines = getUpcomingDeadlines("2026-06-11", limit);

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Calendrier fiscal</CardEyebrow>
          <CardTitle className="mt-1">Prochaines échéances du dossier</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Dates de campagne indicatives — à confirmer chaque année sur impots.gouv.fr.
          </p>
        </div>
        <CalendarClock className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>
      <div className="space-y-0">
        {deadlines.map((deadline, index) => (
          <div key={deadline.id} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--gold)]" aria-hidden />
              {index < deadlines.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
              ) : null}
            </div>
            <div className="flex-1 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-xs font-semibold text-muted">{deadline.date}</p>
                <Badge>{scopeLabels[deadline.scope]}</Badge>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{deadline.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{deadline.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
