import { AppShell } from "@/components/app-shell";
import { LivingDossierPanel } from "@/components/v2/living-dossier";
import { OnboardingPanel } from "@/components/v2/onboarding-panel";
import { PersonaInstantiationPanel } from "@/components/v2/persona-instantiation-panel";
import { Dossier360Map, LifeEventPlaybooks } from "@/components/v2-4/life-event-playbooks";
import { demoPersonas } from "@/lib/demo-data/personas";
import { getLivingDossier } from "@/lib/dossiers/v2-dossiers";

export default function DossiersPage() {
  const dossier = getLivingDossier();

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Dossiers cabinet</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Créer un dossier, instancier un persona, structurer les enveloppes fiscales et
            rejouer les simulations depuis un snapshot de preuve.
          </p>
        </section>

        <LifeEventPlaybooks />
        <Dossier360Map />
        <OnboardingPanel />
        <PersonaInstantiationPanel personas={demoPersonas} />
        <LivingDossierPanel dossier={dossier} />
      </div>
    </AppShell>
  );
}
