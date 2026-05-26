"use client";

import { useMemo, useState } from "react";
import { FilePlus2, History, PlayCircle, RotateCcw, Save, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import type { Asset, Liability, PersistedSimulationRun, ReportVersion, ReviewDecision, SimulationReplay } from "@/lib/types";

type WorkflowEvent = {
  id: string;
  label: string;
  detail: string;
};

export function WorkflowWorkbench() {
  const [title, setTitle] = useState("Mission patrimoniale et fiscale 2026");
  const [assetLabel, setAssetLabel] = useState("Parts SCI complementaires");
  const [assetValue, setAssetValue] = useState(120000);
  const [liabilityLabel, setLiabilityLabel] = useState("Dette travaux locatifs");
  const [liabilityValue, setLiabilityValue] = useState(45000);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [liability, setLiability] = useState<Liability | null>(null);
  const [run, setRun] = useState<PersistedSimulationRun | null>(null);
  const [replay, setReplay] = useState<SimulationReplay | null>(null);
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>("changes_requested");
  const [reportVersion, setReportVersion] = useState<ReportVersion | null>(null);

  const canReplay = Boolean(run);

  function pushEvent(label: string, detail: string) {
    setEvents((current) => [{ id: `${Date.now()}-${label}`, label, detail }, ...current]);
  }

  async function postJson<T>(url: string, body: Record<string, unknown> = {}) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-demo-role": "conseiller",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { data: T };
    return payload.data;
  }

  const simulationLabel = useMemo(() => {
    if (!run) return "Aucune simulation persistee";
    return `Simulation ${run.id} - base IFI ${formatEuro(run.result.taxableBase ?? 0)}`;
  }, [run]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Dossier client reel, mode demo</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Les actions passent par les API V1.2 et retournent un contrat pret Postgres.
              </p>
            </div>
            <FilePlus2 className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-foreground">
              Titre dossier
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={async () => {
                  const result = await postJson<{ clientCase: { title: string; id: string } }>("/api/v1/cases", {
                    title,
                  });
                  pushEvent("Dossier cree", `${result.clientCase.title} (${result.clientCase.id})`);
                }}
              >
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                Creer dossier
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await fetch("/api/v1/cases", {
                    method: "PATCH",
                    headers: { "content-type": "application/json", "x-demo-role": "conseiller" },
                    body: JSON.stringify({ status: "simulation_indicative" }),
                  });
                  pushEvent("Dossier modifie", "Statut passe en simulation indicative.");
                }}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Modifier dossier
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Saisie actifs / passifs</CardTitle>
              <p className="mt-1 text-sm text-muted">Formulaire demo avec data quality declarative.</p>
            </div>
          </CardHeader>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-foreground">
              Actif
              <input
                value={assetLabel}
                onChange={(event) => setAssetLabel(event.target.value)}
                className="h-11 rounded-lg border border-border bg-white px-3"
              />
              <input
                type="number"
                value={assetValue}
                onChange={(event) => setAssetValue(Number(event.target.value))}
                className="h-11 rounded-lg border border-border bg-white px-3"
              />
              <Button
                type="button"
                onClick={async () => {
                  const created = await postJson<Asset>("/api/v1/assets", {
                    label: assetLabel,
                    category: "real-estate",
                    value: assetValue,
                  });
                  setAsset(created);
                  pushEvent("Actif enregistre", `${created.label} - ${formatEuro(created.value)}`);
                }}
              >
                Enregistrer actif
              </Button>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-foreground">
              Passif
              <input
                value={liabilityLabel}
                onChange={(event) => setLiabilityLabel(event.target.value)}
                className="h-11 rounded-lg border border-border bg-white px-3"
              />
              <input
                type="number"
                value={liabilityValue}
                onChange={(event) => setLiabilityValue(Number(event.target.value))}
                className="h-11 rounded-lg border border-border bg-white px-3"
              />
              <Button
                type="button"
                onClick={async () => {
                  const created = await postJson<Liability>("/api/v1/liabilities", {
                    label: liabilityLabel,
                    value: liabilityValue,
                    linkedCategory: "real-estate",
                  });
                  setLiability(created);
                  pushEvent("Passif enregistre", `${created.label} - ${formatEuro(created.value)}`);
                }}
              >
                Enregistrer passif
              </Button>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {asset ? <Badge tone="teal">{asset.label}</Badge> : null}
            {liability ? <Badge tone="warning">{liability.label}</Badge> : null}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Simulation, replay, validation, rapport</CardTitle>
              <p className="mt-1 text-sm text-muted">Workflow complet sans conseil definitif.</p>
            </div>
            <PlayCircle className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={async () => {
                const created = await postJson<PersistedSimulationRun>("/api/v1/simulations");
                setRun(created);
                pushEvent("Simulation persistee", `Run replayable : ${created.id}`);
              }}
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Lancer simulation persistee
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canReplay}
              onClick={async () => {
                const created = await postJson<SimulationReplay>("/api/v1/simulation-replays");
                setReplay(created);
                pushEvent("Simulation replay", `Statut : ${created.status}`);
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Rejouer simulation
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await postJson("/api/v1/review-decisions", {
                  decision: reviewDecision,
                  summary: `Decision demo : ${reviewDecision}`,
                });
                pushEvent("Validation expert", reviewDecision);
              }}
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              Enregistrer revue
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const created = await postJson<ReportVersion>("/api/v1/report-versions");
                setReportVersion(created);
                pushEvent("Rapport versionne", `${created.version} - ${created.status}`);
              }}
            >
              Generer rapport versionne
            </Button>
          </div>
          <label className="mt-4 grid max-w-sm gap-2 text-sm font-semibold text-foreground">
            Decision expert
            <select
              value={reviewDecision}
              onChange={(event) => setReviewDecision(event.target.value as ReviewDecision)}
              className="h-11 rounded-lg border border-border bg-white px-3"
            >
              <option value="approved">Approuver</option>
              <option value="changes_requested">Demander correction</option>
              <option value="rejected">Refuser</option>
            </select>
          </label>
          <div className="mt-4 grid gap-3 text-sm text-muted">
            <p>{simulationLabel}</p>
            {replay ? <p>Replay : {replay.status}</p> : null}
            {reportVersion ? <p>Rapport : {reportVersion.version}</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Journal workflow</CardTitle>
            <p className="mt-1 text-sm text-muted">Evenements metier visibles en demo.</p>
          </div>
          <History className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm leading-6 text-muted">Aucune action lancee dans cette session.</p>
          ) : null}
          {events.map((event) => (
            <div key={event.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold text-foreground">{event.label}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{event.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
