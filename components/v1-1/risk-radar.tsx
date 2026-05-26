import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskRadarItem } from "@/lib/types";

export function RiskRadar({ items }: { items: RiskRadarItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Radar de vigilance</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Radar declaratif de points d&apos;attention, sans scoring d&apos;eligibilite.
          </p>
        </div>
        <Activity className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.axis} className="rounded-lg border border-border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)] sm:w-40"
                aria-label={`${item.label} niveau ${item.vigilanceLevel} sur 5`}
              >
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${item.vigilanceLevel * 20}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{item.rationale}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
