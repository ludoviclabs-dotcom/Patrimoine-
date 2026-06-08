import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";
import { DossierWorkspaceV26, LifeEventRail } from "@/components/v2-6/cabinet-refonte";

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
        <LifeEventRail />
      </div>
    </AppShell>
  );
}
