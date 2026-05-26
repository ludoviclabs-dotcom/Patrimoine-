import { Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const pilotCases = [
  "Dirigeant PME : transmission, Dutreil, apport-cession",
  "Couple seuil IFI : décote, dettes, résidence principale",
  "Entrepreneur cession : holding patrimoniale, réallocation, rapport",
];

const deckSlides = [
  "Problème cabinet",
  "Fiscalité LF 2026",
  "Moteur sourcé",
  "Workflow dossier",
  "Rapport client",
  "Sécurité et audit",
  "Démo 7 minutes",
  "Pilote cabinet",
];

export function GoToMarketPanel() {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cas pilote ultra propres</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Trois histoires de vente pour tester la clarté, les objections et la volonté de payer.
            </p>
          </div>
          <Presentation className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="space-y-3">
          {pilotCases.map((pilotCase) => (
            <div key={pilotCase} className="rounded-lg border border-border p-3 text-sm font-semibold text-foreground">
              {pilotCase}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Deck et pricing test</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Positionnement cabinet, sans chiffres de marché non vérifiés dans la copy publique.
            </p>
          </div>
          <Badge tone="teal">Pilote 1-3 cabinets</Badge>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {deckSlides.map((slide) => (
            <Badge key={slide} tone="neutral">
              {slide}
            </Badge>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Price label="Solo" value="99 €/mois" />
          <Price label="Cabinet" value="199 €/mois/utilisateur" />
          <Price label="Groupement" value="Sur devis" />
        </div>
      </Card>
    </section>
  );
}

function Price({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-soft)] p-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted">{value}</p>
    </div>
  );
}
