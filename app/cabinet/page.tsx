import { AdvancedSimulationsPanel } from "@/components/advanced-simulations-panel";
import { AppShell } from "@/components/app-shell";
import { V1StatusBoard } from "@/components/v1-status-board";

export default function CabinetPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Portail cabinet V1</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Socle pilotable : tenant, rôles, dossiers, documents, simulations étendues et validation
            professionnelle, sans activer d&apos;IA runtime.
          </p>
        </section>
        <V1StatusBoard />
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Moteurs métier V1</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Les nouveaux scénarios restent indicatifs et produisent des étapes de calcul sourcées.
            </p>
          </div>
          <AdvancedSimulationsPanel />
        </section>
      </div>
    </AppShell>
  );
}
