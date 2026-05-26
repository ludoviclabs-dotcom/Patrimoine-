import { AppShell } from "@/components/app-shell";
import { ComplianceBoard } from "@/components/compliance-board";

export default function CompliancePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Conformité RGPD / AI Act</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Registre de traitements, AIPD pilote, politique de conservation et garde-fous IA avant
            activation d&apos;un assistant runtime.
          </p>
        </section>
        <ComplianceBoard />
      </div>
    </AppShell>
  );
}
