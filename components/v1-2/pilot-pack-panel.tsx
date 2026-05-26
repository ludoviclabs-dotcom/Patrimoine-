import { Presentation, ScrollText, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  pilotDeckOutline,
  pilotDemoCases,
  rgpdNonAdviceNotices,
  sevenMinuteCommercialScript,
} from "@/lib/demo-data/pilot-cases";

export function PilotPackPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>3 cas pilote cabinet</CardTitle>
            <p className="mt-1 text-sm text-muted">Cas fictifs propres pour rendez-vous et test cabinet.</p>
          </div>
          <UsersRound className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="grid gap-4 lg:grid-cols-3">
          {pilotDemoCases.map((pilotCase) => (
            <div key={pilotCase.id} className="rounded-lg border border-border p-4">
              <Badge tone="teal">{pilotCase.audience}</Badge>
              <p className="mt-3 text-sm font-semibold text-foreground">{pilotCase.name}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{pilotCase.promise}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pilotCase.proofPoints.map((point) => (
                  <Badge key={point}>{point}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Script commercial 7 minutes</CardTitle>
              <p className="mt-1 text-sm text-muted">Parcours court et repetable.</p>
            </div>
            <ScrollText className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="space-y-3">
            {sevenMinuteCommercialScript.map((step) => (
              <div key={step.minute} className="rounded-lg border border-border p-4">
                <p className="font-mono text-xs text-muted">{step.minute}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{step.line}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Deck court</CardTitle>
                <p className="mt-1 text-sm text-muted">Plan de presentation pilote.</p>
              </div>
              <Presentation className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
            </CardHeader>
            <ol className="space-y-3 text-sm leading-6 text-muted">
              {pilotDeckOutline.map((slide, index) => (
                <li key={slide}>
                  {index + 1}. {slide}
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Mentions RGPD / non-conseil</CardTitle>
                <p className="mt-1 text-sm text-muted">Texte a reprendre dans mandat et demo.</p>
              </div>
            </CardHeader>
            <ul className="space-y-3 text-sm leading-6 text-muted">
              {rgpdNonAdviceNotices.map((notice) => (
                <li key={notice} className="rounded-lg border border-border p-3">
                  {notice}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </div>
  );
}
