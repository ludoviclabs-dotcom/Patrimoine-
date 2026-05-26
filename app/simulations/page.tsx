import { AppShell } from "@/components/app-shell";
import { SimulationsClient } from "@/components/simulations-client";
import { TaxRunsPanel } from "@/components/v2/tax-runs-panel";
import { demoAuditTrail } from "@/lib/demo-data/audit";
import { demoHousehold } from "@/lib/demo-data/household";
import { calculateIfi } from "@/lib/simulations/ifi";
import { getV2TaxRuns } from "@/lib/tax/v2-engines";

export default function SimulationsPage() {
  const ifiRun = calculateIfi(demoHousehold);
  const taxRuns = getV2TaxRuns();

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Simulations fiscales cabinet</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Moteur déterministe, étapes de calcul, sources officielles et validation
            professionnelle pour IFI, IR/PFU/CDHR, transmission, Dutreil, apport-cession
            et taxe holding.
          </p>
        </div>
        <TaxRunsPanel runs={taxRuns} />
        <SimulationsClient ifiRun={ifiRun} initialAudit={demoAuditTrail} />
      </div>
    </AppShell>
  );
}
