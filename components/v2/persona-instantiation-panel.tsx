"use client";

import { useState } from "react";
import { CheckCircle2, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { DemoPersona, PersonaInstantiation } from "@/lib/types";

export function PersonaInstantiationPanel({ personas }: { personas: DemoPersona[] }) {
  const [selected, setSelected] = useState<PersonaInstantiation | null>(null);

  async function instantiate(personaId: string) {
    const response = await fetch(`/api/v1/personas/${personaId}/instantiate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-role": "conseiller" },
    });
    const payload = (await response.json()) as { data: PersonaInstantiation };
    setSelected(payload.data);
  }

  return (
    <Card id="personas">
      <CardHeader>
        <div>
          <CardTitle>Personas instanciables</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Chaque cas crée un dossier de démonstration avec objectifs, documents manquants
            et scénarios suggérés.
          </p>
        </div>
        <UsersRound className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {personas.map((persona) => (
          <div key={persona.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{persona.name}</p>
                <p className="mt-1 text-sm leading-5 text-muted">{persona.profile}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => instantiate(persona.id)}>
                Instancier
              </Button>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{persona.demoObjective}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {persona.suggestedScenarios.slice(0, 3).map((scenario) => (
                <Badge key={scenario} tone="teal">
                  {scenario}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-emerald-950">Dossier créé en mode démo</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900">
                {selected.title} · snapshot {selected.dossierSnapshotId}
              </p>
              <p className="mt-1 text-sm leading-6 text-emerald-900">
                Documents manquants : {selected.missingDocuments.join(", ")}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
