import { AppShell } from "@/components/app-shell";
import { CabinetHomeV26 } from "@/components/v2-6/cabinet-refonte";

export default function CabinetPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section className="rounded-lg border border-border bg-white p-6 shadow-[var(--shadow)]">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold tracking-[-0.01em] text-foreground">
              Accueil cabinet
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              Un parcours testable en quelques minutes : ouvrir le dossier, simuler le bon
              scénario, vérifier les preuves, passer en revue humaine, puis préparer le rapport.
            </p>
          </div>
        </section>

        <CabinetHomeV26 />
      </div>
    </AppShell>
  );
}
