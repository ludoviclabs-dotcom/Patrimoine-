import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";
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
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Livrables"
          title="Rapports"
          lead="Deux lectures : synthèse client et annexe conseiller. Chaque conclusion affiche donnée utilisée, hypothèse, règle, source, limite et action de revue."
          actions={<ReportPrintButton />}
          className="no-print"
        />

        <ReportConclusionGrid conclusions={reportConclusionCards} />
        <RiskPanel />
        <ReportDocument household={demoHousehold} summary={summary} ifiRun={ifiRun} />
      </div>
    </AppShell>
  );
}
