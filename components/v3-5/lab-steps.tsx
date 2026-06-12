import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import { JourneyStepper } from "@/components/ui/journey-stepper";

/**
 * Parcours progressif du laboratoire — divulgation par étapes.
 * Pur enrobage de navigation (ancres) : Données connues → Hypothèses →
 * Résultat indicatif → Preuves → Revue humaine. Les contenus restent les
 * composants existants du labo ; aucune fonction de calcul n'est touchée.
 */
export function LabSteps() {
  return (
    <Card elevated>
      <CardEyebrow>Simulation progressive</CardEyebrow>
      <CardTitle className="mt-1">Cinq étapes, du connu vers la revue humaine</CardTitle>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        Commencez par ce que vous savez ; les hypothèses, le résultat, les preuves et la revue
        professionnelle se révèlent dans l&apos;ordre — jamais tout en même temps.
      </p>
      <div className="mt-7">
        <JourneyStepper
          current={0}
          steps={[
            { label: "Données connues", caption: "prix, dates, montants", href: "#donnees" },
            { label: "Hypothèses", caption: "options et cas retenus", href: "#hypotheses" },
            { label: "Résultat indicatif", caption: "montant et statut", href: "#resultat" },
            { label: "Preuves", caption: "règle, source, version", href: "#preuves" },
            { label: "Revue humaine", caption: "qui valide quoi", href: "#revue" },
          ]}
        />
      </div>
    </Card>
  );
}
