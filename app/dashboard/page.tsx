import { ArrowRight, Banknote, CircleDollarSign, Landmark, WalletCards } from "lucide-react";
import Link from "next/link";
import { AllocationPanel } from "@/components/allocation-panel";
import { AppShell } from "@/components/app-shell";
import { AssetTable } from "@/components/asset-table";
import { AuditTrail } from "@/components/audit-trail";
import { EvidenceRail } from "@/components/evidence-list";
import { FiscalAlertsPanel } from "@/components/v3-3/fiscal-alerts-panel";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { demoAuditTrail } from "@/lib/demo-data/audit";
import { demoHousehold } from "@/lib/demo-data/household";
import {
  getAllocation,
  getGrossWealth,
  getLiquidity,
  getNetWealth,
  getTotalDebt,
} from "@/lib/demo-data/metrics";
import { getFiscalAlerts } from "@/lib/alerts/fiscal-alerts";
import { evidenceSources } from "@/lib/evidence/sources";
import { formatEuro } from "@/lib/format";
import { calculateIfi } from "@/lib/simulations/ifi";

export default function DashboardPage() {
  const grossWealth = getGrossWealth(demoHousehold);
  const totalDebt = getTotalDebt(demoHousehold);
  const netWealth = getNetWealth(demoHousehold);
  const liquidity = getLiquidity(demoHousehold);
  const allocation = getAllocation(demoHousehold);
  const fiscalAlerts = getFiscalAlerts();
  const ifiRun = calculateIfi(demoHousehold);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Patrimoine brut"
            value={formatEuro(grossWealth)}
            detail="Actifs déclarés dans le persona demo."
            icon={CircleDollarSign}
          />
          <KpiCard
            label="Dettes"
            value={formatEuro(totalDebt)}
            detail="Passifs à rattacher aux biens concernés."
            icon={Banknote}
          />
          <KpiCard
            label="Patrimoine net"
            value={formatEuro(netWealth)}
            detail="Actifs bruts diminués des dettes."
            icon={Landmark}
          />
          <KpiCard
            label="Liquidité"
            value={formatEuro(liquidity)}
            detail="Disponible immédiat avant arbitrage."
            icon={WalletCards}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-6">
            <AllocationPanel allocation={allocation} grossWealth={grossWealth} />
            <FiscalAlertsPanel alerts={fiscalAlerts} />
            <AssetTable household={demoHousehold} />
          </div>
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Diagnostic IFI</CardTitle>
                  <p className="mt-1 text-sm text-muted">Résultat indicatif du moteur déterministe.</p>
                </div>
              </CardHeader>
              <p className="font-mono text-4xl font-semibold text-foreground">
                {formatEuro(ifiRun.result.taxableBase ?? 0)}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">{ifiRun.result.message}</p>
              <Link
                href="/simulations"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white transition hover:bg-[#223029]"
              >
                Voir le calcul
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
            <EvidenceRail sources={evidenceSources} />
            <AuditTrail events={demoAuditTrail} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
