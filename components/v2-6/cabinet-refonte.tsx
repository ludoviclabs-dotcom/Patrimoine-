"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  FolderOpen,
  LockKeyhole,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceLedger } from "@/components/ui/evidence-ledger";
import { JourneyStepper } from "@/components/ui/journey-stepper";
import { SlideOver } from "@/components/ui/slide-over";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Donut } from "@/components/viz/donut";
import { ProgressRing } from "@/components/viz/progress-ring";
import { formatEuro } from "@/lib/format";
import {
  cabinetDecisionCards,
  cabinetTaskQueue,
  dossierWorkspaceTabs,
  reviewQueueItems,
  simulationCatalog,
  statusDictionary,
  type CabinetStatus,
  type CabinetTask,
  type ReportConclusionCard,
  type ReviewQueueItem,
  type RiskTone,
  type SimulationCatalogItem,
} from "@/lib/cabinet-refonte/v2-6";
import { demoHousehold } from "@/lib/demo-data/household";
import { getGrossWealth, getNetWealth, getTotalDebt } from "@/lib/demo-data/metrics";
import { evidenceSources } from "@/lib/evidence/sources";
import type { EvidenceSource, TaxRun } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusTone = Object.fromEntries(statusDictionary.map((status) => [status.id, status.tone])) as Record<
  CabinetStatus,
  "neutral" | "success" | "warning" | "danger" | "teal"
>;

const riskCopy: Record<RiskTone, { label: string; className: string }> = {
  low: { label: "Faible", className: "bg-[var(--accent-soft)] text-[var(--accent)]" },
  medium: { label: "Moyen", className: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  high: { label: "Élevé", className: "bg-[var(--danger-soft)] text-[var(--danger)]" },
  critical: { label: "Critique", className: "bg-[var(--danger-soft)] text-[var(--danger)]" },
};

const sourceById = new Map(evidenceSources.map((source) => [source.id, source]));

export function StatusBadge({ status }: { status: CabinetStatus }) {
  return (
    <Badge tone={statusTone[status] ?? "neutral"} dot>
      {status}
    </Badge>
  );
}

function RiskBadge({ risk }: { risk: RiskTone }) {
  const item = riskCopy[risk];
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border border-transparent px-3 py-1 text-xs font-medium",
        item.className,
      )}
    >
      {item.label}
    </span>
  );
}

/* ============================== /cabinet ============================== */

