import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { ReportDocument } from "@/components/report-document";
import { ReportPrintButton } from "@/components/report-print-button";
import { ServerReportConsole } from "@/components/report/server-report-console";
import { ReportConclusionGrid, RiskPanel } from "@/components/v2-6/cabinet-refonte";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import { reportConclusionCards } from "@/lib/cabinet-refonte/v2-6";
import { demoHousehold } from "@/lib/demo-data/household";
import { describeUnavailable, loadReportConsole, type ReportConsoleResult } from "@/lib/report/report-console";
import { getReportSummary } from "@/lib/report/report-data";
import { calculateIfi } from "@/lib/simulations/ifi";

export const dynamic = "force-dynamic";

/**
 * Cabinet report screen.
 *
 * The professional deliverable is the server pipeline: snapshot, immutable
 * version, watermark, validation and audited private download. The historical
 * browser rendering is kept below as an explicitly non-final working preview.
 */
async function resolveConsole(params: {
  caseId?: string;
  simulationRunIds?: string[];
  legalFreezeDate?: string;
}): Promise<ReportConsoleResult> {
  try {
    const context = await requireClerkTenantContext();
    return await loadReportConsole(context, params);
  } catch (error) {
    return describeUnavailable(error instanceof Error ? error.message : "REPORT_CONSOLE_UNAVAILABLE");
  }
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const caseId = typeof query.dossier === "string" ? query.dossier : undefined;
  const legalFreezeDate = typeof query.gel === "string" ? query.gel : undefined;
  const simulationRunIds = typeof query.runs === "string"
    ? query.runs.split(",").filter(Boolean)
    : undefined;

  const reportConsole = await resolveConsole({ caseId, simulationRunIds, legalFreezeDate });
  const ifiRun = calculateIfi(demoHousehold);
  const summary = getReportSummary(demoHousehold);

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Livrables"
          title="Rapports"
          lead="Le rapport professionnel est produit côté serveur depuis un snapshot immuable, filigrané tant qu'il n'est pas validé, puis téléchargé via un accès privé audité."
          className="no-print"
        />

        <section className="no-print space-y-4">
          {reportConsole.available ? (
            <ServerReportConsole state={reportConsole} />
          ) : (
            <Card className="border-[var(--warning)]">
              <CardHeader>
                <h2 className="text-lg font-semibold">{reportConsole.title}</h2>
                <Badge tone="warning" dot>pipeline serveur indisponible</Badge>
              </CardHeader>
              <p className="text-sm">{reportConsole.detail}</p>
              <code className="mt-2 block text-xs text-muted">{reportConsole.code}</code>
              <p className="mt-3 text-sm text-muted">
                Aucun document final n&apos;est produit tant que le pipeline serveur n&apos;est pas
                disponible. L&apos;aperçu ci-dessous reste un document de travail.
              </p>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <Card className="no-print border-[var(--warning)]">
            <CardHeader>
              <div>
                <h2 className="text-lg font-semibold">Aperçu de travail — NON FINAL</h2>
                <p className="mt-1 text-sm text-muted">
                  Rendu navigateur sur données de démonstration. Il n&apos;est ni versionné, ni horodaté,
                  ni signé, ni stocké : il ne constitue jamais le rapport cabinet remis au client.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning" dot>aperçu</Badge>
                <ReportPrintButton />
              </div>
            </CardHeader>
          </Card>

          <ReportConclusionGrid conclusions={reportConclusionCards} />
          <RiskPanel />
          <ReportDocument household={demoHousehold} summary={summary} ifiRun={ifiRun} />
        </section>
      </div>
    </AppShell>
  );
}
