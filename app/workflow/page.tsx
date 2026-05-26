import { AppShell } from "@/components/app-shell";
import { WorkflowWorkbench } from "@/components/v1-2/workflow-workbench";

export default function WorkflowPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Workflow métier réel</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Créer un dossier, saisir actifs/passifs, lancer une simulation persistée, rejouer,
            enregistrer une revue expert et générer un rapport versionné. Mode demo sans Postgres.
          </p>
        </section>
        <WorkflowWorkbench />
      </div>
    </AppShell>
  );
}
