import { ArrowRight, ExternalLink, Library, Route, ShieldCheck } from "lucide-react";
import { AtlasMapCard } from "@/components/atlas-fiscal/atlas-map-card";
import { PublicMoneyCard } from "@/components/atlas-fiscal/public-money-card";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  atlasSources,
  fiscalAtlasMaps,
  publicMoneyFlows,
  publicSpendingBreakdown,
} from "@/lib/fiscal-atlas/atlas";

export default function AtlasFiscalPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone="teal">Atlas fiscal</Badge>
              <Badge tone="neutral">Statique et sourcé</Badge>
            </div>
            <h2 className="max-w-4xl text-3xl font-bold leading-tight text-foreground md:text-4xl">
              Comprendre, visualiser, simuler, décider.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
              Une couche pédagogique pour transformer les frictions fiscales en cartes lisibles,
              sourcées et reliées aux simulateurs cabinet. Chaque bloc distingue fait établi,
              analyse, hypothèse et débat.
            </p>
          </div>
          <Card className="shadow-none">
            <CardHeader className="mb-0">
              <div>
                <CardTitle>Promesse V1</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Aucun appel IA runtime, aucune donnée live obligatoire : les cartes reposent sur
                  des fixtures vérifiables et des sources publiques.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
            </CardHeader>
          </Card>
        </header>

        <section aria-labelledby="frictions-title" className="space-y-5">
          <div className="flex flex-col justify-between gap-3 border-t border-border pt-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                Comprendre les frictions fiscales
              </p>
              <h2 id="frictions-title" className="mt-2 text-2xl font-bold text-foreground">
                Cartes courtes pour rendre le système lisible
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              Les schémas restent volontairement compacts : un mécanisme, une nuance de preuve, une
              action possible.
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            {fiscalAtlasMaps.map((map) => (
              <AtlasMapCard key={map.id} map={map} />
            ))}
          </div>
        </section>

        <section
          id="public-money"
          aria-labelledby="public-money-title"
          className="space-y-5 border-t border-border pt-8"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                Où va l&apos;argent public ?
              </p>
              <h2 id="public-money-title" className="mt-2 text-2xl font-bold text-foreground">
                La face utile pour répondre à “à quoi ça sert ?”
              </h2>
            </div>
            <p className="text-sm leading-6 text-muted">
              Le périmètre affiché est celui des administrations publiques au sens large :
              État, Sécurité sociale, collectivités et autres organismes. C&apos;est le bon niveau pour
              expliquer retraites, santé, éducation, dette, infrastructures et services publics.
            </p>
          </div>

          <PublicMoneyCard breakdown={publicSpendingBreakdown} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <PublicMoneyFlowPanel />
            <ScopeNote />
          </div>
        </section>

        <section id="sources" aria-labelledby="sources-title" className="space-y-5 border-t border-border pt-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                Sources & auditabilité
              </p>
              <h2 id="sources-title" className="mt-2 text-2xl font-bold text-foreground">
                Sources publiques utilisées par l&apos;atlas
              </h2>
            </div>
            <Badge tone="success">{atlasSources.length} sources vérifiées</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {atlasSources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border bg-white p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-[#cbd6cf] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      {source.publisher}
                    </p>
                    <h3 className="mt-2 text-base font-bold leading-6 text-foreground">
                      {source.title}
                    </h3>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{source.description}</p>
                <p className="mt-4 font-mono text-xs text-muted">Vérifié le {source.checkedAt}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function PublicMoneyFlowPanel() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Schéma des flux</CardTitle>
          <p className="mt-1 text-sm leading-6 text-muted">
            De l&apos;euro prélevé vers ses usages collectifs, sans confondre budget de l&apos;État et
            dépense publique totale.
          </p>
        </div>
        <Route className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <ol className="grid gap-3 md:grid-cols-4">
        {publicMoneyFlows.map((flow, index) => (
          <li key={flow.id} className="relative min-w-0 rounded-lg border border-border bg-[#fbfcfb] p-4">
            {index < publicMoneyFlows.length - 1 ? (
              <ArrowRight
                className="absolute -right-4 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white p-0.5 text-[var(--accent)] md:block"
                aria-hidden="true"
              />
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-strong)] font-mono text-xs font-bold text-white">
                {index + 1}
              </span>
              <Badge tone="success">{flow.certainty}</Badge>
            </div>
            <h3 className="mt-4 text-sm font-bold leading-5 text-foreground">{flow.label}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{flow.description}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ScopeNote() {
  return (
    <Card id="scope-note">
      <CardHeader>
        <div>
          <CardTitle>Deux nuances à garder visibles</CardTitle>
          <p className="mt-1 text-sm leading-6 text-muted">
            La crédibilité de l&apos;atlas tient à ces distinctions simples.
          </p>
        </div>
        <Library className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-3">
        <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-semibold text-foreground">Cotisations sociales</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Elles ne sont pas juridiquement des impôts, mais elles appartiennent aux prélèvements
            obligatoires en comptabilité nationale.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-semibold text-foreground">Budget de l&apos;État</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Il ne couvre pas toute la dépense publique : la Sécurité sociale et les collectivités
            portent une grande partie du réel “où va l&apos;argent”.
          </p>
        </div>
      </div>
    </Card>
  );
}
