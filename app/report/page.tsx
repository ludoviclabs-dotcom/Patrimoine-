import { AppShell } from "@/components/app-shell";
import { ReportDocument } from "@/components/report-document";
import { ReportPrintButton } from "@/components/report-print-button";
import { ReportConclusionGrid, RiskPanel } from "@/components/v2-6/cabinet-refonte";
import { reportConclusionCards } from "@/lib/cabinet-refonte/v2-6";
import { demoHousehold } from "@/lib/demo-data/household";
import { getReportSummary } from "@/lib/report/report-data";
import { calculateIfi } from "@/lib/simulations/ifi";

export default function ReportPage() {
  const ifiRun = calculateIfi(demoHousehold);
  const summary = getReportSummary(demoHousehold);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="no-print flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Rapports</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Deux lectures : synthèse client et annexe conseiller. Chaque conclusion affiche
              donnée utilisée, hypothèse, règle, source, limite et action de revue.
            </p>
          </div>
          <ReportPrintButton />
        </div>

        <ReportConclusionGrid conclusions={reportConclusionCards} />
        <RiskPanel />
        <ReportDocument household={demoHousehold} summary={summary} ifiRun={ifiRun} />
      </div>
    </AppShell>
  );
}
