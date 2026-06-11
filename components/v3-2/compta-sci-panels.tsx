import { AlertTriangle, BookOpenCheck, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { SciAccountingSnapshot, TrialBalanceLine } from "@/lib/types";

export function TrialBalancePanel({
  lines,
  journals,
}: {
  lines: TrialBalanceLine[];
  journals: Array<{ journal: string; entries: number; lastEntryDate: string }>;
}) {
  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Pennylane (simulé)</CardEyebrow>
          <CardTitle className="mt-1">Balance générale SCI</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Balance fixture — le connecteur réel (API Pennylane v2) se branche sans changer cette vue.
          </p>
        </div>
        <BookOpenCheck className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>
      <div className="overflow-auto rounded-[var(--r-md)] border border-border">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3 font-semibold">Compte</th>
              <th className="px-4 py-3 font-semibold">Libellé</th>
              <th className="px-4 py-3 text-right font-semibold">Débit</th>
              <th className="px-4 py-3 text-right font-semibold">Crédit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.account} className={index % 2 === 1 ? "bg-[var(--surface-soft)]" : undefined}>
                <td className="px-4 py-2 font-mono text-xs">{line.account}</td>
                <td className="px-4 py-2">{line.label}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {line.debit ? formatEuro(line.debit) : "—"}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">
                  {line.credit ? formatEuro(line.credit) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {journals.map((journal) => (
          <Badge key={journal.journal}>
            {journal.journal} · {journal.entries} écritures · {journal.lastEntryDate}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

export function SciSnapshotPanel({ snapshot }: { snapshot: SciAccountingSnapshot }) {
  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Liasses indicatives {snapshot.fiscalYear}</CardEyebrow>
          <CardTitle className="mt-1">Classification 2072 (IR) / 2065 (IS)</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Mapping indicatif — aucun dépôt sans revue expert-comptable.
          </p>
        </div>
        <Landmark className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--r-md)] border border-border p-4">
          <p className="text-sm font-semibold text-foreground">2072 — SCI à l&apos;IR</p>
          <div className="mt-3 space-y-2">
            {snapshot.form2072Lines.map((line) => (
              <div key={line.code} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">
                  <span className="font-mono text-xs">{line.code}</span> · {line.label}
                </span>
                <span className="font-mono font-semibold text-foreground">{formatEuro(line.amount)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Amortissements non déductibles à l&apos;IR : résultat foncier réparti entre associés.
          </p>
        </div>

        <div className="rounded-[var(--r-md)] border border-border p-4">
          <p className="text-sm font-semibold text-foreground">2065 — SCI à l&apos;IS (option)</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Résultat fiscal après amortissements</span>
              <span className="font-mono font-semibold text-foreground">
                {formatEuro(snapshot.form2065.taxableProfit)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">IS indicatif (barème 15/25 %)</span>
              <span className="font-mono font-semibold text-foreground">
                {formatEuro(snapshot.form2065.isAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Taux effectif</span>
              <span className="font-mono font-semibold text-foreground">
                {snapshot.form2065.effectiveRatePercent.toLocaleString("fr-FR")} %
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Comptes courants d&apos;associés (455)</span>
              <span className="font-mono font-semibold text-foreground">
                {formatEuro(snapshot.partnerCurrentAccounts)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <FlagCard
          label="TVA sur loyers"
          active={snapshot.flags.vatOnRents}
          detail="Location nue exonérée sauf option expresse — vérifier le bail et l'option."
        />
        <FlagCard
          label="CRL 2,5 %"
          active={snapshot.flags.crlDue}
          detail="Due par les personnes morales à l'IS sur immeubles achevés depuis 15 ans ou plus."
        />
        <FlagCard
          label="CFE"
          active={snapshot.flags.cfeDue}
          detail="Location nue imposable au-delà de 100 000 € de recettes annuelles."
        />
      </div>
    </Card>
  );
}

function FlagCard({ label, active, detail }: { label: string; active: boolean; detail: string }) {
  return (
    <div
      className={
        active
          ? "rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--warning)_28%,var(--border))] bg-[var(--warning-soft)] p-3"
          : "rounded-[var(--r-md)] border border-border bg-[var(--surface-soft)] p-3"
      }
    >
      <div className="flex items-center gap-2">
        {active ? <AlertTriangle className="h-4 w-4 text-[var(--warning)]" aria-hidden /> : null}
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <Badge tone={active ? "warning" : "neutral"} dot>
          {active ? "À qualifier" : "Non signalé"}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}
