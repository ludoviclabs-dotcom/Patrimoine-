import { AppShell } from "@/components/app-shell";
import { LegalNotice } from "@/components/legal-notice";
import { Reveal } from "@/components/motion";
import { PageHero } from "@/components/ui/page-hero";
import { SciSnapshotPanel, TrialBalancePanel } from "@/components/v3-2/compta-sci-panels";
import { FecImportSimule } from "@/components/v3-2/fec-import-simule";
import { buildSciSnapshot } from "@/lib/compta/sci-accounting";
import { getPennylaneClient } from "@/lib/integrations/pennylane";

export default async function ComptabiliteSciPage() {
  const pennylane = getPennylaneClient();
  const [trialBalance, journals] = await Promise.all([
    pennylane.fetchTrialBalance("case-claire-marc-2026"),
    pennylane.fetchJournalSummary("case-claire-marc-2026"),
  ]);
  const snapshot = buildSciSnapshot(trialBalance);

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Comptabilité SCI"
          title="Brique comptable SCI"
          lead="Balance Pennylane simulée, classification 2072/2072-IS et import FEC pédagogique. Mapping indicatif : aucune liasse n'est déposable sans revue de l'expert-comptable."
        />

        <Reveal>
          <TrialBalancePanel lines={trialBalance} journals={journals} />
        </Reveal>

        <Reveal>
          <SciSnapshotPanel snapshot={snapshot} />
        </Reveal>

        <Reveal>
          <FecImportSimule />
        </Reveal>

        <LegalNotice compact />
      </div>
    </AppShell>
  );
}
