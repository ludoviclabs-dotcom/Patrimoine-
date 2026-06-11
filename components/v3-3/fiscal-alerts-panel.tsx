import { BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { FiscalAlert } from "@/lib/types";

const severityTone: Record<FiscalAlert["severity"], "neutral" | "warning" | "danger"> = {
  info: "neutral",
  warning: "warning",
  critical: "danger",
};

const severityLabels: Record<FiscalAlert["severity"], string> = {
  info: "Information",
  warning: "À surveiller",
  critical: "Action requise",
};

export function FiscalAlertsPanel({ alerts }: { alerts: FiscalAlert[] }) {
  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Alertes fiscales chiffrées</CardEyebrow>
          <CardTitle className="mt-1">Dérivées des moteurs</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Chaque montant provient d&apos;un run traçable — pas de texte statique.
          </p>
        </div>
        <BellRing className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-[var(--r-md)] border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {formatEuro(alert.amount)}
                </span>
                <Badge tone={severityTone[alert.severity]} dot>
                  {severityLabels[alert.severity]}
                </Badge>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{alert.explanation}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{alert.nextAction}</p>
            <p className="mt-2 font-mono text-xs text-muted">Run : {alert.computedFromRunId}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
