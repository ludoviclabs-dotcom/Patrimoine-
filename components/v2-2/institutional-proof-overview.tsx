import { AlertTriangle, ClipboardCheck, GitCompareArrows, ScrollText, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { LegalNotice } from "@/components/legal-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleDiffPanel } from "@/components/v1-1/rule-diff-panel";
import { AuditEvidencePanel } from "@/components/v2-2/audit-evidence-panel";
import { getPfuRegulatoryDiff } from "@/lib/evidence/pfu-rule-diff";
import { formatEuro } from "@/lib/format";
import { getGoldenCases } from "@/lib/validation/golden-cases";

const statusTone = {
  pass: "success",
  fail: "danger",
  needs_professional_review: "warning",
} as const;

const executionStatusLabel = {
  pass: "Réussi",
  fail: "Écart détecté",
  needs_professional_review: "Revue professionnelle",
} as const;

const coverageLabel = {
  covered: "Couvert",
  partially_covered: "Partiellement couvert",
  not_covered_v1: "Non couvert V1",
} as const;

export function InstitutionalProofOverview() {
  const diff = getPfuRegulatoryDiff();
  const impactedRun = diff.impactedRuns[0];
  const goldenCases = getGoldenCases();
  const passCount = goldenCases.filter((goldenCase) => goldenCase.executionStatus === "pass").length;
  const reviewCount = goldenCases.filter(
    (goldenCase) => goldenCase.executionStatus === "needs_professional_review",
  ).length;
  const adversarialCases = goldenCases.filter(
    (goldenCase) => goldenCase.coverageBadge !== "covered",
  );

  return (
    <section className="space-y-5" aria-labelledby="institutional-proof-title">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge tone="warning">Diff réglementaire actif</Badge>
              <Badge tone="teal">Portfolio institutionnel</Badge>
              <Badge tone="danger">Revue professionnelle requise</Badge>
            </div>
            <h2 id="institutional-proof-title" className="mt-3 text-2xl font-bold text-amber-950">
              Preuve vivante PFU : source modifiée, règle versionnée, dossier impacté.
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Le cockpit montre maintenant le scénario flagship directement : passage PFU de 30 % à 31,4 %
              au 01/01/2026, impact Claire et Marc, recalcul requis, piste d&apos;audit et limites visibles.
            </p>
          </div>
          <Link
            href="/evidence"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-amber-950 px-4 text-sm font-semibold text-white transition hover:bg-amber-900"
          >
            Ouvrir les preuves
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProofMetric
          icon={GitCompareArrows}
          label="Règle changée"
          value="30 % -> 31,4 %"
          detail={`${diff.fromRule} vers ${diff.toRule}`}
          tone="warning"
        />
        <ProofMetric
          icon={AlertTriangle}
          label="Impact dossier"
          value={formatEuro(diff.delta)}
          detail={`${impactedRun.caseLabel} : ${formatEuro(diff.amountBefore)} -> ${formatEuro(diff.amountAfter)}`}
          tone="danger"
        />
        <ProofMetric
          icon={ScrollText}
          label="Audit déclenché"
          value={`${diff.auditEventIds.length} événements`}
          detail="Source modifiée, règle mise à jour, recalcul requis"
          tone="teal"
        />
        <ProofMetric
          icon={ShieldCheck}
          label="Conformité visible"
          value="RGPD + AIPD"
          detail="Registre art. 30, AIPD pilote et non-conseil affichés"
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Golden cases live et cas-pièges</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Attendu vs calculé en direct, couverture explicite et exceptions envoyées en revue.
              </p>
            </div>
            <ClipboardCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Pass</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{passCount}</p>
              <p className="mt-1 text-sm text-muted">Moteurs couverts avec expected = actual.</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Revue</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{reviewCount}</p>
              <p className="mt-1 text-sm text-muted">Cas volontairement bornés ou non couverts.</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Execution</p>
              <p className="mt-2 text-2xl font-bold text-foreground">live</p>
              <p className="mt-1 text-sm text-muted">{goldenCases[0]?.executedAt}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {adversarialCases.slice(0, 3).map((goldenCase) => (
              <div key={goldenCase.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{goldenCase.title}</p>
                    <p className="mt-1 text-sm text-muted">{goldenCase.failureReason}</p>
                  </div>
                  <Badge tone={statusTone[goldenCase.executionStatus]}>
                    {executionStatusLabel[goldenCase.executionStatus]}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{goldenCase.module}</Badge>
                  <Badge tone="warning">{coverageLabel[goldenCase.coverageBadge]}</Badge>
                  <Badge>{goldenCase.reviewer ?? "reviewer à assigner"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <LegalNotice compact />
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Registre RGPD art. 30</CardTitle>
                <p className="mt-1 text-sm text-muted">
                  Finalités, catégories de données, destinataires, durées et mesures de sécurité sont visibles sur
                  la page conformité.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
            </CardHeader>
            <div className="space-y-2 text-sm leading-6 text-muted">
              <p>Finalité : préparation de dossier patrimonial et simulations indicatives.</p>
              <p>Base légale : mission précontractuelle / intérêt légitime cabinet pilote.</p>
              <p>Statut AIPD : brouillon pilote, revue requise avant données réelles.</p>
            </div>
            <Link
              href="/compliance"
              className="mt-4 inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)]"
            >
              Voir conformité RGPD / IA
            </Link>
          </Card>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-2" aria-label="Détails du diff PFU et audit">
        <RuleDiffPanel />
        <AuditEvidencePanel />
      </section>
    </section>
  );
}

function ProofMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "danger" | "teal";
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-strong)] text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <Badge tone={tone}>{label}</Badge>
          <p className="mt-3 font-mono text-lg font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-sm leading-5 text-muted">{detail}</p>
        </div>
      </div>
    </Card>
  );
}
