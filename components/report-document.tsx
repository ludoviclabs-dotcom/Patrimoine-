import { CalculationSteps } from "@/components/calculation-steps";
import { LegalNotice } from "@/components/legal-notice";
import { Badge } from "@/components/ui/badge";
import { CoverageLimitsPanel } from "@/components/v1-1/coverage-limits-panel";
import { MeetingBrief } from "@/components/v1-1/meeting-brief";
import { evidenceSources } from "@/lib/evidence/sources";
import { getPfuDiffAuditEvents } from "@/lib/evidence/pfu-rule-diff";
import { getPvImmoDiffAuditEvents } from "@/lib/evidence/pv-immo-rule-diff";
import { formatEuro } from "@/lib/format";
import {
  clientAdvisorReportSections,
  manualReviewFlags,
  regulatoryRiskControls,
  reportMethodItems,
} from "@/lib/patrimonial-model/model";
import { meetingBriefs, scenarioComparisons } from "@/lib/scenario-comparisons/comparisons";
import { getDmtgDiffAuditEvents } from "@/lib/evidence/dmtg-rule-diff";
import { getDutreilDiffAuditEvents } from "@/lib/evidence/dutreil-rule-diff";
import {
  getAllTaxRuns,
  simulateAssuranceVieTransmission,
  simulateDemembrement,
  simulateIrBareme2026,
  simulateIs,
  simulatePfuVsBareme,
  simulateSciIrVsIs,
} from "@/lib/tax/engines";
import {
  generateProfessionalDocuments,
  simulateDutreilV2,
  simulateHoldingTaxV2,
  simulatePerEarlyExitV24,
  simulateProductAdequacyV24,
  simulateRealEstateGainV2,
  simulateSuccessionChecklistV24,
  simulateSuccessionLiquidityStressV24,
  simulateTransmissionV2,
} from "@/lib/tax/v2-engines";
import type { AllocationItem } from "@/lib/demo-data/metrics";
import type { Household } from "@/lib/types";

