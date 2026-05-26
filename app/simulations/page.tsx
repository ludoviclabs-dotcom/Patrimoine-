import { AppShell } from "@/components/app-shell";
import { SimulationsClient } from "@/components/simulations-client";
import { demoAuditTrail } from "@/lib/demo-data/audit";
import { demoHousehold } from "@/lib/demo-data/household";
import { calculateIfi } from "@/lib/simulations/ifi";

export default function SimulationsPage() {
  const ifiRun = calculateIfi(demoHousehold);

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Simulation IFI</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Moteur déterministe, étapes de calcul et sources officielles liées au résultat.
          </p>
        </div>
        <SimulationsClient ifiRun={ifiRun} initialAudit={demoAuditTrail} />
      </div>
    </AppShell>
  );
}
