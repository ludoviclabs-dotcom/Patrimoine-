"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type AtlasMetricState = {
  viewedCards: Record<string, number>;
  clickedActions: Record<string, number>;
  selectedBreakdown: Record<string, number>;
  maxScrollDepth: number;
};

const emptyMetrics: AtlasMetricState = {
  viewedCards: {},
  clickedActions: {},
  selectedBreakdown: {},
  maxScrollDepth: 0,
};

const storageKey = "patrimoine.atlas.metrics.v1";

export function AtlasMeasurementPanel() {
  const [metrics, setMetrics] = useState<AtlasMetricState>(() => {
    if (typeof window === "undefined") return emptyMetrics;

    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? { ...emptyMetrics, ...JSON.parse(stored) } : emptyMetrics;
    } catch {
      return emptyMetrics;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(metrics));
  }, [metrics]);

  useEffect(() => {
    const viewedThisSession = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cardId = (entry.target as HTMLElement).dataset.atlasCard;
          if (!entry.isIntersecting || !cardId || viewedThisSession.has(cardId)) continue;

          viewedThisSession.add(cardId);
          setMetrics((current) => ({
            ...current,
            viewedCards: {
              ...current.viewedCards,
              [cardId]: (current.viewedCards[cardId] ?? 0) + 1,
            },
          }));
        }
      },
      { threshold: 0.45 },
    );

    document.querySelectorAll<HTMLElement>("[data-atlas-card]").forEach((node) => {
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const node = target?.closest<HTMLElement>("[data-atlas-event]");
      if (!node) return;

      const eventType = node.dataset.atlasEvent;
      const label = node.dataset.atlasLabel;
      if (!eventType || !label) return;

      setMetrics((current) => {
        if (eventType === "spending-select") {
          return {
            ...current,
            selectedBreakdown: {
              ...current.selectedBreakdown,
              [label]: (current.selectedBreakdown[label] ?? 0) + 1,
            },
          };
        }

        return {
          ...current,
          clickedActions: {
            ...current.clickedActions,
            [label]: (current.clickedActions[label] ?? 0) + 1,
          },
        };
      });
    }

    function onScroll() {
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      setMetrics((current) =>
        depth > current.maxScrollDepth ? { ...current, maxScrollDepth: depth } : current,
      );
    }

    document.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const topViewed = useMemo(() => topEntries(metrics.viewedCards), [metrics.viewedCards]);
  const topClicks = useMemo(() => topEntries(metrics.clickedActions), [metrics.clickedActions]);
  const topSelections = useMemo(() => topEntries(metrics.selectedBreakdown), [metrics.selectedBreakdown]);

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="teal">Mesure locale</Badge>
            <Badge tone="neutral">Sans tracking externe</Badge>
          </div>
          <CardTitle>Ce que l&apos;atlas apprend déjà</CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Cette mesure reste dans le navigateur : cartes vues, actions cliquées et profondeur de
            lecture. Elle sert à savoir si l&apos;atlas aide vraiment ou s&apos;il est seulement décoratif.
          </p>
        </div>
        <Activity className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricBlock label="Profondeur" value={`${metrics.maxScrollDepth}%`} detail="Lecture maximale" />
        <ListBlock title="Cartes vues" empty="Aucune carte vue" entries={topViewed} />
        <ListBlock title="Actions cliquées" empty="Aucune action cliquée" entries={topClicks} />
        <ListBlock title="Postes explorés" empty="Aucun poste sélectionné" entries={topSelections} />
      </div>
    </Card>
  );
}

function topEntries(record: Record<string, number>) {
  return Object.entries(record)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3);
}

function MetricBlock({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}

function ListBlock({
  title,
  empty,
  entries,
}: {
  title: string;
  empty: string;
  entries: Array<[string, number]>;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <MousePointerClick className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {entries.length ? (
        <ul className="space-y-2">
          {entries.map(([label, count]) => (
            <li key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-muted">{label}</span>
              <span className="font-mono font-semibold text-foreground">{count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-6 text-muted">{empty}</p>
      )}
    </div>
  );
}
