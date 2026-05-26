import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/format";
import type { AllocationItem } from "@/lib/demo-data/metrics";

export function AllocationPanel({
  allocation,
  grossWealth,
}: {
  allocation: AllocationItem[];
  grossWealth: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Cartographie patrimoniale</CardTitle>
          <p className="mt-1 text-sm text-muted">Allocation par grands blocs d’actifs.</p>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {allocation.map((item) => {
          const ratio = item.value / grossWealth;
          return (
            <div key={item.category}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className="font-mono text-sm text-muted">
                  {formatEuro(item.value)} · {formatPercent(ratio)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(ratio * 100, 4)}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
