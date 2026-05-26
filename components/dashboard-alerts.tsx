import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type Alert = {
  id: string;
  title: string;
  detail: string;
  tone: "warning" | "success" | "neutral";
};

const iconByTone = {
  warning: AlertTriangle,
  success: CheckCircle2,
  neutral: Info,
};

const classByTone = {
  warning: "bg-amber-50 text-amber-800",
  success: "bg-emerald-50 text-emerald-800",
  neutral: "bg-slate-50 text-slate-700",
};

export function DashboardAlerts({ alerts }: { alerts: Alert[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Points de vigilance</CardTitle>
          <p className="mt-1 text-sm text-muted">Priorités pour la revue professionnelle.</p>
        </div>
      </CardHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        {alerts.map((alert) => {
          const Icon = iconByTone[alert.tone];
          return (
            <div key={alert.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${classByTone[alert.tone]}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{alert.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{alert.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
