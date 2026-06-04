import Link from "next/link";
import { ArrowRight, ClipboardList, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  documentChecklistItems,
  legalVehicleGraph,
  lifeEventPlaybooks,
} from "@/lib/patrimonial-model/model";

export function LifeEventPlaybooks() {
  return (
    <section id="life-events" aria-labelledby="life-events-title" className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">V2.4</p>
        <h2 id="life-events-title" className="mt-2 text-2xl font-bold text-foreground">
          Événements de vie
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Le dossier démarre par l&apos;objectif du client, puis affiche les questions, documents,
          risques et l&apos;action cabinet suivante.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {lifeEventPlaybooks.map((event) => {
          const documents = documentChecklistItems.filter((item) => event.documentIds.includes(item.id));

          return (
            <Card key={event.id}>
              <CardHeader>
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge tone={event.reviewRequired ? "warning" : "success"}>
                      {event.reviewRequired ? "Revue requise" : "Test simple"}
                    </Badge>
                    <Badge>{event.certainty}</Badge>
                  </div>
                  <CardTitle>{event.label}</CardTitle>
                  <p className="mt-1 text-sm leading-6 text-muted">{event.userFacingExplanation}</p>
                </div>
                <ClipboardList className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
              </CardHeader>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Questions conditionnelles</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {event.questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Documents attendus</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {documents.map((document) => (
                      <li key={document.id}>{document.expectedDocument}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-[var(--surface-soft)] p-3">
                <p className="text-sm font-semibold text-foreground">Risques</p>
                <p className="mt-2 text-sm leading-6 text-muted">{event.risks.join(" · ")}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{event.nextAction}</p>
              </div>

              <Link
                href={event.href}
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-soft)]"
              >
                Tester ce parcours
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function Dossier360Map() {
  return (
    <section id="montage-patrimonial" aria-labelledby="dossier-360-title" className="space-y-4">
      <div>
        <h2 id="dossier-360-title" className="text-2xl font-bold text-foreground">
          Montage patrimonial
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          La donnée n&apos;est pas une liste d&apos;actifs : elle relie foyer, personnes, droits, véhicules,
          documents et consentements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Foyer → personnes → actifs → véhicules → preuves</CardTitle>
            <p className="mt-1 text-sm text-muted">Carte applicative compacte du dossier 360.</p>
          </div>
          <Network className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {legalVehicleGraph.map((node) => (
            <div key={node.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={node.reviewRequired ? "warning" : "teal"}>{node.nodeType}</Badge>
                <p className="text-sm font-semibold text-foreground">{node.label}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{node.userFacingExplanation}</p>
              <p className="mt-3 font-mono text-xs text-muted">{node.linksTo.join(" → ")}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
