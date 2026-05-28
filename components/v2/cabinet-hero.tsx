import { ArrowRight, CircleCheck, FileText, GitCompareArrows, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getPfuRegulatoryDiff } from "@/lib/evidence/pfu-rule-diff";
import { formatEuro } from "@/lib/format";
import { getCompletenessScore } from "@/lib/quality/completeness";

const workflowSteps = [
  {
    label: "Qualification",
    status: "En cours",
    detail: "Foyer, résidence fiscale et actifs principaux déjà cadrés.",
  },
  {
    label: "Hypothèses",
    status: "À compléter",
    detail: "Régime matrimonial, bénéficiaires et parts SCI restent prioritaires.",
  },
  {
    label: "Simulation",
    status: "Alerte PFU",
    detail: "Le passage à 31,4 % déclenche un recalcul du dossier.",
  },
  {
    label: "Preuves",
    status: "Traçable",
    detail: "Source, règle versionnée et piste d'audit restent visibles.",
  },
  {
    label: "Rapport",
    status: "Revue requise",
    detail: "Aucun livrable client sans validation professionnelle.",
  },
];

export function CabinetHero() {
  const completeness = getCompletenessScore();
  const pfuDiff = getPfuRegulatoryDiff();

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow)]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            Démo cabinet 7 minutes
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-foreground md:text-4xl">
            Un dossier fiscal guidé, sourcé et prêt pour revue professionnelle.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
            Claire et Marc avancent dans un parcours lisible : qualifier le dossier, sécuriser
            les hypothèses, comprendre l&apos;alerte PFU 2026, afficher les preuves, puis préparer
            une note de simulation sans promesse de validation automatique.
          </p>
          <Link
            href="/dossiers"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white transition hover:bg-[#223029]"
          >
            Continuer le dossier
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeroMetric label="Complétude" value={`${completeness.score}%`} detail="Dossier exploitable" />
            <HeroMetric label="Alerte PFU" value="31,4 %" detail="Taux 2026 à contrôler" />
            <HeroMetric label="Impact" value={formatEuro(pfuDiff.delta)} detail="Écart à recalculer" />
            <HeroMetric label="Prochaine action" value="Revue expert" detail="Avant rapport signé" />
          </div>
        </div>

        <aside
          className="rounded-lg border border-teal-200 bg-teal-50 p-4"
          aria-label="Résumé du dossier de démonstration"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Simulation indicative</Badge>
            <Badge tone="teal">Revue requise</Badge>
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">Résumé du dossier</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Le dossier est assez complet pour une simulation, mais l&apos;alerte PFU impose une
            revue humaine avant tout partage externe.
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <SummaryRow icon={CircleCheck} label="Dossier" value={`${completeness.score}% complet`} />
            <SummaryRow icon={GitCompareArrows} label="PFU 2026" value="30 % vers 31,4 %" />
            <SummaryRow icon={FileText} label="Impact" value={`${formatEuro(pfuDiff.delta)} à expliquer`} />
            <SummaryRow icon={ShieldCheck} label="Livrable" value="Validation cabinet obligatoire" />
          </dl>
        </aside>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Parcours de rendez-vous</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Le premier écran raconte l&apos;avancement du dossier avant d&apos;ouvrir les détails.
            </p>
          </div>
          <Badge tone="teal">Qualification → Hypothèses → Simulation → Preuves → Rapport</Badge>
        </div>
        <ol className="mt-4 grid gap-3 lg:grid-cols-5">
          {workflowSteps.map((step, index) => (
            <li key={step.label} className="rounded-lg border border-border bg-[var(--surface-soft)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Badge tone={step.status === "Revue requise" ? "warning" : "neutral"}>{step.status}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{step.label}</p>
              <p className="mt-1 text-sm leading-5 text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--accent)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
        <dd className="mt-1 font-semibold text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function HeroMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-mono text-base font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm leading-5 text-muted">{detail}</p>
    </div>
  );
}
