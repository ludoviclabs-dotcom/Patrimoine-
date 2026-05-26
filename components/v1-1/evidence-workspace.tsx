"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { EvidenceSource, LegalScope } from "@/lib/types";

const moduleOptions: Array<"all" | LegalScope> = [
  "all",
  "IFI",
  "transmission",
  "facturation-electronique",
  "rgpd",
  "donation",
  "plus-value",
  "sci",
  "ai-act",
];

export function EvidenceWorkspace({ sources }: { sources: EvidenceSource[] }) {
  const [module, setModule] = useState<(typeof moduleOptions)[number]>("all");
  const [authority, setAuthority] = useState("all");
  const [status, setStatus] = useState("all");

  const authorities = useMemo(
    () => ["all", ...Array.from(new Set(sources.map((source) => source.authority)))],
    [sources],
  );

  const filtered = sources.filter((source) => {
    const moduleMatch = module === "all" || source.legalScope === module;
    const authorityMatch = authority === "all" || source.authority === authority;
    const statusMatch = status === "all" || source.status === status;

    return moduleMatch && authorityMatch && statusMatch;
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            Filtres Evidence Center
          </div>
          <FilterSelect label="Module" value={module} onChange={setModule} options={moduleOptions} />
          <FilterSelect label="Autorite" value={authority} onChange={setAuthority} options={authorities} />
          <FilterSelect label="Statut" value={status} onChange={setStatus} options={["all", "active", "to-review", "archived"]} />
        </div>
      </Card>

      <div className="grid gap-4">
        {filtered.map((source) => (
          <Card key={source.id} className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge tone="teal">{source.authority}</Badge>
                  <Badge>{source.legalScope}</Badge>
                  <Badge tone={source.status === "active" ? "success" : "warning"}>
                    {source.status === "active" ? "Actif" : "A revoir"}
                  </Badge>
                  <Badge tone={source.snapshotStatus === "current" ? "success" : "warning"}>
                    {source.snapshotStatus}
                  </Badge>
                </div>
                <h2 className="text-base font-semibold text-foreground">{source.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{source.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {source.linkedRuleIds.map((ruleId) => (
                    <Badge key={ruleId}>{ruleId}</Badge>
                  ))}
                </div>
                <p className="mt-3 font-mono text-xs text-muted">
                  Version {source.sourceVersion} - verifiee {source.checkedAt} - hash {source.contentHash}
                </p>
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Ouvrir
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: T[];
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted lg:min-w-44">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 rounded-lg border border-border bg-white px-3 text-sm font-semibold normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "Tous" : option}
          </option>
        ))}
      </select>
    </label>
  );
}
