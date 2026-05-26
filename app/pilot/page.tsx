import { AppShell } from "@/components/app-shell";
import { PilotPackPanel } from "@/components/v1-2/pilot-pack-panel";
import { GoToMarketPanel } from "@/components/v2/go-to-market-panel";

export default function PilotPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Produit pilote</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Pack de lancement pour tester avec un cabinet : cas fictifs, script 7 minutes, deck et
            mentions RGPD / non-conseil.
          </p>
        </section>
        <GoToMarketPanel />
        <PilotPackPanel />
      </div>
    </AppShell>
  );
}
