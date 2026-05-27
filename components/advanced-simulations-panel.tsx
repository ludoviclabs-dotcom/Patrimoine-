import { GitCompareArrows, Landmark, Scale } from "lucide-react";
import { CalculationSteps } from "@/components/calculation-steps";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { demoHousehold } from "@/lib/demo-data/household";
import { formatEuro } from "@/lib/format";
import { simulateSciArbitrage } from "@/lib/simulations/advanced";
import { simulateRealEstateGainV2, simulateTransmissionV2 } from "@/lib/tax/v2-engines";

export function AdvancedSimulationsPanel() {
  const donation = simulateTransmissionV2({
    assetValue: 300_000,
    donorAge: 51,
    children: 2,
    useDismemberment: true,
  });
  const donationValue = typeof donation.steps[1]?.outputValue === "number" ? donation.steps[1].outputValue : 0;
  const plusValue = simulateRealEstateGainV2({
    salePrice: 720_000,
    purchasePrice: 600_000,
    acquisitionCosts: 24_000,
    works: 0,
    yearsHeld: 9,
  });
  const sci = simulateSciArbitrage({
    householdId: demoHousehold.id,
    propertyValue: 600_000,
    debt: 220_000,
    annualRent: 33_600,
    annualCharges: 11_400,
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Donation démembrée</CardTitle>
              <p className="mt-1 text-sm text-muted">Valeur fiscale et droits indicatifs V2.</p>
            </div>
            <Scale className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <p className="font-mono text-3xl font-semibold text-foreground">
            {formatEuro(donationValue)}
          </p>
          <Badge className="mt-4" tone="warning">
            À valider notaire/fiscaliste
          </Badge>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Plus-value immobilière</CardTitle>
              <p className="mt-1 text-sm text-muted">Impôt indicatif après abattements et surtaxe.</p>
            </div>
            <Landmark className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <p className="font-mono text-3xl font-semibold text-foreground">
            {formatEuro(plusValue.resultAmount ?? 0)}
          </p>
          <Badge className="mt-4" tone="warning">
            Revue requise
          </Badge>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Arbitrage SCI</CardTitle>
              <p className="mt-1 text-sm text-muted">Flux annuel avant fiscalité.</p>
            </div>
            <GitCompareArrows className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <p className="font-mono text-3xl font-semibold text-foreground">
            {formatEuro(sci.result.annualCashflowBeforeTax)}
          </p>
          <Badge className="mt-4" tone="warning">
            Statut indicatif
          </Badge>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <CalculationSteps steps={donation.steps} />
        <CalculationSteps steps={plusValue.steps} />
        <CalculationSteps steps={sci.steps} />
      </section>
    </div>
  );
}
