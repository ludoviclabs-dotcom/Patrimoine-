import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";

export const metadata = { title: "Politique de confidentialité — patrimoine-fiscal-demo" };

const sections = [
  {
    title: "Responsable de traitement (démo)",
    body: "Cabinet Démo Patrimoine — environnement de démonstration : les « données clients » affichées sont des fixtures fictives (Claire et Marc).",
  },
  {
    title: "Données traitées",
    body: "Aucune donnée personnelle réelle n'est requise pour utiliser la démo. Les saisies des formulaires restent dans le navigateur ; aucun secret bancaire n'est stocké (connecteurs simulés).",
  },
  {
    title: "Base légale et finalités",
    body: "En production : exécution du mandat (lettre de mission), obligations légales (LCB-FT, conservation des documents réglementaires) et intérêt légitime documenté. Une AIPD est prévue avant toute donnée réelle (référentiel CNIL).",
  },
  {
    title: "Durées de conservation",
    body: "Politique de rétention modélisée dans le produit : données personnelles limitées à la durée de la mission, journal d'audit conservé séparément, documents réglementaires selon les durées légales (5 ans LCB-FT).",
  },
  {
    title: "Droits des personnes",
    body: "Export et suppression sont intégrés au parcours produit (espace client) : demandes tracées dans l'audit append-only et arbitrées selon mandat et obligations légales. Contact : ludoviclabs@gmail.com.",
  },
  {
    title: "Décision automatisée",
    body: "Aucune décision produisant des effets juridiques n'est automatisée (art. 22 RGPD) : chaque conclusion exige une validation humaine — c'est un garde-fou de conception, pas une promesse.",
  },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero as="h1" eyebrow="Informations légales" title="Politique de confidentialité" lead="Démo sans données réelles ; le cadre RGPD cible est documenté pour la mise en production." />
        <div className="grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
