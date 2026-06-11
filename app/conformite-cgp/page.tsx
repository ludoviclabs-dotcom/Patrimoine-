import { AppShell } from "@/components/app-shell";
import { LegalNotice } from "@/components/legal-notice";
import { PageHero } from "@/components/ui/page-hero";
import { ConformiteWorkspace } from "@/components/v3-4/conformite-workspace";

export default function ConformiteCgpPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <PageHero
          as="h1"
          eyebrow="Conformité CGP"
          title="Documents réglementaires"
          lead="DER, lettre de mission, questionnaire KYC avec déclaration d'adéquation, scoring LCB-FT et signature simulée. Chaque document est hashé, validé champ par champ et bloqué s'il est incomplet."
        />
        <ConformiteWorkspace />
        <LegalNotice compact />
      </div>
    </AppShell>
  );
}
