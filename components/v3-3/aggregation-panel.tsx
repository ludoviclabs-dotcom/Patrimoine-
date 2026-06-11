import { Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { AggregatedAccount } from "@/lib/types";

const typeLabels: Record<AggregatedAccount["type"], string> = {
  checking: "Compte courant",
  savings: "Épargne",
  securities: "Titres",
  "life-insurance": "Assurance-vie",
};

export function AggregationPanel({ accounts }: { accounts: AggregatedAccount[] }) {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Mes comptes</CardEyebrow>
          <CardTitle className="mt-1">Agrégation bancaire</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Connecteur Powens/DSP2 simulé : soldes fixtures à rapprocher des actifs déclarés, aucun
            secret bancaire stocké.
          </p>
        </div>
        <Banknote className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>
      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-border p-4"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{account.label}</p>
              <p className="mt-1 text-xs text-muted">
                {typeLabels[account.type]}
                {account.iban ? ` · ${account.iban}` : ""} · synchronisé le{" "}
                {account.lastSyncedAt.slice(0, 10)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-foreground">
                {formatEuro(account.balance)}
              </span>
              <Badge tone="teal" dot>
                Agrégé (simulé)
              </Badge>
              {account.consentStatus === "expired" ? (
                <Badge tone="warning" dot>
                  Consentement à renouveler
                </Badge>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">
        Total agrégé : {formatEuro(total)} — à rapprocher des actifs déclarés avant toute simulation.
      </p>
    </Card>
  );
}
