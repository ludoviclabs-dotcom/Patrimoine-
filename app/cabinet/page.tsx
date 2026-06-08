import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";
import { CabinetHomeV26 } from "@/components/v2-6/cabinet-refonte";

export default function CabinetPage() {
  return (
    <AppShell>
      <div className="space-y-10">
        <PageHero
          as="h1"
          eyebrow="Cockpit cabinet"
          title="Accueil cabinet"
          lead="Un parcours testable en quelques minutes : ouvrir le dossier, simuler le bon scénario, vérifier les preuves, passer en revue humaine, puis préparer le rapport."
        />
        <CabinetHomeV26 />
      </div>
    </AppShell>
  );
}
