import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";

export const metadata = { title: "CGU — patrimoine-fiscal-demo" };

const sections = [
  {
    title: "Objet",
    body: "Les présentes conditions encadrent l'usage de la plateforme de démonstration : préparation de dossiers patrimoniaux, simulations fiscales indicatives et production de documents de travail.",
  },
  {
    title: "Absence de conseil",
    body: "Aucun résultat n'est opposable : chaque simulation impose une revue par le professionnel compétent (notaire, avocat fiscaliste, expert-comptable, CGP). Le produit refuse par conception de conclure seul.",
  },
  {
    title: "Données de démonstration",
    body: "Les dossiers, comptes agrégés et balances comptables sont des fixtures. Aucune donnée bancaire réelle n'est collectée ; aucun connecteur externe n'est actif sans variable d'environnement explicite.",
  },
  {
    title: "Disponibilité",
    body: "Service de démonstration fourni « en l'état », sans engagement de disponibilité ni de conservation des données saisies dans le navigateur.",
  },
  {
    title: "Responsabilité",
    body: "L'éditeur ne saurait être tenu responsable d'une décision patrimoniale prise sur la seule foi des simulations : les barèmes évoluent et chaque règle affiche sa version et sa source.",
  },
];

export default function CguPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero as="h1" eyebrow="Informations légales" title="Conditions générales d'utilisation" lead="Usage pédagogique : simulations indicatives, revue professionnelle obligatoire." />
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
