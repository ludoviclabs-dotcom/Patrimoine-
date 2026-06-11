import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";

export const metadata = { title: "Mentions légales — patrimoine-fiscal-demo" };

const sections = [
  {
    title: "Éditeur",
    body: "Cabinet Démo Patrimoine (démonstration logicielle) — application pédagogique sans activité réglementée réelle. Contact : ludoviclabs@gmail.com.",
  },
  {
    title: "Statuts professionnels (démo)",
    body: "Le cabinet fictif est présenté comme CIF (membre CNCGP, n° ORIAS fictif 26001234) et IAS. Aucune immatriculation réelle : tout document généré porte la mention « démo, non opposable ».",
  },
  {
    title: "Hébergement",
    body: "Application Next.js hébergée sur Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — données de démonstration uniquement.",
  },
  {
    title: "Nature des contenus",
    body: "Les simulations sont indicatives, fondées sur des règles versionnées et des sources officielles hashées. Elles ne constituent ni un conseil fiscal, ni un conseil juridique, ni une recommandation d'investissement.",
  },
  {
    title: "Propriété intellectuelle",
    body: "Code et contenus de démonstration. Les textes officiels cités (Légifrance, BOFiP, service-public.fr) restent soumis à leurs licences respectives.",
  },
];

export default function MentionsLegalesPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero as="h1" eyebrow="Informations légales" title="Mentions légales" lead="Application de démonstration : aucune activité de conseil réelle n'est exercée." />
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
