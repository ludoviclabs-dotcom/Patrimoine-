import { UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { DemoPersona } from "@/lib/types";

export function PersonaLibrary({ personas }: { personas: DemoPersona[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Bibliotheque de personas demo</CardTitle>
          <p className="mt-1 text-sm text-muted">Cas fictifs prets pour rendez-vous cabinet.</p>
        </div>
        <UsersRound className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        {personas.map((persona) => (
          <div key={persona.id} className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold text-foreground">{persona.name}</p>
            <p className="mt-1 text-sm text-muted">{persona.profile}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{persona.demoObjective}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {persona.suggestedScenarios.slice(0, 3).map((scenario) => (
                <Badge key={scenario} tone="teal">
                  {scenario}
                </Badge>
              ))}
            </div>
            <p className="mt-3 font-mono text-xs text-muted">Rapport exemple : {persona.sampleReportId}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
