"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Compass, FlaskConical } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Card, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { PatrimonialMindmap } from "@/components/v3-5/patrimonial-mindmap";
import { RecommendationCard } from "@/components/v3-5/recommendation-card";
import { getIntention, intentions, type IntentionId } from "@/lib/simulations/intentions";
import { cn } from "@/lib/utils";

/**
 * Accueil guidé de /simulations — divulgation progressive.
 * L'utilisateur part de son intention (cartes non techniques) ; un clic révèle
 * 3 à 5 scénarios recommandés avec leur « pourquoi », leurs limites et la
 * revue attendue. La carte patrimoniale offre une seconde entrée, par
 * dimension du dossier. Le laboratoire expert reste à un clic.
 */
export function GuidedSimulationsHome() {
  const [selectedId, setSelectedId] = useState<IntentionId | null>(null);
  const selected = getIntention(selectedId);

  return (
    <div className="space-y-10">
      <section id="intentions" className="scroll-mt-24">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Étape 1
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
              Que souhaitez-vous explorer aujourd&apos;hui ?
            </h2>
          </div>
          <Link
            href="/simulations/lab"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:gap-3"
          >
            <FlaskConical className="h-4 w-4" aria-hidden />
            Ouvrir le laboratoire expert
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {intentions.map((intention) => {
            const active = intention.id === selectedId;
            return (
              <StaggerItem key={intention.id} className="h-full">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setSelectedId((current) => (current === intention.id ? null : intention.id))
                  }
                  className={cn(
                    "flex h-full w-full flex-col rounded-[var(--r-lg)] border p-5 text-left transition",
                    "hover:-translate-y-1 hover:shadow-[var(--shadow)]",
                    active
                      ? "border-[var(--gold)] bg-[var(--gold-soft)]"
                      : "border-border bg-[var(--surface)] hover:border-[var(--line-strong)]",
                  )}
                >
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    {intention.eyebrow}
                  </p>
                  <p className="mt-2 font-serif text-lg font-semibold text-foreground">
                    {intention.label}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted">{intention.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
                    {active ? "Recommandations affichées" : "Voir les simulations pertinentes"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {selected ? (
        <Reveal>
          <section id="recommandations" className="scroll-mt-24">
            <div className="mb-5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">
                Étape 2 · {selected.label}
              </p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
                Scénarios recommandés
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                Chaque carte explique pourquoi le scénario est proposé, ce qu&apos;il calcule, ce
                qu&apos;il ne conclut pas seul, et qui doit valider.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {selected.recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.scenarioParam}
                  recommendation={recommendation}
                />
              ))}
            </div>
          </section>
        </Reveal>
      ) : (
        <Reveal>
          <Card className="border-dashed text-center">
            <p className="text-sm leading-6 text-muted">
              Choisissez une intention ci-dessus — ou explorez la carte patrimoniale ci-dessous —
              pour voir les simulations pertinentes, les pièces à réunir et les points de revue.
            </p>
          </Card>
        </Reveal>
      )}

      <Reveal>
        <section id="carte" className="scroll-mt-24">
          <PatrimonialMindmap />
        </section>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader className="mb-0">
            <div>
              <CardEyebrow>Mode expert</CardEyebrow>
              <CardTitle className="mt-1">Tous les moteurs, toutes les preuves</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Le laboratoire expert expose le catalogue complet des 18 moteurs déterministes,
                leurs règles versionnées, leurs sources hashées et la ventilation auditable de
                chaque résultat.
              </p>
              <Link
                href="/simulations/lab"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:gap-3"
              >
                Accéder au laboratoire expert
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <Compass className="h-5 w-5 text-[var(--gold-strong)]" aria-hidden />
          </CardHeader>
        </Card>
      </Reveal>
    </div>
  );
}
