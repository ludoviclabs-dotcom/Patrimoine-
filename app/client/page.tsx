import { AppShell } from "@/components/app-shell";
import { DocumentChecklist } from "@/components/document-checklist";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientPortalPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground">Portail client</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Vue pilote pour collecter les pièces, afficher les consentements et rappeler les droits
            d&apos;export ou suppression des données.
          </p>
        </section>
        <DocumentChecklist />
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Droits client</CardTitle>
              <p className="mt-1 text-sm text-muted">Export et suppression sont prévus avant données réelles.</p>
            </div>
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">Export dossier</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Prévu en JSON/PDF avec calculs, sources, pièces et journal de revue.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">Suppression / archivage</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Demande tracée en audit, arbitrée selon mandat, obligations légales et preuve de revue.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