export function CabinetHomeV26() {
  const journeySteps = cabinetTaskQueue.map((task) => ({
    label: task.label,
    caption: task.owner,
    href: task.href,
  }));

  return (
    <div className="space-y-10">
      <Stagger className="grid gap-4 lg:grid-cols-3">
        {cabinetDecisionCards.map((card) => (
          <StaggerItem key={card.id} className="h-full">
            <Card interactive accent className="flex h-full flex-col">
              <CardHeader>
                <div>
                  <CardEyebrow>{card.category}</CardEyebrow>
                  <CardTitle className="mt-1">{card.label}</CardTitle>
                </div>
                <StatusBadge status={card.status} />
              </CardHeader>
              <p className="font-serif text-3xl font-semibold tracking-[-0.02em] text-foreground">
                {card.metric}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">{card.userFacingExplanation}</p>
              <p className="mt-3 text-sm font-medium text-foreground">{card.helper}</p>
              <Link
                href={card.href}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:gap-3"
              >
                Ouvrir
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TaskList tasks={cabinetTaskQueue} />
        <ReviewGate items={reviewQueueItems.slice(0, 3)} />
      </section>

      <Reveal>
        <Card elevated className="overflow-hidden">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <CardEyebrow>Parcours</CardEyebrow>
              <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
                Parcours testable cabinet
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Ouvrir dossier, simuler, vérifier preuves, passer en revue humaine, produire le
                rapport. Les contenus atlas et workflow restent accessibles comme ressources
                contextuelles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/atlas-fiscal">Atlas fiscal</LinkButton>
              <LinkButton href="/workflow">Workflow démo</LinkButton>
            </div>
          </div>
          <div className="mt-8">
            <JourneyStepper steps={journeySteps} current={1} />
          </div>
        </Card>
      </Reveal>
    </div>
  );
}

export function TaskList({ tasks }: { tasks: CabinetTask[] }) {
  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Checklist cabinet</CardEyebrow>
          <CardTitle className="mt-1">Actions prioritaires</CardTitle>
        </div>
        <ClipboardList className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>
      <Stagger className="space-y-0">
        {tasks.map((task, index) => (
          <StaggerItem key={task.id}>
            <article className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--gold-soft)] text-sm font-semibold text-[var(--gold-strong)]">
                  {task.order}
                </span>
                {index < tasks.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                ) : null}
              </div>
              <div className="flex-1 pb-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
                      Étape {task.order} · {task.owner}
                    </p>
                    <h3 className="mt-1 font-serif text-base font-semibold text-foreground">
                      {task.label}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RiskBadge risk={task.risk} />
                    <StatusBadge status={task.status} />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{task.userFacingExplanation}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{task.nextAction}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {task.dataUsed.map((data) => (
                    <Badge key={data}>{data}</Badge>
                  ))}
                </div>
                <Link
                  href={task.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:gap-3"
                >
                  Tester cette étape
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </Card>
  );
}

/* ============================== /dossiers ============================== */

export function DossierWorkspaceV26() {
  const brut = getGrossWealth(demoHousehold);
  const passifs = getTotalDebt(demoHousehold);
  const net = getNetWealth(demoHousehold);
  const netInMillions = `${(net / 1_000_000).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} M€`;

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Reveal>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardEyebrow>Portefeuille cabinet</CardEyebrow>
                <CardTitle className="mt-1">Liste de dossiers démo</CardTitle>
              </div>
              <FolderOpen className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
            </CardHeader>
            <div className="space-y-3">
              {["Claire et Marc", "Famille dirigeante exemple", "Succession Durand"].map((name, index) => (
                <div
                  key={name}
                  className={cn(
                    "rounded-[var(--r-md)] border p-4 transition",
                    index === 0
                      ? "border-[var(--gold)] bg-[var(--gold-soft)]"
                      : "border-border bg-white hover:border-[var(--line-strong)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-serif text-sm font-semibold text-foreground">{name}</p>
                    <StatusBadge status={index === 0 ? "Simulation indicative" : "Brouillon"} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {index === 0
                      ? "Dossier actif pour tester la V2.6."
                      : "Dossier témoin pour montrer la logique multi-dossiers."}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card elevated className="h-full">
            <CardHeader>
              <div>
                <CardEyebrow>Vue d&apos;ensemble</CardEyebrow>
                <CardTitle className="mt-1">Dossier actif : Claire et Marc</CardTitle>
              </div>
              <StatusBadge status="Revue requise" />
            </CardHeader>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <Donut
                segments={[
                  { label: "Patrimoine net", value: net, color: "var(--accent)" },
                  { label: "Passifs", value: passifs, color: "var(--gold)" },
                ]}
                centerValue={netInMillions}
                centerLabel="Net"
              />
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <Metric label="Patrimoine brut" value={<CountUp value={brut} format={formatEuro} />} />
                <Metric label="Passifs" value={<CountUp value={passifs} format={formatEuro} />} />
                <div className="flex items-center gap-3 rounded-[var(--r-md)] border border-border bg-[var(--surface-soft)] p-3">
                  <ProgressRing value={11 / 18} valueLabel="11/18" label="Docs" size={68} thickness={8} />
                  <div>
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      Documents reçus
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">À documenter</p>
                  </div>
                </div>
                <Metric label="Alertes" value="4 revues" accent />
              </div>
            </div>
          </Card>
        </Reveal>
      </section>

      <Reveal>
        <Card elevated>
          <CardHeader>
            <div>
              <CardEyebrow>Espace dossier</CardEyebrow>
              <CardTitle className="mt-1">Onglets de travail</CardTitle>
            </div>
          </CardHeader>
          <Tabs defaultValue={dossierWorkspaceTabs[0]?.id} className="w-full">
            <TabsList className="max-w-full overflow-x-auto">
              {dossierWorkspaceTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {dossierWorkspaceTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={tab.status} />
                      <span className="text-sm text-muted">{tab.summary}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">{tab.userFacingExplanation}</p>
                    <Link
                      href={tab.href}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:gap-3"
                    >
                      Ouvrir la vue
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                  <div className="grid gap-3">
                    <SmallList title="Éléments attendus" items={tab.expectedItems} icon="ok" />
                    <SmallList title="Blocages" items={tab.blockers} icon="risk" />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </Reveal>
    </div>
  );
}

export function LifeEventRail() {
  const events = [
    ["Préparer la retraite", "PER, PEA, horizon, revenu futur"],
    ["Transmettre", "donation, succession, notaire"],
    ["Vendre un bien", "plus-value, documents, liquidité"],
    ["Protéger le conjoint", "régime, assurance-vie, clauses"],
    ["Réduire risque IFI", "actifs immobiliers, dettes, SCI"],
    ["Mettre de l'ordre", "enveloppes, bénéficiaires, preuves"],
  ];

  return (
    <Reveal>
      <Card elevated>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Scale className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <CardEyebrow>Entrée par objectif</CardEyebrow>
            <h2 className="font-serif text-xl font-semibold text-foreground">Événements de vie</h2>
          </div>
        </div>
        <div className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2">
          {events.map(([label, detail]) => (
            <div
              key={label}
              className="group min-w-[15rem] flex-1 snap-start rounded-[var(--r-md)] border border-border bg-[var(--surface-soft)] p-4 transition hover:-translate-y-1 hover:border-[var(--gold)] hover:shadow-[var(--shadow)]"
            >
              <p className="font-serif text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] opacity-0 transition group-hover:opacity-100">
                Explorer <ArrowRight className="h-3 w-3" aria-hidden />
              </span>
            </div>
          ))}
        </div>
      </Card>
    </Reveal>
  );
}

/* ============================== /simulations ============================== */

export function SimulationCatalog({ activeScenario }: { activeScenario?: string | null }) {
  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Choisir un scénario</CardEyebrow>
          <CardTitle className="mt-1">Catalogue de simulations</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Choisir un scénario charge le moteur avec son contexte, ses sources et sa revue attendue.
          </p>
        </div>
        <BookOpenCheck className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
      </CardHeader>
      <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {simulationCatalog.map((item) => {
          const active = item.scenarioParam === activeScenario || item.aliases.includes(activeScenario ?? "");
          return (
            <StaggerItem key={item.id} className="h-full">
              <SimulationCatalogCard item={item} active={active} />
            </StaggerItem>
          );
        })}
      </Stagger>
    </Card>
  );
}

function SimulationCatalogCard({ item, active }: { item: SimulationCatalogItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-full flex-col rounded-[var(--r-md)] border p-4 transition hover:-translate-y-1 hover:shadow-[var(--shadow)]",
        active
          ? "border-[var(--gold)] bg-[var(--gold-soft)]"
          : "border-border bg-white hover:border-[var(--line-strong)]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-serif text-sm font-semibold text-foreground">{item.label}</p>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{item.userFacingExplanation}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gold-strong)]">
        {item.activeLabel}
      </p>
    </Link>
  );
}

export function SimulationAuditSummary({ item }: { item: SimulationCatalogItem | null }) {
  if (!item) return null;

  return (
    <Reveal>
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Traçabilité</CardEyebrow>
            <CardTitle className="mt-1">Preuves de la simulation</CardTitle>
          </div>
          <FileSearch className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
        </CardHeader>
        <EvidenceLedger
          items={[
            { label: "Donnée utilisée", value: item.dataUsed },
            { label: "Hypothèse", value: item.hypothesis },
            { label: "Règle", value: item.rule },
            { label: "Limite", value: item.limit },
            { label: "Revue requise", value: item.reviewGate, emphasis: true },
          ]}
        />
      </Card>
    </Reveal>
  );
}

export function CalculationBreakdown({ run }: { run: TaxRun }) {
  const firstStep = run.steps[0];
  const source = firstStep ? sourceById.get(firstStep.evidenceSourceId) : null;

  return (
    <Reveal>
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Résultat auditable</CardEyebrow>
            <CardTitle className="mt-1">Ventilation auditable du résultat</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Chaque résultat montre donnée, hypothèse, règle, source, limite et revue.
            </p>
          </div>
          <StatusBadge status="Revue requise" />
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Metric
            label="Résultat"
            accent
            value={
              typeof run.resultAmount === "number" ? (
                <CountUp value={run.resultAmount} format={formatEuro} />
              ) : (
                run.resultLabel
              )
            }
          />
          <Metric label="Source principale" value={source?.title ?? run.evidenceSourceIds[0] ?? "Source à vérifier"} />
          <Metric label="Règle" value={firstStep?.ruleVersionId ?? run.ruleSnapshotId ?? "Règle à vérifier"} />
        </div>
        <div className="mt-4 space-y-3">
          {run.steps.slice(0, 4).map((step) => (
            <div key={step.id} className="rounded-[var(--r-md)] border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <Badge tone={step.confidenceStatus === "needs_review" ? "warning" : "teal"} dot>
                  {step.confidenceStatus === "needs_review" ? "Revue requise" : "Simulation indicative"}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{step.intermediateResult}</p>
              <p className="mt-2 text-sm font-medium text-foreground">{step.nextAction}</p>
            </div>
          ))}
        </div>
      </Card>
    </Reveal>
  );
}

/* ============================== /review ============================== */

export function ReviewGate({ items }: { items: ReviewQueueItem[] }) {
  return (
    <Card accent className="border-[color-mix(in_srgb,var(--danger)_22%,var(--border))]">
      <CardHeader>
        <div>
          <CardEyebrow>Garde-fou</CardEyebrow>
          <CardTitle className="mt-1">Revue humaine obligatoire</CardTitle>
          <p className="mt-1 text-sm text-muted">Le produit indique pourquoi il refuse de conclure seul.</p>
        </div>
        <LockKeyhole className="h-5 w-5 text-[var(--danger)]" aria-hidden />
      </CardHeader>
      <div className="space-y-3">
        {items.map((item) => (
          <ReviewQueueCard key={item.id} item={item} compact />
        ))}
      </div>
    </Card>
  );
}

export function ReviewQueue() {
  return (
    <Stagger className="grid gap-4 lg:grid-cols-2">
      {reviewQueueItems.map((item) => (
        <StaggerItem key={item.id} className="h-full">
          <ReviewQueueCard item={item} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

const severityRail: Record<RiskTone, string> = {
  low: "before:bg-[var(--accent)]",
  medium: "before:bg-[var(--warning)]",
  high: "before:bg-[var(--danger)]",
  critical: "before:bg-[var(--danger)]",
};

function ReviewQueueCard({ item, compact = false }: { item: ReviewQueueItem; compact?: boolean }) {
  return (
    <article
      id={item.id}
      className={cn(
        "relative h-full scroll-mt-24 rounded-[var(--r-md)] border border-border bg-white p-4 pl-5",
        "before:absolute before:inset-y-4 before:left-0 before:w-[3px] before:rounded-full",
        severityRail[item.severity],
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
            {item.professional}
          </p>
          <h3 className="mt-1 font-serif text-base font-semibold text-foreground">{item.label}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskBadge risk={item.severity} />
          <StatusBadge status={item.status} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{item.userFacingExplanation}</p>
      {!compact ? (
        <EvidenceLedger
          className="mt-4"
          items={[
            { label: "Déclencheur", value: item.trigger },
            { label: "Motif bloquant", value: item.blockingReason },
            { label: "Action suivante", value: item.nextAction, emphasis: true },
          ]}
        />
      ) : (
        <p className="mt-3 text-sm font-medium text-foreground">{item.nextAction}</p>
      )}
      <Link
        href={item.href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:gap-3"
      >
        Ouvrir le point
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  );
}

export function RiskPanel() {
  const items = [
    "Conseil personnalisé réservé au professionnel compétent.",
    "Données sensibles et profilage : pas de décision automatisée.",
    "LCB-FT, bénéficiaire effectif et origine des fonds doivent être documentés.",
    "International, holding, trust et démembrement sophistiqué sortent du mode automatique.",
  ];

  return (
    <Reveal>
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Limites assumées</CardEyebrow>
            <CardTitle className="mt-1">Pourquoi le produit ne conclut pas seul</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Conseil, RGPD, LCB-FT et cas complexes restent sous contrôle humain.
            </p>
          </div>
          <ShieldAlert className="h-5 w-5 text-[var(--danger)]" aria-hidden />
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item}
              className="flex gap-3 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--warning)_28%,var(--border))] bg-[var(--warning-soft)] p-4"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" aria-hidden />
              <p className="text-sm leading-6 text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    </Reveal>
  );
}

/* ============================== /evidence ============================== */

export function EvidenceAuditTable() {
  const rows = evidenceSources.slice(0, 12);

  return (
    <Reveal>
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Journal de preuves</CardEyebrow>
            <CardTitle className="mt-1">Table d&apos;audit des preuves</CardTitle>
            <p className="mt-1 text-sm text-muted">Source, date, périmètre, règle liée et niveau de preuve.</p>
          </div>
          <FileSearch className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
        </CardHeader>
        <div className="max-h-[26rem] overflow-auto rounded-[var(--r-md)] border border-border">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-2)]">
              <tr className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Périmètre</th>
                <th className="px-4 py-3 font-semibold">Règles</th>
                <th className="px-4 py-3 font-semibold">Niveau</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((source, index) => (
                <tr
                  key={source.id}
                  className={cn(
                    "align-top transition hover:bg-[var(--accent-soft)]",
                    index % 2 === 1 && "bg-[var(--surface-soft)]",
                  )}
                >
                  <td className="px-4 py-3">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-foreground hover:text-[var(--accent)]"
                    >
                      {source.title}
                    </a>
                    <p className="mt-1 font-mono text-xs text-muted">{source.sourceVersion}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{source.checkedAt}</td>
                  <td className="px-4 py-3">{source.legalScope}</td>
                  <td className="px-4 py-3">{source.linkedRuleIds.slice(0, 2).join(", ")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={source.status === "active" ? "success" : "warning"} dot>
                      {source.status === "active" ? "Source active" : "À revoir"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Reveal>
  );
}

export function EvidenceDrawer({ sourceIds }: { sourceIds: string[] }) {
  const sources = sourceIds
    .map((id) => sourceById.get(id))
    .filter((source): source is EvidenceSource => Boolean(source));

  return (
    <SlideOver
      title="Sources et limites"
      description="Références officielles rattachées à cette conclusion."
      trigger={
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:gap-3"
        >
          Voir les sources et limites
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      }
    >
      <div className="grid gap-3">
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-[var(--r-md)] border border-border p-3 transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]"
          >
            <span className="text-sm font-semibold text-foreground">{source.title}</span>
            <span className="mt-1 block font-mono text-xs text-muted">
              {source.checkedAt} · {source.legalScope}
            </span>
          </a>
        ))}
      </div>
    </SlideOver>
  );
}

/* ============================== /report ============================== */

export function ReportConclusionGrid({ conclusions }: { conclusions: ReportConclusionCard[] }) {
  return (
    <Stagger className="grid gap-4 lg:grid-cols-3">
      {conclusions.map((item) => {
        const isClient = item.audience === "client";
        return (
          <StaggerItem key={item.id} className="h-full">
            <Card
              accent={isClient}
              elevated
              className={cn("flex h-full flex-col", !isClient && "bg-[var(--surface-2)]")}
            >
              <CardHeader>
                <div>
                  <CardEyebrow>{isClient ? "Lecture client" : "Lecture conseiller"}</CardEyebrow>
                  <CardTitle className="mt-1">{item.label}</CardTitle>
                  <p className="mt-1 text-sm font-medium text-muted">
                    {isClient ? "Synthèse client" : "Annexe conseiller"}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </CardHeader>
              <p className="text-sm leading-6 text-muted">{item.userFacingExplanation}</p>
              <EvidenceLedger
                className="mt-4"
                items={[
                  { label: "Donnée utilisée", value: item.dataUsed },
                  { label: "Hypothèse", value: item.hypothesis },
                  { label: "Règle", value: item.rule },
                  { label: "Limite", value: item.limit },
                  { label: "Action de revue", value: item.reviewAction, emphasis: true },
                ]}
              />
              <EvidenceDrawer sourceIds={item.sourceIds} />
            </Card>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/* ============================== Helpers ============================== */

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-[var(--r-md)] border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]"
    >
      {children}
    </Link>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-md)] border p-4",
        accent
          ? "border-[var(--gold)] bg-[var(--gold-soft)]"
          : "border-border bg-[var(--surface-soft)]",
      )}
    >
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 break-words font-serif text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SmallList({ title, items, icon }: { title: string; items: string[]; icon: "ok" | "risk" }) {
  const Icon = icon === "ok" ? CheckCircle2 : AlertTriangle;
  const color = icon === "ok" ? "text-[var(--accent)]" : "text-[var(--warning)]";
  return (
    <div className="rounded-[var(--r-md)] border border-border bg-[var(--surface-soft)] p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-foreground">
            <Icon className={cn("mt-1 h-4 w-4 shrink-0", color)} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
