import { CalculationSteps } from "@/components/calculation-steps";
import { Badge } from "@/components/ui/badge";
import { CoverageLimitsPanel } from "@/components/v1-1/coverage-limits-panel";
import { MeetingBrief } from "@/components/v1-1/meeting-brief";
import { evidenceSources } from "@/lib/evidence/sources";
import { formatEuro } from "@/lib/format";
import { meetingBriefs, scenarioComparisons } from "@/lib/scenario-comparisons/comparisons";
import {
  generateProfessionalDocuments,
  getV2TaxRuns,
  simulateDutreilV2,
  simulateHoldingTaxV2,
  simulateRealEstateGainV2,
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
  const taxRuns = getV2TaxRuns();
  const documents = generateProfessionalDocuments();
  const adviserHypotheses = [
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
      label: "Pacte Dutreil",
      assumptions: "850 000 € de titres, 60 000 € d'actifs non éligibles, engagements à documenter",
      run: simulateDutreilV2(),
    },
    {
      label: "Taxe holding",
      assumptions: "5,4 M€ d'actifs, revenus passifs 56 %, contrôle 72 %, inventaire taxable 420 000 €",
      run: simulateHoldingTaxV2(),
    },
  ];
  const mandatoryReviewItems = [
    "Dettes IFI complexes, prêts familiaux et passifs non directement rattachés à un actif immobilier.",
    "Non-résidents, trusts, holdings atypiques et sociétés interposées avec actifs mixtes.",
    "Donation-partage, donations antérieures non documentées et clauses matrimoniales spécifiques.",
    "Valorisation de titres, actifs somptuaires, biens non affectés à l'exploitation et qualification Dutreil.",
    "Résidence principale, travaux, frais et surtaxe dans les dossiers de plus-value immobilière.",
  ];

  return (
    <div className="print-page space-y-6 rounded-lg border border-border bg-white p-6 shadow-[var(--shadow)]">
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

      <section>
        <h2 className="text-lg font-semibold text-foreground">Sommaire</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-muted md:grid-cols-2">
          {[
            "Synthèse exécutive",
            "Profil foyer",
            "Cartographie patrimoniale",
            "Hypothèses",
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
        <h2 className="text-lg font-semibold text-foreground">5. Hypothèses saisies par le conseiller</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {adviserHypotheses.map((item) => (
            <div key={item.label} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.assumptions}</p>
              <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                {typeof item.run.resultAmount === "number" ? formatEuro(item.run.resultAmount) : item.run.resultLabel}
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
          {taxRuns.map((run) => (
            <div key={run.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{run.module}</p>
              <p className="mt-2 font-mono text-base font-semibold text-foreground">
                {typeof run.resultAmount === "number" ? formatEuro(run.resultAmount) : run.resultLabel}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">
                Validation : {run.reviewerRequired}
              </p>
            </div>
          ))}
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

      <section className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="text-base font-semibold text-red-950">10. Cas non couverts / revue obligatoire</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-red-900">
          {mandatoryReviewItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">11. Questions professionnel</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
          {summary.openQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>

      <MeetingBrief briefs={meetingBriefs.slice(0, 2)} />

      <section>
        <h2 className="text-lg font-semibold text-foreground">12. Documents cabinet préparés</h2>
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
