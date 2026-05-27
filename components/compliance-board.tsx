import { BrainCircuit, FileText, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { aiGovernancePolicy } from "@/lib/compliance/ai-governance";
import { aiGovernanceChecklist, dpiaSummary, processingRegister, retentionPolicy } from "@/lib/compliance/registry";

export function ComplianceBoard() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Registre RGPD pilote</CardTitle>
              <p className="mt-1 text-sm text-muted">Traitements identifiés pour le jalon V1 cabinet.</p>
            </div>
            <FileText className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3">
            {processingRegister.map((item) => (
              <article key={item.id} className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">{item.purpose}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.legalBasis}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.dataCategories.map((category) => (
                    <Badge key={category}>{category}</Badge>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Destinataires : {item.recipients.join(", ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.securityMeasures.map((measure) => (
                    <Badge key={measure} tone="teal">{measure}</Badge>
                  ))}
                </div>
                <p className="mt-2 font-mono text-xs text-muted">{item.retention}</p>
              </article>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>AIPD / DPIA</CardTitle>
              <p className="mt-1 text-sm text-muted">Recommandée dès le pilote.</p>
            </div>
            <ShieldAlert className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <Badge tone="warning">{dpiaSummary.status}</Badge>
          <h3 className="mt-4 text-base font-semibold text-foreground">{dpiaSummary.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Reliée à la source CNIL AIPD et au registre art. 30 RGPD. Statut pilote : revue
            obligatoire avant tout traitement réel.
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            {dpiaSummary.mitigations.map((mitigation) => (
              <li key={mitigation}>{mitigation}</li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Politique de conservation</CardTitle>
              <p className="mt-1 text-sm text-muted">Valeurs par défaut à contractualiser.</p>
            </div>
          </CardHeader>
          <div className="space-y-3">
            {retentionPolicy.map((item) => (
              <div key={item.area} className="rounded-lg bg-[var(--surface-soft)] p-4">
                <p className="text-sm font-semibold text-foreground">{item.area}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{item.rule}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>IA contrôlée</CardTitle>
              <p className="mt-1 text-sm text-muted">Préparation future, runtime IA désactivé aujourd&apos;hui.</p>
            </div>
            <BrainCircuit className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <Badge tone="danger">Runtime IA : {aiGovernancePolicy.runtimeStatus}</Badge>
          <ul className="space-y-3 text-sm leading-6 text-muted">
            {aiGovernanceChecklist.map((item) => (
              <li key={item} className="rounded-lg border border-border p-3">
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
