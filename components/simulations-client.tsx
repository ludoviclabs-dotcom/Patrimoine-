"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { AuditTrail, type AuditEvent } from "@/components/audit-trail";
import { CalculationSteps } from "@/components/calculation-steps";
import { LegalNotice } from "@/components/legal-notice";
import { EInvoicingPanel, IfiSummaryPanel, TransmissionPanel } from "@/components/scenario-panels";
import { Button } from "@/components/ui/button";
import { CoverageLimitsPanel } from "@/components/v1-1/coverage-limits-panel";
import { WhyThisResultPanel } from "@/components/v1-1/why-this-result-panel";
import { formatEuro } from "@/lib/format";
import type { calculateIfi } from "@/lib/simulations/ifi";

type ScenarioKey = "ifi" | "transmission" | "facturation-electronique";
type IfiRun = ReturnType<typeof calculateIfi>;

const labels: Record<ScenarioKey, string> = {
  ifi: "IFI",
  transmission: "Transmission",
  "facturation-electronique": "Facturation électronique",
};

export function SimulationsClient({
  ifiRun,
  initialAudit,
}: {
  ifiRun: IfiRun;
  initialAudit: AuditEvent[];
}) {
  const [active, setActive] = useState<ScenarioKey>("ifi");
  const [events, setEvents] = useState<AuditEvent[]>(initialAudit);
  const [showWhy, setShowWhy] = useState(false);

  const launchSimulation = () => {
    const now = new Date();
    const stamped = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(now);

    setEvents((current) => [
      {
        id: `audit-local-${now.getTime()}`,
        at: stamped,
        actor: labels[active],
        event: `Simulation ${labels[active]} lancée en mode démo`,
      },
      ...current,
    ]);
  };

  const activePanel = useMemo(() => {
    if (active === "transmission") {
      return <TransmissionPanel />;
    }

    if (active === "facturation-electronique") {
      return <EInvoicingPanel />;
    }

    return (
      <div className="space-y-5">
        <IfiSummaryPanel
          taxableBase={formatEuro(ifiRun.result.taxableBase ?? 0)}
          threshold={formatEuro(ifiRun.result.threshold)}
          message={ifiRun.result.message}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setShowWhy((current) => !current)}>
            Pourquoi ce résultat ?
          </Button>
        </div>
        {showWhy ? <WhyThisResultPanel step={ifiRun.steps[0]} /> : null}
        <CalculationSteps steps={ifiRun.steps} />
        <CoverageLimitsPanel module="ifi" />
        <LegalNotice compact />
      </div>
    );
  }, [active, ifiRun, showWhy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-white p-4 shadow-[var(--shadow)] lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Scénarios">
          {(Object.keys(labels) as ScenarioKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              onClick={() => setActive(key)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
                active === key
                  ? "bg-[var(--surface-strong)] text-white"
                  : "bg-[var(--surface-soft)] text-muted hover:text-foreground"
              }`}
            >
              {active === key ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
              {labels[key]}
            </button>
          ))}
        </div>
        <Button type="button" onClick={launchSimulation}>
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          Lancer simulation
        </Button>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">{activePanel}</div>
        <AuditTrail events={events} />
      </div>
    </div>
  );
}
