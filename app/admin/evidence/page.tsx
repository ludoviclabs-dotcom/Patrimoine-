import { AppShell } from "@/components/app-shell";
import { EvidenceAdminWorkbench } from "@/components/v1-2/evidence-admin-workbench";

export default function EvidenceAdminPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Admin règles et sources</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Contrôle de snapshots, hash réel si activé, alertes de changement et diff de règles
            avant recalcul des dossiers.
          </p>
        </section>
        <EvidenceAdminWorkbench />
      </div>
    </AppShell>
  );
}
