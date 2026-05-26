import { AppShell } from "@/components/app-shell";
import { MeetingBrief } from "@/components/v1-1/meeting-brief";
import { PatrimonialTimeline } from "@/components/v1-1/patrimonial-timeline";
import { RiskRadar } from "@/components/v1-1/risk-radar";
import { ScenarioComparator } from "@/components/v1-1/scenario-comparator";
import {
  meetingBriefs,
  patrimonialTimeline,
  riskRadarItems,
  scenarioComparisons,
} from "@/lib/scenario-comparisons/comparisons";

export default function ScenariosPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Comparateur de scenarios</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Vue rendez-vous : arbitrages visibles, documents requis et validation humaine, sans
            recommandation automatique.
          </p>
        </section>
        <ScenarioComparator scenarios={scenarioComparisons} />
        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <RiskRadar items={riskRadarItems} />
          <PatrimonialTimeline events={patrimonialTimeline} />
        </section>
        <MeetingBrief briefs={meetingBriefs} />
      </div>
    </AppShell>
  );
}
