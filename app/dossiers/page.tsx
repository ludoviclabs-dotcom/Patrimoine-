import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";
import { DossierWorkspaceV26, LifeEventRail } from "@/components/v2-6/cabinet-refonte";
import { FiscalCalendar } from "@/components/v3-3/fiscal-calendar";
import { RecommendationsTracker } from "@/components/v3-3/recommendations-tracker";

export default function DossiersPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Espace dossier"
          title="Dossiers"
          lead="Le cabinet pilote ses dossiers par objectifs client, documents attendus, simulations utiles, preuves et revue professionnelle."
        />
        <DossierWorkspaceV26 />
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <RecommendationsTracker />
          <FiscalCalendar />
        </section>
        <LifeEventRail />
      </div>
    </AppShell>
  );
}
