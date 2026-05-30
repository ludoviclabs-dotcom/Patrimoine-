import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDot, GitBranch, Repeat2, Scale, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtlasCertainty, FiscalAtlasMap, FiscalAtlasNode } from "@/lib/fiscal-atlas/atlas";
import { cn } from "@/lib/utils";

const certaintyTone: Record<AtlasCertainty, "success" | "teal" | "warning" | "neutral"> = {
  "fait établi": "success",
  analyse: "teal",
  hypothèse: "warning",
  débat: "neutral",
};

const nodeTypeClasses: Record<FiscalAtlasNode["type"], string> = {
  main: "border-[var(--surface-strong)] bg-[var(--surface-strong)] text-white",
  risk: "border-red-200 bg-red-50 text-red-900",
  friction: "border-amber-200 bg-amber-50 text-amber-950",
  comparison: "border-sky-200 bg-sky-50 text-sky-950",
  reform: "border-emerald-200 bg-emerald-50 text-emerald-950",
  flow: "border-teal-200 bg-teal-50 text-teal-950",
};

const iconByLayout = {
  hub: CircleDot,
  flow: GitBranch,
  comparison: Scale,
  reform: Sparkles,
  loop: Repeat2,
};

export function AtlasMapCard({ map }: { map: FiscalAtlasMap }) {
  const Icon = iconByLayout[map.layout];
  const primary = map.nodes[0];
  const rest = map.nodes.slice(1);

  return (
    <Card className="h-full" data-atlas-card={map.id}>
      <CardHeader className="items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{map.category}</Badge>
            <Badge tone={certaintyTone[map.certainty]}>{map.certainty}</Badge>
          </div>
          <CardTitle className="text-lg">{map.title}</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted">{map.summary}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--accent)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </CardHeader>

      {map.layout === "flow" ? (
        <FlowDiagram nodes={map.nodes} />
      ) : map.layout === "loop" ? (
        <LoopDiagram nodes={map.nodes} />
      ) : map.layout === "comparison" ? (
        <ComparisonDiagram nodes={map.nodes} />
      ) : (
        <HubDiagram primary={primary} nodes={rest} />
      )}

      <div className="mt-5 rounded-lg border border-border bg-[var(--surface-soft)] p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <p className="text-sm leading-6 text-muted">{map.takeaway}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {map.sourceIds.length} source{map.sourceIds.length > 1 ? "s" : ""}
        </p>
        <Link
          href={map.actionHref}
          data-atlas-event="atlas-action"
          data-atlas-label={map.id}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white transition hover:bg-[#223029] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {map.actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}

function HubDiagram({ primary, nodes }: { primary?: FiscalAtlasNode; nodes: FiscalAtlasNode[] }) {
  return (
    <div className="rounded-lg border border-border bg-[#fbfcfb] p-4">
      {primary ? <NodeBlock node={primary} emphasis /> : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {nodes.map((node) => (
          <div key={node.id} className="relative">
            <div className="absolute -top-3 left-6 h-3 border-l border-border" aria-hidden="true" />
            <NodeBlock node={node} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LoopDiagram({ nodes }: { nodes: FiscalAtlasNode[] }) {
  return (
    <div className="rounded-lg border border-border bg-[#fbfcfb] p-4">
      <ol className="grid gap-3 sm:grid-cols-2">
        {nodes.map((node, index) => (
          <li key={node.id} className="relative min-w-0">
            {index > 0 ? (
              <div className="absolute -top-3 left-6 h-3 border-l border-border" aria-hidden="true" />
            ) : null}
            <NodeBlock node={node} />
          </li>
        ))}
      </ol>
      <div className="mt-3 rounded-lg border border-dashed border-border bg-white px-4 py-3 text-sm leading-6 text-muted">
        La boucle revient vers les contribuables par les droits sociaux, l&apos;infrastructure, la
        stabilité collective et le cadre dans lequel l&apos;activité économique se déploie.
      </div>
    </div>
  );
}

function FlowDiagram({ nodes }: { nodes: FiscalAtlasNode[] }) {
  return (
    <div className="rounded-lg border border-border bg-[#fbfcfb] p-4">
      <ol className="grid gap-3">
        {nodes.map((node, index) => (
          <li key={node.id} className="relative">
            {index > 0 ? (
              <div className="absolute -top-3 left-5 h-3 border-l border-border" aria-hidden="true" />
            ) : null}
            <NodeBlock node={node} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ComparisonDiagram({ nodes }: { nodes: FiscalAtlasNode[] }) {
  const [first, second, result] = nodes;

  return (
    <div className="rounded-lg border border-border bg-[#fbfcfb] p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {first ? <NodeBlock node={first} /> : null}
        {second ? <NodeBlock node={second} /> : null}
      </div>
      {result ? (
        <div className="mt-3 border-t border-border pt-3">
          <NodeBlock node={result} emphasis />
        </div>
      ) : null}
    </div>
  );
}

function NodeBlock({ node, emphasis = false }: { node: FiscalAtlasNode; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        "min-h-28 rounded-lg border p-4 transition",
        nodeTypeClasses[node.type],
        emphasis ? "shadow-sm" : "shadow-none",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-bold leading-5">{node.label}</p>
        <Badge tone={certaintyTone[node.certainty]} className="bg-white/90">
          {node.certainty}
        </Badge>
      </div>
      <p className={cn("mt-2 text-sm leading-6", node.type === "main" ? "text-white/80" : "opacity-80")}>
        {node.detail}
      </p>
    </div>
  );
}
