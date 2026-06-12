import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";
import { GuidedSimulationsHome } from "@/components/v3-5/guided-home";

type SimulationsPageProps = {
  searchParams?: Promise<{
    scenario?: string;
    from?: string;
  }>;
};

export default async function SimulationsPage({ searchParams }: SimulationsPageProps) {
  const params = (await searchParams) ?? {};

  // Back-compat : tous les liens profonds historiques (?scenario=…) pointent
  // désormais vers le laboratoire expert. Alias et scénarios inconnus passent
  // tels quels — le labo applique son repli (plus-value).
  if (params.scenario) {
    const labParams = new URLSearchParams({ scenario: params.scenario });
    if (params.from) labParams.set("from", params.from);
    redirect(`/simulations/lab?${labParams.toString()}`);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Entrée par intention"
          title="Simuler"
          lead="Partez de votre intention — vendre, transmettre, optimiser, auditer. Le produit propose les simulations pertinentes, les pièces à réunir et les points nécessitant une revue humaine, avant d'exposer les détails techniques."
        />
        <GuidedSimulationsHome />
      </div>
    </AppShell>
  );
}
