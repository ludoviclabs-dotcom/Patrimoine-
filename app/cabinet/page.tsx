import { AppShell } from "@/components/app-shell";
import { PageHero } from "@/components/ui/page-hero";
import { CabinetHomeV26 } from "@/components/v2-6/cabinet-refonte";
import { FiscalAlertsPanel } from "@/components/v3-3/fiscal-alerts-panel";
import { getFiscalAlerts } from "@/lib/alerts/fiscal-alerts";

export default function CabinetPage() {
  const fiscalAlerts = getFiscalAlerts();

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
        <FiscalAlertsPanel alerts={fiscalAlerts} />
      </div>
    </AppShell>
  );
}
