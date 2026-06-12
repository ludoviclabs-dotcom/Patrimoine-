"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Map } from "lucide-react";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/components/v3-5/tier-badge";
import { getSimulationByParam } from "@/lib/cabinet-refonte/v2-6";
import {
  getMindmapBranch,
  mindmapBranches,
  mindmapCenter,
} from "@/lib/simulations/mindmap";
import { cn } from "@/lib/utils";

/**
 * Carte mentale patrimoniale — SVG pur, conventions de components/viz/* :
 * viewBox, couleurs en CSS vars (dark mode + impression sûrs), <title> en
 * tooltip. Les nœuds visuels sont du SVG ; les cibles cliquables sont des
 * boutons HTML positionnés en absolu par-dessus (focus clavier propre).
 * Cliquer une branche révèle ses scénarios suggérés vers le laboratoire.
 */

const VIEW_W = 720;
const VIEW_H = 480;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;
const RADIUS = 165;
const NODE_W = 168;
const NODE_H = 52;

function branchPosition(angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + RADIUS * Math.cos(angle),
    y: CENTER_Y + RADIUS * Math.sin(angle),
  };
}

export function PatrimonialMindmap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = getMindmapBranch(selectedId);

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Carte patrimoniale</CardEyebrow>
          <CardTitle className="mt-1">Explorer le dossier par dimension</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Chaque dimension du foyer ouvre ses simulations pertinentes — cliquez une branche.
          </p>
        </div>
        <Map className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>

      <div className="relative mx-auto w-full max-w-3xl" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Carte mentale patrimoniale du foyer"
          className="h-full w-full"
        >
          {mindmapBranches.map((branch) => {
            const { x, y } = branchPosition(branch.angleDeg);
            const midX = (CENTER_X + x) / 2;
            const midY = (CENTER_Y + y) / 2 - 14;
            const active = branch.id === selectedId;
            return (
              <g key={branch.id}>
                <path
                  d={`M ${CENTER_X} ${CENTER_Y} Q ${midX} ${midY} ${x} ${y}`}
                  fill="none"
                  stroke={active ? "var(--gold)" : "var(--border)"}
                  strokeWidth={active ? 2 : 1.5}
                />
                <rect
                  x={x - NODE_W / 2}
                  y={y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill={active ? "var(--gold-soft)" : "var(--surface-soft)"}
                  stroke={active ? "var(--gold)" : "var(--border)"}
                  strokeWidth={1.5}
                >
                  <title>{branch.summary}</title>
                </rect>
                <text
                  x={x}
                  y={y - 3}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={600}
                  fill="var(--foreground)"
                >
                  {branch.label}
                </text>
                <text x={x} y={y + 15} textAnchor="middle" fontSize={10.5} fill="var(--muted)">
                  {branch.scenarios.length} simulation{branch.scenarios.length > 1 ? "s" : ""}
                </text>
              </g>
            );
          })}

          <rect
            x={CENTER_X - 96}
            y={CENTER_Y - 34}
            width={192}
            height={68}
            rx={16}
            fill="var(--surface-strong)"
          />
          <text
            x={CENTER_X}
            y={CENTER_Y - 4}
            textAnchor="middle"
            fontSize={16}
            fontWeight={700}
            fill="#f4eee2"
          >
            {mindmapCenter.label}
          </text>
          <text x={CENTER_X} y={CENTER_Y + 16} textAnchor="middle" fontSize={10.5} fill="#cdbf9f">
            {mindmapCenter.caption}
          </text>
        </svg>

        {/* Cibles cliquables accessibles, superposées aux nœuds SVG. */}
        {mindmapBranches.map((branch) => {
          const { x, y } = branchPosition(branch.angleDeg);
          return (
            <button
              key={branch.id}
              type="button"
              aria-pressed={branch.id === selectedId}
              aria-label={`${branch.label} — ${branch.summary}`}
              onClick={() => setSelectedId((current) => (current === branch.id ? null : branch.id))}
              className="absolute rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              style={{
                left: `${((x - NODE_W / 2) / VIEW_W) * 100}%`,
                top: `${((y - NODE_H / 2) / VIEW_H) * 100}%`,
                width: `${(NODE_W / VIEW_W) * 100}%`,
                height: `${(NODE_H / VIEW_H) * 100}%`,
              }}
            />
          );
        })}
      </div>

      {selected ? (
        <div className="mt-4 rounded-[var(--r-md)] border border-[var(--gold)] bg-[var(--gold-soft)] p-4">
          <p className="text-sm font-semibold text-foreground">{selected.label}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{selected.summary}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {selected.scenarios.map((scenario) => {
              const item = getSimulationByParam(scenario);
              if (!item) return null;
              return (
                <Link
                  key={scenario}
                  href={`/simulations/lab?scenario=${scenario}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-border bg-white p-3",
                    "transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[var(--shadow-sm)]",
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="flex items-center gap-2">
                    <TierBadge status={item.status} />
                    <ArrowRight className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-muted">
          Sélectionnez une dimension pour voir les simulations suggérées.
        </p>
      )}
    </Card>
  );
}