export function ReportDocument({
  household,
  summary,
  ifiRun,
}: {
  household: Household;
  summary: {
    grossWealth: number;
    totalDebt: number;
    netWealth: number;
    liquidity: number;
    allocation: AllocationItem[];
    limits: string;
    openQuestions: string[];
  };
  ifiRun: {
    result: {
      taxableBase: number | null;
      threshold: number;
      message: string;
      netIfi?: number;
    };
    steps: Parameters<typeof CalculationSteps>[0]["steps"];
  };
}) {
  const taxRuns = getAllTaxRuns();
  const documents = generateProfessionalDocuments();
  const auditEvents = [
    ...getPfuDiffAuditEvents(),
    ...getPvImmoDiffAuditEvents(),
    ...getDmtgDiffAuditEvents(),
    ...getDutreilDiffAuditEvents(),
  ];
  const adviserHypotheses = [
    {
      label: "IR barème 2026",
      assumptions: "célibataire, 30 000 € imposables, exemple officiel service-public (2 103,99 €)",
      run: simulateIrBareme2026(),
    },
    {
      label: "PFU vs barème",
      assumptions: "1 000 € de dividendes, TMI 30 %, PS 18,6 % LFSS 2026, option barème comparée",
      run: simulatePfuVsBareme(),
    },
    {
      label: "Plus-value immobilière",
      assumptions: "cession 720 000 €, acquisition 420 000 €, 9 ans de détention, hors résidence principale",
      run: simulateRealEstateGainV2(),
    },
    {
      label: "Donation démembrée",
      assumptions: "300 000 € transmis, donateur 51 ans, 2 enfants, nue-propriété retenue",
      run: simulateTransmissionV2({ useDismemberment: true }),
    },
    {
      label: "Démembrement art. 669",
      assumptions: "usufruitier 65 ans, 400 000 € en pleine propriété, nue-propriété en ligne directe",
      run: simulateDemembrement(),
    },
    {
      label: "Pacte Dutreil",
      assumptions: "850 000 € de titres, 60 000 € d'actifs non éligibles, économie vs sans pacte chiffrée",
      run: simulateDutreilV2(),
    },
    {
      label: "Assurance-vie décès",
      assumptions: "352 500 € de capitaux pré-70 ans, 1 bénéficiaire en ligne directe (990 I)",
      run: simulateAssuranceVieTransmission(),
    },
    {
      label: "Taxe holding",
      assumptions: "5,4 M€ d'actifs, revenus passifs 56 %, contrôle 72 %, inventaire taxable 420 000 €",
      run: simulateHoldingTaxV2(),
    },
    {
      label: "Impôt sur les sociétés",
      assumptions: "bénéfice 120 000 €, CA 900 000 €, capital 100 % personnes physiques",
      run: simulateIs(),
    },
    {
      label: "SCI IR vs IS",
      assumptions: "loyers 30 000 €, charges 8 000 €, TMI 30 %, amortissement 2,5 %, sortie à 10 ans",
      run: simulateSciIrVsIs(),
    },
    {
      label: "Succession simple",
      assumptions: "actif brut, donations antérieures, notaire, documents et points de revue",
      run: simulateSuccessionChecklistV24(),
    },
    {
      label: "PER sortie résidence principale",
      assumptions: "capital débloqué, versements, gains et déduction à l'entrée à contrôler",
      run: simulatePerEarlyExitV24(),
    },
    {
      label: "Stress liquidité succession",
      assumptions: "droits estimés, cash disponible, réserve prudente et délai de cession",
      run: simulateSuccessionLiquidityStressV24(),
    },
    {
      label: "Adéquation produit simulée",
      assumptions: "horizon, risque, durabilité et marché cible, sans recommandation automatique",
      run: simulateProductAdequacyV24(),
    },
  ];

  return (
    <div className="print-page relative space-y-6 overflow-hidden rounded-lg border border-border bg-white p-6 shadow-[var(--shadow)]">
      <div className="print-only print-running-header" aria-hidden>
        {household.name} · Version règles V2-2026.05 · Simulation indicative — non validée · Revue
        professionnelle requise
      </div>
      <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rotate-[-10deg] text-center text-4xl font-bold uppercase tracking-[0.18em] text-red-100 md:text-6xl">
        Indicatif non validé
      </div>
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Rapport cabinet fiscal evidence-first
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{household.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {household.profile} - {household.fiscalResidence} - {household.children} enfants
          </p>
          <p className="mt-2 font-mono text-xs text-muted">
            Version règles V2-2026.05 - simulation 26/05/2026 - validé par : non validé
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="warning">Simulation indicative</Badge>
          <Badge tone="danger">Non validé</Badge>
        </div>
      </div>
      <LegalNotice compact />

      <section>
        <h2 className="text-lg font-semibold text-foreground">Sommaire</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-muted md:grid-cols-2">
          {[
            "Synthèse exécutive",
            "Profil foyer",
            "Cartographie patrimoniale",
            "Hypothèses",
            "Méthode et limites",
            "Résultats fiscaux comparés",
            "Sources officielles",
            "Limites de couverture",
            "Questions professionnelles",
            "Annexes de calcul",
            "Documents cabinet",
          ].map((item, index) => (
            <p key={item}>
              {index + 1}. {item}
            </p>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Synthèse exécutive</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Plateforme de préparation de dossier, simulation indicative et validation
          professionnelle. Aucun conseil fiscal ou juridique définitif n&apos;est rendu par ce rapport.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Patrimoine brut" value={formatEuro(summary.grossWealth)} />
          <Metric label="Dettes" value={formatEuro(summary.totalDebt)} />
          <Metric label="Patrimoine net" value={formatEuro(summary.netWealth)} />
          <Metric label="Liquidité" value={formatEuro(summary.liquidity)} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1 bis. Deux lectures du rapport</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {clientAdvisorReportSections.map((section) => (
            <div key={section.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={section.audience === "client" ? "teal" : "warning"}>{section.audience}</Badge>
                <p className="text-sm font-semibold text-foreground">{section.label}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{section.userFacingExplanation}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-muted">
                {section.contentBlocks.join(" · ")}
              </p>
              <p className="mt-3 text-sm font-medium text-foreground">{section.proofExpectation}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Profil foyer</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Metric label="Foyer" value={household.name} />
          <Metric label="Contexte" value={household.professionalContext} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Cartographie patrimoniale</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {summary.allocation.map((item) => (
            <Metric
              key={item.label}
              label={item.label}
              value={`${((item.value / summary.grossWealth) * 100).toFixed(1)} %`}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-base font-semibold text-amber-950">4. Hypothèses et limites</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">{summary.limits}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">4 bis. Méthode et limites V2.3</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Le rapport sépare ce qui est déclaré, ce qui est simulé, ce qui vient d&apos;une règle
          sourcée et ce qui relève d&apos;une action professionnelle. Cette séparation évite de
          transformer une hypothèse en conseil validé.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {reportMethodItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.meaning}</p>
              <p className="mt-3 text-sm font-medium text-foreground">{item.reportRule}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Hypothèses saisies par le conseiller</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {adviserHypotheses.map((item) => (
            <div key={item.label} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.assumptions}</p>
              <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                {["bank-import", "succession", "product-adequacy"].includes(item.run.module)
                  ? item.run.resultLabel
                  : typeof item.run.resultAmount === "number"
                    ? formatEuro(item.run.resultAmount)
                    : item.run.resultLabel}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">
                Statut : revue {item.run.reviewerRequired}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Résultats fiscaux V2</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {taxRuns.map((run) => {
            const firstSource = evidenceSources.find((source) => source.id === run.evidenceSourceIds[0]);
            const firstStep = run.steps[0];

            return (
              <div key={run.id} className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold text-foreground">{run.module}</p>
                <p className="mt-2 font-mono text-base font-semibold text-foreground">
                  {["bank-import", "succession", "product-adequacy"].includes(run.module)
                    ? run.resultLabel
                    : typeof run.resultAmount === "number"
                      ? formatEuro(run.resultAmount)
                      : run.resultLabel}
                </p>
                <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                  <p>
                    <span className="font-semibold text-foreground">Source :</span>{" "}
                    {firstSource?.title ?? run.evidenceSourceIds[0]}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Date :</span>{" "}
                    {firstSource?.checkedAt ?? run.createdAt}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Règle :</span>{" "}
                    {firstStep?.ruleVersionId ?? run.ruleSnapshotId}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Statut :</span>{" "}
                    {firstStep?.confidenceStatus ?? run.status}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Limite :</span>{" "}
                    {(run.coverageLimitIds ?? []).join(", ")}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Action :</span>{" "}
                    {firstStep?.nextAction ?? "Revue professionnelle requise."}
                  </p>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-muted">
                  Validation : {run.reviewerRequired}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">7. Scénarios comparés</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {scenarioComparisons.map((scenario) => (
            <div key={scenario.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{scenario.label}</p>
              <p className="mt-2 font-mono text-base font-semibold text-foreground">
                {formatEuro(scenario.netWealthEstimate)}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">
                Validation : {scenario.requiredValidation}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">8. Résultats IFI</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Base IFI" value={formatEuro(ifiRun.result.taxableBase ?? 0)} />
          <Metric label="Seuil d'alerte" value={formatEuro(ifiRun.result.threshold)} />
          <Metric label="IFI net indicatif" value={formatEuro(ifiRun.result.netIfi ?? 0)} />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{ifiRun.result.message}</p>
      </section>

      <CalculationSteps steps={ifiRun.steps} />

      <section>
        <h2 className="text-lg font-semibold text-foreground">9. Sources officielles</h2>
        <div className="mt-3 grid gap-3">
          {evidenceSources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border p-3 text-sm transition hover:bg-[var(--surface-soft)]"
            >
              <span className="font-semibold text-foreground">{source.title}</span>
              <span className="mt-1 block font-mono text-xs text-muted">
                {source.sourceVersion} - {source.checkedAt} - {source.status}
              </span>
            </a>
          ))}
        </div>
      </section>

      <CoverageLimitsPanel module="ifi" />

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-amber-950">Pourquoi le produit ne conclut pas seul</h2>
          <Badge tone="warning">Garde-fou</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Les simulations restent des aides à la préparation : conseil personnalisé, RGPD, profilage,
          LCB-FT, international, holding, trust et démembrement sophistiqué imposent une revue humaine.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {regulatoryRiskControls.slice(0, 6).map((control) => (
            <div key={control.id} className="rounded-lg border border-amber-200 bg-white/70 p-3">
              <p className="text-sm font-semibold text-amber-950">{control.label}</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">{control.mitigation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-red-950">10. Points de revue professionnelle V2.4</h2>
          <Badge tone="warning">Revue professionnelle</Badge>
        </div>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-red-900">
          {manualReviewFlags.map((flag) => (
            <li key={flag.id}>
              <span className="font-semibold">{flag.label} :</span> {flag.whyNoAutomation} Revue{" "}
              {flag.requiredProfessional}.
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">11. Résumé audit PFU</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {auditEvents.map((event) => (
            <div key={event.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{event.action}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{event.summary}</p>
              <p className="mt-2 font-mono text-xs text-muted">{event.createdAt}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">12. Questions professionnel</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
          {summary.openQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>

      <MeetingBrief briefs={meetingBriefs.slice(0, 2)} />

      <section>
        <h2 className="text-lg font-semibold text-foreground">13. Bloc validation et signature future</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric label="Validation" value="Non signée" />
          <Metric label="Relecteur attendu" value="Avocat / notaire / CGP" />
          <Metric label="Statut rapport" value="Émis pour revue" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">14. Documents cabinet préparés</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{document.title}</p>
              <p className="mt-2 font-mono text-xs text-muted">{document.version}</p>
              <p className="mt-2 text-sm text-muted">Statut : {document.status}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
