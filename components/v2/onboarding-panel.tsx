"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type OnboardingResult = {
  input: {
    householdName: string;
    matrimonialRegime: string;
    children: number;
    fiscalResidence: string;
    primaryGoal: string;
    horizon: string;
    professionalToConsult: string;
  };
  clientCase: { id: string; title: string; status: string };
  nextActions: string[];
};

export function OnboardingPanel() {
  const [householdName, setHouseholdName] = useState("Famille dirigeante exemple");
  const [primaryGoal, setPrimaryGoal] = useState("Préparer une transmission");
  const [result, setResult] = useState<OnboardingResult | null>(null);

  async function submit() {
    const response = await fetch("/api/v1/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-role": "conseiller" },
      body: JSON.stringify({
        householdName,
        primaryGoal,
        matrimonialRegime: "À confirmer",
        fiscalResidence: "France",
        children: 2,
        horizon: "6-24 mois",
        professionalToConsult: "cgp",
      }),
    });
    const payload = (await response.json()) as { data: OnboardingResult };
    setResult(payload.data);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Onboarding 90 secondes</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Foyer, régime matrimonial, enfants, résidence fiscale, actifs clés et professionnel
            à consulter.
          </p>
        </div>
        <ClipboardList className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
      </CardHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-foreground">
          Nom du foyer
          <input
            value={householdName}
            onChange={(event) => setHouseholdName(event.target.value)}
            className="h-11 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-foreground">
          Objectif principal
          <select
            value={primaryGoal}
            onChange={(event) => setPrimaryGoal(event.target.value)}
            className="h-11 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option>Préparer une transmission</option>
            <option>Vérifier l&apos;IFI</option>
            <option>Préparer une cession d&apos;entreprise</option>
            <option>Générer un dossier cabinet</option>
          </select>
        </label>
      </div>
      <Button type="button" className="mt-4" onClick={submit}>
        Créer le dossier depuis l&apos;onboarding
      </Button>

      {result ? (
        <div className="mt-5 rounded-lg border border-border bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-semibold text-foreground">{result.clientCase.title}</p>
      <p className="mt-1 text-sm text-muted">Statut : {result.clientCase.status}</p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
            {result.nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
