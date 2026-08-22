import { AppShell } from "@/components/app-shell";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { CardHeader } from "@/components/ui/card";
import { ServerReviewConsole } from "@/components/review/server-review-console";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import {
  describeUnavailable,
  loadReportConsole,
  type ReportConsoleResult,
} from "@/lib/report/report-console";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { ReviewWorkbench } from "@/components/review-workbench";
import { ReviewQueue, RiskPanel } from "@/components/v2-6/cabinet-refonte";

export const dynamic = "force-dynamic";

/**
 * PF-07B — the review screen now carries the real signing action.
 *
 * It resolves its own tenant context exactly as /report does, and reuses the
 * same server read model, so a role, a blocker or a decision can never
 * disagree between the two cabinet screens. The fixture queue below is
 * unchanged demonstration content.
 */
async function resolveConsole(caseId?: string): Promise<ReportConsoleResult> {
  try {
    const context = await requireClerkTenantContext();
    return await loadReportConsole(context, { caseId });
  } catch (error) {
    return describeUnavailable(error instanceof Error ? error.message : "REPORT_CONSOLE_UNAVAILABLE");
  }
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const caseId = typeof query.dossier === "string" ? query.dossier : undefined;
  const reviewConsole = await resolveConsole(caseId);

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Contrôle humain"
          title="Revue"
          lead="File de revue humaine : cas bloquants, motif, professionnel requis et prochaine action. Une simulation sensible ne devient jamais un livrable sans validation."
        />

        <section className="space-y-4">
          {reviewConsole.available ? (
            <ServerReviewConsole state={reviewConsole} />
          ) : (
            <Card className="border-[var(--warning)]">
              <CardHeader>
                <h2 className="text-lg font-semibold">{reviewConsole.title}</h2>
                <Badge tone="warning" dot>revue serveur indisponible</Badge>
              </CardHeader>
              <p className="text-sm">{reviewConsole.detail}</p>
              <p className="mt-2 text-sm font-medium">
                Prochaine action : {reviewConsole.nextAction}
              </p>
              <code className="mt-2 block text-xs text-muted">{reviewConsole.code}</code>
              <p className="mt-3 text-sm text-muted">
                La file ci-dessous reste une démonstration : elle ne signe aucune revue.
              </p>
            </Card>
          )}
        </section>

        <ReviewQueue />
        <RiskPanel />

        <Reveal>
          <Card elevated>
            <Accordion type="single" collapsible>
              <AccordionItem value="workbench">
                <AccordionTrigger>Tester le workbench de décision historique</AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <ReviewWorkbench />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </Reveal>
      </div>
    </AppShell>
  );
}
