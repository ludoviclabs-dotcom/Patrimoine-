import { FileCheck2, Landmark, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  eInvoicingReadiness,
  getEInvoicingScore,
  getEInvoicingTimelineEvent,
  resolveEInvoicingEventStatus,
  type EInvoicingReadinessItem,
} from "@/lib/simulations/e-invoicing";
import { transmissionChecklist, transmissionQuestions } from "@/lib/simulations/transmission";

const statusTone = {
  ready: "success",
  partial: "warning",
  missing: "danger",
  needs_review: "warning",
} as const;

const statusLabel = {
  ready: "Simulation prête à lancer",
  partial: "Partiel",
  missing: "Manquant",
  needs_review: "À revoir",
};

const frenchDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Formule l'échéance à partir du jalon légal résolu (date d'effet + statut) et
 * non d'une chaîne métier figée : « à compter du » avant l'entrée en vigueur,
 * « depuis le » après (correction P0 TAX-P0-005).
 */
function formatReadinessDeadline(item: EInvoicingReadinessItem, asOfDate: string) {
  if (!item.timelineEventId) return item.operationalDeadline ?? "";
  const event = getEInvoicingTimelineEvent(item.timelineEventId);
  if (!event) return item.operationalDeadline ?? "";
  const status = resolveEInvoicingEventStatus(event.effectiveDate, asOfDate);
  const [year, month, day] = event.effectiveDate.split("-").map(Number);
  const label = frenchDate.format(new Date(Date.UTC(year, month - 1, day)));
  return status === "IN_FORCE" ? `Obligatoire depuis le ${label}` : `À compter du ${label}`;
}

export function TransmissionPanel() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Transmission familiale</CardTitle>
          <p className="mt-1 text-sm text-muted">Checklist professionnelle sans calcul fiscal définitif.</p>
        </div>
        <FileCheck2 className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {transmissionChecklist.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  {item.owner}
                </p>
              </div>
              <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-[var(--surface-soft)] p-4">
          <h3 className="text-sm font-semibold text-foreground">Questions ouvertes</h3>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-muted">
            {transmissionQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function EInvoicingPanel({ asOfDate }: { asOfDate?: string } = {}) {
  const score = getEInvoicingScore();
  // L'UI fournit la date du jour ; le moteur de règle ne lit jamais l'horloge.
  const resolvedAsOfDate = asOfDate ?? new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Facturation électronique TPE/PME</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Réception 2026, émission PME/micro 2027 et plateforme agréée.
          </p>
        </div>
        <ReceiptText className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-lg bg-[var(--surface-soft)] p-5">
          <p className="text-sm font-medium text-muted">Score de préparation</p>
          <p className="mt-3 font-mono text-5xl font-semibold text-foreground">{score}%</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${score}%` }} />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Réception, émission et e-reporting sont trois obligations distinctes, échelonnées
            selon la taille de l&apos;entreprise. Le statut de chaque jalon est daté ci-contre.
          </p>
        </div>
        <div className="space-y-3">
          {eInvoicingReadiness.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {formatReadinessDeadline(item, resolvedAsOfDate)}
                </p>
              </div>
              <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function IfiSummaryPanel({
  taxableBase,
  threshold,
  message,
}: {
  taxableBase: string;
  threshold: string;
  message: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Simulation IFI</CardTitle>
          <p className="mt-1 text-sm text-muted">Base immobilière au 1er janvier 2026.</p>
        </div>
        <Landmark className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-medium text-muted">Base simplifiée</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-foreground">{taxableBase}</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-medium text-muted">Seuil d&apos;alerte</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-foreground">{threshold}</p>
        </div>
      </div>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        {message}
      </p>
    </Card>
  );
}
