import { AppShell } from "@/components/app-shell";
import { DossierWorkspaceV26, LifeEventRail } from "@/components/v2-6/cabinet-refonte";

export default function DossiersPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Dossiers</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Le cabinet pilote ses dossiers par objectifs client, documents attendus, simulations
            utiles, preuves et revue professionnelle.
          </p>
        </section>

        <DossierWorkspaceV26 />
        <LifeEventRail />
      </div>
    </AppShell>
  );
}
