import { AppShell } from "@/components/app-shell";
import { ReviewWorkbench } from "@/components/review-workbench";
import { ReviewQueue, RiskPanel } from "@/components/v2-6/cabinet-refonte";

export default function ReviewPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Revue</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            File de revue humaine : cas bloquants, motif, professionnel requis et prochaine
            action. Une simulation sensible ne devient jamais un livrable sans validation.
          </p>
        </section>

        <ReviewQueue />
        <RiskPanel />

        <details className="rounded-lg border border-border bg-white p-5">
          <summary className="cursor-pointer text-base font-semibold text-foreground">
            Tester le workbench de décision historique
          </summary>
          <div className="mt-5">
            <ReviewWorkbench />
          </div>
        </details>
      </div>
    </AppShell>
  );
}
