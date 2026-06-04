import { AlertTriangle, BookOpen, Landmark, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  complianceSignals,
  manualReviewFlags,
  patrimonialTerms,
  wealthStructures,
} from "@/lib/patrimonial-model/model";
import type { PatrimonialStatus, RiskLevel } from "@/lib/patrimonial-model/model";

const statusTone: Record<PatrimonialStatus, "success" | "warning" | "danger" | "teal" | "neutral"> = {
  modélisé: "success",
  "simulation simple": "teal",
  "revue obligatoire": "warning",
  "hors MVP": "danger",
  "démo simulée": "neutral",
};

const riskTone: Record<RiskLevel, "success" | "warning" | "danger" | "teal"> = {
  faible: "success",
  moyen: "teal",
  élevé: "warning",
  critique: "danger",
};

export function PatrimonialModelPanels() {
  const termGroups = patrimonialTerms.reduce<Record<string, typeof patrimonialTerms>>((groups, term) => {
    groups[term.category] = [...(groups[term.category] ?? []), term];
    return groups;
  }, {});

  return (
    <section id="patrimonial-model" aria-labelledby="patrimonial-model-title" className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
          Modèle patrimonial versionné
        </p>
        <h2 id="patrimonial-model-title" className="mt-2 text-2xl font-bold text-foreground">
          Le dossier devient sourcé, simulable et auditable
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Ces quatre panneaux couvrent la totalité du rapport : vocabulaire, structures, conformité
          et seuils de sortie du mode automatique.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Thésaurus patrimonial</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Familles de notions à indexer, sourcer et rattacher au dossier.
              </p>
            </div>
            <BookOpen className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(termGroups).map(([category, terms]) => (
              <div key={category} className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
                <p className="text-sm font-bold text-foreground">{category}</p>
                <ul className="mt-3 grid gap-2">
                  {terms.map((term) => (
                    <li key={term.id} className="text-sm leading-6 text-muted">
                      <span className="font-semibold text-foreground">{term.label}</span>
                      <span className="block">{term.userFacingExplanation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Structures & enveloppes</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Matrice de couverture PEA, PER, assurance-vie, SCI, indivision, holding et trust.
              </p>
            </div>
            <Landmark className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3">
            {wealthStructures.map((structure) => (
              <div key={structure.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{structure.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{structure.typicalUse}</p>
                  </div>
                  <Badge tone={statusTone[structure.status]}>{structure.status}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{structure.vigilance}</p>
                <p className="mt-2 font-mono text-xs text-muted">
                  Champs : {structure.modelFields.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contrôle conformité</CardTitle>
              <p className="mt-1 text-sm text-muted">
                KYC, durabilité, LCB-FT, bénéficiaire effectif et consentement bancaire simulé.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3">
            {complianceSignals.map((signal) => (
              <div key={signal.id} className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{signal.label}</p>
                  <Badge tone={statusTone[signal.status]}>{signal.status}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{signal.userFacingExplanation}</p>
                <div className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-3">
                  <p>
                    <span className="font-semibold text-foreground">Déclencheur :</span> {signal.trigger}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Preuve :</span>{" "}
                    {signal.evidenceExpected}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Contrôle :</span> {signal.nextControl}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Revue manuelle obligatoire</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Les cas que le produit doit reconnaître sans jamais conclure seul.
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3">
            {manualReviewFlags.map((flag) => (
              <div key={flag.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{flag.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{flag.userFacingExplanation}</p>
                  </div>
                  <Badge tone={riskTone[flag.riskLevel]}>{flag.riskLevel}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  <span className="font-semibold text-foreground">Pourquoi pas automatique :</span>{" "}
                  {flag.whyNoAutomation}
                </p>
                <p className="mt-2 font-mono text-xs text-muted">
                  Revue : {flag.requiredProfessional} · Sources : {flag.sourceIds.length}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
