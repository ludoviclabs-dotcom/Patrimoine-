import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { Household } from "@/lib/types";

const labels = {
  liquidity: "Liquidités",
  financial: "Financier",
  insurance: "Assurance-vie",
  "real-estate": "Immobilier",
  company: "Entreprise",
};

export function AssetTable({ household }: { household: Household }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Actifs et passifs</CardTitle>
          <p className="mt-1 text-sm text-muted">Données fictives utilisées par la V0.</p>
        </div>
      </CardHeader>
      <div className="space-y-2">
        <div className="hidden grid-cols-[1fr_0.6fr_0.7fr] gap-4 border-b border-border pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:grid">
          <span>Libellé</span>
          <span>Bloc</span>
          <span className="text-right">Valeur</span>
        </div>
        {household.assets.map((asset) => (
          <div
            key={asset.id}
            className="grid gap-2 border-b border-border py-3 sm:grid-cols-[1fr_0.6fr_0.7fr] sm:gap-4"
          >
            <p className="text-sm font-semibold text-foreground">{asset.label}</p>
            <p className="text-sm text-muted">{labels[asset.category]}</p>
            <p className="font-mono text-sm font-semibold text-foreground sm:text-right">
              {formatEuro(asset.value)}
            </p>
          </div>
        ))}
        {household.liabilities.map((liability) => (
          <div
            key={liability.id}
            className="grid gap-2 border-b border-border py-3 sm:grid-cols-[1fr_0.6fr_0.7fr] sm:gap-4"
          >
            <p className="text-sm font-semibold text-foreground">{liability.label}</p>
            <p className="text-sm text-muted">Passif</p>
            <p className="font-mono text-sm font-semibold text-red-700 sm:text-right">
              -{formatEuro(liability.value)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
