import { AppShell } from "@/components/app-shell";
import { ReviewWorkbench } from "@/components/review-workbench";

export default function ReviewPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Revue professionnelle</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Aucune simulation sensible ne devient un livrable officiel sans approbation humaine
            explicite et journalisée.
          </p>
        </section>
        <ReviewWorkbench />
      </div>
    </AppShell>
  );
}
