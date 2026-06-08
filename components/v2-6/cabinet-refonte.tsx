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
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { evidenceSources } from "@/lib/evidence/sources";
import type { EvidenceSource, TaxRun } from "@/lib/types";

const statusTone = Object.fromEntries(statusDictionary.map((status) => [status.id, status.tone])) as Record<
  CabinetStatus,
  "neutral" | "success" | "warning" | "danger" | "teal"
>;

const riskCopy: Record<RiskTone, { label: string; className: string }> = {
  low: { label: "Faible", className: "border-teal-200 bg-teal-50 text-teal-900" },
  medium: { label: "Moyen", className: "border-amber-200 bg-amber-50 text-amber-900" },
  high: { label: "Élevé", className: "border-red-200 bg-red-50 text-red-800" },
  critical: { label: "Critique", className: "border-red-300 bg-red-100 text-red-950" },
};

const sourceById = new Map(evidenceSources.map((source) => [source.id, source]));

export function StatusBadge({ status }: { status: CabinetStatus }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{status}</Badge>;
}

function RiskBadge({ risk }: { risk: RiskTone }) {
  const item = riskCopy[risk];
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-medium ${item.className}`}>{item.label}</span>;
}

export function CabinetHomeV26() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-3" aria-label="Décisions cabinet">
        {cabinetDecisionCards.map((card) => (
          <Card key={card.id} className="flex h-full flex-col">
            <CardHeader>
              <div>
                <CardTitle>{card.label}</CardTitle>
                <p className="mt-2 text-2xl font-bold text-foreground">{card.metric}</p>
              </div>
              <StatusBadge status={card.status} />
            </CardHeader>
            <p className="text-sm leading-6 text-muted">{card.userFacingExplanation}</p>
            <p className="mt-3 text-sm font-medium text-foreground">{card.helper}</p>
            <Link href={card.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
              Ouvrir
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <TaskList tasks={cabinetTaskQueue} />
        <ReviewGate items={reviewQueueItems.slice(0, 3)} />
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Parcours testable cabinet</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Ouvrir dossier, simuler, vérifier preuves, passer en revue humaine, produire le rapport.
              Les contenus atlas et workflow restent accessibles comme ressources contextuelles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/atlas-fiscal">Atlas fiscal</LinkButton>
            <LinkButton href="/workflow">Workflow démo</LinkButton>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {cabinetTaskQueue.map((task) => (
            <Link
              key={task.id}
              href={task.href}
              className="rounded-lg border border-border bg-[var(--surface-soft)] p-3 text-sm transition hover:border-[#cbd6cf] hover:bg-white"
            >
              <span className="font-mono text-xs text-muted">0{task.order}</span>
              <span className="mt-2 block font-semibold text-foreground">{task.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function TaskList({ tasks }: { tasks: CabinetTask[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Actions prioritaires</CardTitle>
          <p className="mt-1 text-sm text-muted">Checklist courte pour tester la démo en rendez-vous cabinet.</p>
        </div>
        <ClipboardList className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="space-y-3">
        {tasks.map((task) => (
          <article key={task.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted">Étape {task.order} · {task.owner}</p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">{task.label}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <RiskBadge risk={task.risk} />
                <StatusBadge status={task.status} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{task.userFacingExplanation}</p>
            <p className="mt-3 text-sm font-medium text-foreground">{task.nextAction}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {task.dataUsed.map((data) => (
                <Badge key={data}>{data}</Badge>
              ))}
            </div>
            <Link href={task.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
              Tester cette étape
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function DossierWorkspaceV26() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Liste de dossiers démo</CardTitle>
              <p className="mt-1 text-sm text-muted">Le cabinet commence par un dossier, pas par un moteur fiscal.</p>
            </div>
            <FolderOpen className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="space-y-3">
            {["Claire et Marc", "Famille dirigeante exemple", "Succession Durand"].map((name, index) => (
              <div
                key={name}
                className={`rounded-lg border p-4 ${
                  index === 0 ? "border-teal-200 bg-teal-50" : "border-border bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{name}</p>
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

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Dossier actif : Claire et Marc</CardTitle>
              <p className="mt-1 text-sm text-muted">Foyer + personnes + actifs + passifs + enveloppes + véhicules + documents.</p>
            </div>
            <StatusBadge status="Revue requise" />
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Patrimoine brut" value={formatEuro(3_420_000)} />
            <Metric label="Passifs" value={formatEuro(680_000)} />
            <Metric label="Documents reçus" value="11 / 18" />
            <Metric label="Alertes" value="4 revues" />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {dossierWorkspaceTabs.map((tab) => (
          <Card key={tab.id} id={tab.href.split("#")[1]} className="scroll-mt-24">
            <CardHeader>
              <div>
                <CardTitle>{tab.label}</CardTitle>
                <p className="mt-1 text-sm text-muted">{tab.summary}</p>
              </div>
              <StatusBadge status={tab.status} />
            </CardHeader>
            <p className="text-sm leading-6 text-muted">{tab.userFacingExplanation}</p>
            <div className="mt-4 grid gap-3">
              <SmallList title="Éléments attendus" items={tab.expectedItems} icon="ok" />
              <SmallList title="Blocages" items={tab.blockers} icon="risk" />
            </div>
            <Link href={tab.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
              Ouvrir la vue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        ))}
      </section>
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
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-center gap-3">
        <Scale className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Événements de vie</h2>
          <p className="mt-1 text-sm text-muted">Entrée par objectif client, pas par formulaire monolithique.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {events.map(([label, detail]) => (
          <div key={label} className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SimulationCatalog({
  activeScenario,
}: {
  activeScenario?: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Catalogue de simulations</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Choisir un scénario charge le moteur avec son contexte, ses sources et sa revue attendue.
          </p>
        </div>
        <BookOpenCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {simulationCatalog.map((item) => {
          const active = item.scenarioParam === activeScenario || item.aliases.includes(activeScenario ?? "");
          return <SimulationCatalogCard key={item.id} item={item} active={active} />;
        })}
      </div>
    </Card>
  );
}

function SimulationCatalogCard({ item, active }: { item: SimulationCatalogItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`rounded-lg border p-4 transition ${
        active ? "border-teal-300 bg-teal-50" : "border-border bg-white hover:bg-[var(--surface-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{item.label}</p>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{item.userFacingExplanation}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{item.activeLabel}</p>
    </Link>
  );
}

export function SimulationAuditSummary({ item }: { item: SimulationCatalogItem | null }) {
  if (!item) return null;

  return (
    <section className="grid gap-4 lg:grid-cols-5">
      <AuditTile label="Donnée utilisée" value={item.dataUsed} />
      <AuditTile label="Hypothèse" value={item.hypothesis} />
      <AuditTile label="Règle" value={item.rule} />
      <AuditTile label="Limite" value={item.limit} />
      <AuditTile label="Revue requise" value={item.reviewGate} />
    </section>
  );
}

export function CalculationBreakdown({ run }: { run: TaxRun }) {
  const firstStep = run.steps[0];
  const source = firstStep ? sourceById.get(firstStep.evidenceSourceId) : null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Ventilation auditable du résultat</CardTitle>
          <p className="mt-1 text-sm text-muted">Chaque résultat montre donnée, hypothèse, règle, source, limite et revue.</p>
        </div>
        <StatusBadge status="Revue requise" />
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Metric label="Résultat" value={typeof run.resultAmount === "number" ? formatEuro(run.resultAmount) : run.resultLabel} />
        <Metric label="Source principale" value={source?.title ?? run.evidenceSourceIds[0] ?? "Source à vérifier"} />
        <Metric label="Règle" value={firstStep?.ruleVersionId ?? run.ruleSnapshotId ?? "Règle à vérifier"} />
      </div>
      <div className="mt-4 grid gap-3">
        {run.steps.slice(0, 4).map((step) => (
          <div key={step.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
              <Badge tone={step.confidenceStatus === "needs_review" ? "warning" : "teal"}>{step.confidenceStatus === "needs_review" ? "Revue requise" : "Simulation indicative"}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{step.intermediateResult}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{step.nextAction}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ReviewGate({ items }: { items: ReviewQueueItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Revue humaine obligatoire</CardTitle>
          <p className="mt-1 text-sm text-muted">Le produit indique pourquoi il refuse de conclure seul.</p>
        </div>
        <LockKeyhole className="h-5 w-5 text-[var(--danger)]" aria-hidden="true" />
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
    <div className="grid gap-4 lg:grid-cols-2">
      {reviewQueueItems.map((item) => (
        <ReviewQueueCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ReviewQueueCard({ item, compact = false }: { item: ReviewQueueItem; compact?: boolean }) {
  return (
    <article id={item.id} className="scroll-mt-24 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{item.professional}</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{item.label}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskBadge risk={item.severity} />
          <StatusBadge status={item.status} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{item.userFacingExplanation}</p>
      {!compact ? (
        <div className="mt-4 grid gap-3">
          <AuditTile label="Déclencheur" value={item.trigger} />
          <AuditTile label="Motif bloquant" value={item.blockingReason} />
          <AuditTile label="Action suivante" value={item.nextAction} />
        </div>
      ) : (
        <p className="mt-3 text-sm font-medium text-foreground">{item.nextAction}</p>
      )}
      <Link href={item.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
        Ouvrir le point
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function EvidenceAuditTable() {
  const rows = evidenceSources.slice(0, 12);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Table d&apos;audit des preuves</CardTitle>
          <p className="mt-1 text-sm text-muted">Source, date, périmètre, règle liée et niveau de preuve.</p>
        </div>
        <FileSearch className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
              <th className="py-3 pr-4 font-semibold">Source</th>
              <th className="py-3 pr-4 font-semibold">Date</th>
              <th className="py-3 pr-4 font-semibold">Périmètre</th>
              <th className="py-3 pr-4 font-semibold">Règles</th>
              <th className="py-3 pr-4 font-semibold">Niveau</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((source) => (
              <tr key={source.id} className="border-b border-border align-top">
                <td className="py-3 pr-4">
                  <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:text-[var(--accent)]">
                    {source.title}
                  </a>
                  <p className="mt-1 font-mono text-xs text-muted">{source.sourceVersion}</p>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-muted">{source.checkedAt}</td>
                <td className="py-3 pr-4">{source.legalScope}</td>
                <td className="py-3 pr-4">{source.linkedRuleIds.slice(0, 2).join(", ")}</td>
                <td className="py-3 pr-4">
                  <Badge tone={source.status === "active" ? "success" : "warning"}>{source.status === "active" ? "Source active" : "À revoir"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function EvidenceDrawer({ sourceIds }: { sourceIds: string[] }) {
  const sources = sourceIds
    .map((id) => sourceById.get(id))
    .filter((source): source is EvidenceSource => Boolean(source));

  return (
    <details className="rounded-lg border border-border bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">Voir les sources et limites</summary>
      <div className="mt-4 grid gap-3">
        {sources.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="rounded-lg border border-border p-3">
            <span className="text-sm font-semibold text-foreground">{source.title}</span>
            <span className="mt-1 block font-mono text-xs text-muted">{source.checkedAt} · {source.legalScope}</span>
          </a>
        ))}
      </div>
    </details>
  );
}

export function ReportConclusionGrid({ conclusions }: { conclusions: ReportConclusionCard[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {conclusions.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div>
              <CardTitle>{item.label}</CardTitle>
              <p className="mt-1 text-sm text-muted">{item.audience === "client" ? "Synthèse client" : "Annexe conseiller"}</p>
            </div>
            <StatusBadge status={item.status} />
          </CardHeader>
          <p className="text-sm leading-6 text-muted">{item.userFacingExplanation}</p>
          <div className="mt-4 grid gap-3">
            <AuditTile label="Donnée utilisée" value={item.dataUsed} />
            <AuditTile label="Hypothèse" value={item.hypothesis} />
            <AuditTile label="Règle" value={item.rule} />
            <AuditTile label="Limite" value={item.limit} />
            <AuditTile label="Action de revue" value={item.reviewAction} />
          </div>
          <EvidenceDrawer sourceIds={item.sourceIds} />
        </Card>
      ))}
    </div>
  );
}

export function RiskPanel() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Pourquoi le produit ne conclut pas seul</CardTitle>
          <p className="mt-1 text-sm text-muted">Conseil, RGPD, LCB-FT et cas complexes restent sous contrôle humain.</p>
        </div>
        <ShieldAlert className="h-5 w-5 text-[var(--danger)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          "Conseil personnalisé réservé au professionnel compétent.",
          "Données sensibles et profilage : pas de décision automatisée.",
          "LCB-FT, bénéficiaire effectif et origine des fonds doivent être documentés.",
          "International, holding, trust et démembrement sophistiqué sortent du mode automatique.",
        ].map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <p className="text-sm leading-6 text-amber-950">{item}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)]"
    >
      {children}
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 break-words text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SmallList({ title, items, icon }: { title: string; items: string[]; icon: "ok" | "risk" }) {
  const Icon = icon === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-muted">
            <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}
