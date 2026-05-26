import { AppShell } from "@/components/app-shell";
import { ReportDocument } from "@/components/report-document";
import { ReportPrintButton } from "@/components/report-print-button";
import { demoHousehold } from "@/lib/demo-data/household";
import { getReportSummary } from "@/lib/report/report-data";
import { calculateIfi } from "@/lib/simulations/ifi";

export default function ReportPage() {
  const ifiRun = calculateIfi(demoHousehold);
  const summary = getReportSummary(demoHousehold);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="no-print flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Rapport professionnel</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Prêt pour impression navigateur ou export PDF local.
            </p>
          </div>
          <ReportPrintButton />
        </div>
        <ReportDocument household={demoHousehold} summary={summary} ifiRun={ifiRun} />
      </div>
    </AppShell>
  );
}
