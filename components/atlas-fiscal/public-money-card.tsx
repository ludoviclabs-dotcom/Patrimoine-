"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Landmark, PieChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtlasCertainty, PublicSpendingBreakdown } from "@/lib/fiscal-atlas/atlas";
import { cn } from "@/lib/utils";

const certaintyTone: Record<AtlasCertainty, "success" | "teal" | "warning" | "neutral"> = {
  "fait établi": "success",
  analyse: "teal",
  hypothèse: "warning",
  débat: "neutral",
};

const categoryClasses: Record<
  PublicSpendingBreakdown["category"],
  {
    bar: string;
    border: string;
    surface: string;
    text: string;
    label: string;
  }
> = {
  social: {
    bar: "bg-emerald-600",
    border: "border-emerald-200",
    surface: "bg-emerald-50",
    text: "text-emerald-950",
    label: "Social",
  },
  "public-service": {
    bar: "bg-sky-600",
    border: "border-sky-200",
    surface: "bg-sky-50",
    text: "text-sky-950",
    label: "Service public",
  },
  economy: {
    bar: "bg-amber-500",
    border: "border-amber-200",
    surface: "bg-amber-50",
    text: "text-amber-950",
    label: "Économie",
  },
  sovereignty: {
    bar: "bg-slate-700",
    border: "border-slate-200",
    surface: "bg-slate-50",
    text: "text-slate-950",
    label: "Souveraineté",
  },
  future: {
    bar: "bg-violet-600",
    border: "border-violet-200",
    surface: "bg-violet-50",
    text: "text-violet-950",
    label: "Avenir",
  },
  debt: {
    bar: "bg-rose-600",
    border: "border-rose-200",
    surface: "bg-rose-50",
    text: "text-rose-950",
    label: "Dette",
  },
};

export function PublicMoneyCard({ breakdown }: { breakdown: PublicSpendingBreakdown[] }) {
  const [selectedId, setSelectedId] = useState(breakdown[0]?.id ?? "");
  const total = useMemo(
    () => breakdown.reduce((sum, item) => sum + item.amountPer1000, 0),
    [breakdown],
  );
  const selected = breakdown.find((item) => item.id === selectedId) ?? breakdown[0] ?? null;
  const selectedClasses = selected ? categoryClasses[selected.category] : categoryClasses.social;
  const selectedShare = selected ? Math.round((selected.amountPer1000 / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="success">Fait établi</Badge>
            <Badge tone="neutral">Vision complète</Badge>
          </div>
          <CardTitle className="text-xl">Où vont 1 000 € prélevés ?</CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Répartition pédagogique des impôts et cotisations sur le périmètre complet :
            État, Sécurité sociale, collectivités et autres administrations publiques.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--accent)]">
          <PieChart className="h-5 w-5" aria-hidden="true" />
        </span>
      </CardHeader>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0">
          <div className="rounded-lg border border-border bg-[#fbfcfb] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted">Total ventilé</p>
                <p className="mt-1 font-mono text-3xl font-bold text-foreground">{total} €</p>
              </div>
              <p className="max-w-sm text-sm leading-6 text-muted">
                L&apos;écart à 1 000 € vient des arrondis de la ventilation publique.
              </p>
            </div>

            <div
              className="mt-5 flex h-8 w-full overflow-hidden rounded-lg border border-border bg-white"
              aria-label={`Ventilation totale ${total} euros pour 1000 euros prélevés`}
            >
              {breakdown.map((item) => {
                const classes = categoryClasses[item.category];
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-atlas-event="spending-select"
                    data-atlas-label={item.id}
                    className={cn(
                      "h-full min-w-[4px] transition hover:brightness-95 focus:z-10 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
                      classes.bar,
                    )}
                    style={{ width: `${(item.amountPer1000 / total) * 100}%` }}
                    aria-label={`${item.label}: ${item.amountPer1000} euros`}
                    aria-pressed={selected?.id === item.id}
                    onClick={() => setSelectedId(item.id)}
                  />
                );
              })}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {breakdown.map((item) => {
                const classes = categoryClasses[item.category];
                const active = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-atlas-event="spending-select"
                    data-atlas-label={item.id}
                    className={cn(
                      "flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
                      active
                        ? `${classes.border} ${classes.surface} ${classes.text}`
                        : "border-border bg-white text-foreground hover:bg-[var(--surface-soft)]",
                    )}
                    aria-pressed={active}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="min-w-0 font-semibold leading-5">{item.label}</span>
                    <span className="shrink-0 font-mono font-bold">{item.amountPer1000} €</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {selected ? (
          <aside
            className={cn(
              "rounded-lg border p-5",
              selectedClasses.border,
              selectedClasses.surface,
              selectedClasses.text,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] opacity-70">
                  {selectedClasses.label}
                </p>
                <h3 className="mt-2 text-2xl font-bold">{selected.label}</h3>
              </div>
              <Landmark className="h-5 w-5 shrink-0 opacity-70" aria-hidden="true" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Montant" value={`${selected.amountPer1000} €`} />
              <Metric label="Part" value={`${selectedShare} %`} />
            </div>
            <p className="mt-5 text-sm leading-6 opacity-85">{selected.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone={certaintyTone[selected.certainty]}>{selected.certainty}</Badge>
              <Badge tone="neutral">{selected.sourceIds.length} source</Badge>
            </div>
            <Link
              href={selected.actionHref}
              data-atlas-event="spending-action"
              data-atlas-label={selected.id}
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {selected.actionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/60 bg-white/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold">{value}</p>
    </div>
  );
}
