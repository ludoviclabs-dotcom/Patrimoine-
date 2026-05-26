import { Database, FolderKanban, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { demoCases, demoClients, demoTenant, demoUsers, getDocumentCompletion } from "@/lib/demo-data/v1";
import { getBlobStorageStatus } from "@/lib/documents/blob";
import { formatEuro } from "@/lib/format";
import { isDatabaseConfigured } from "@/lib/db/client";
import { demoHousehold } from "@/lib/demo-data/household";
import { getNetWealth } from "@/lib/demo-data/metrics";

const statusLabels = {
  draft: "Brouillon",
  simulation_indicative: "Simulation indicative",
  review_required: "Revue requise",
  validated_by_professional: "Validé professionnel",
  archived: "Archivé",
} as const;

export function V1StatusBoard() {
  const completion = getDocumentCompletion();
  const blob = getBlobStorageStatus();
  const dbConfigured = isDatabaseConfigured();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <CardHeader className="mb-3">
            <CardTitle>Tenant pilote</CardTitle>
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <p className="text-2xl font-semibold text-foreground">{demoTenant.name}</p>
          <p className="mt-2 text-sm text-muted">Region data : {demoTenant.dataRegion.toUpperCase()}</p>
        </Card>
        <Card className="p-4">
          <CardHeader className="mb-3">
            <CardTitle>Utilisateurs</CardTitle>
            <UsersRound className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <p className="text-2xl font-semibold text-foreground">{demoUsers.length} rôles</p>
          <p className="mt-2 text-sm text-muted">admin, conseiller, expert, client</p>
        </Card>
        <Card className="p-4">
          <CardHeader className="mb-3">
            <CardTitle>Pièces</CardTitle>
            <FolderKanban className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <p className="text-2xl font-semibold text-foreground">
            {completion.received}/{completion.required}
          </p>
          <p className="mt-2 text-sm text-muted">{completion.missing} manquantes</p>
        </Card>
        <Card className="p-4">
          <CardHeader className="mb-3">
            <CardTitle>Stockage</CardTitle>
            <Database className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <p className="text-2xl font-semibold text-foreground">{dbConfigured ? "Postgres" : "Fixtures"}</p>
          <p className="mt-2 text-sm text-muted">
            Blob : {blob.configured ? "prêt" : "token manquant"}
          </p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Portefeuille cabinet</CardTitle>
              <p className="mt-1 text-sm text-muted">Dossiers réels demain, données fictives en pilote.</p>
            </div>
            <LockKeyhole className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-3">
            {demoClients.map((client) => {
              const clientCase = demoCases.find((candidate) => candidate.clientId === client.id);

              return (
                <div
                  key={client.id}
                  className="grid gap-3 rounded-lg border border-border p-4 lg:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{client.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {clientCase?.title} · patrimoine net {formatEuro(getNetWealth(demoHousehold))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">{client.riskLevel}</Badge>
                    {clientCase ? <Badge tone="teal">{statusLabels[clientCase.status]}</Badge> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Workflow mission</CardTitle>
              <p className="mt-1 text-sm text-muted">Ouverture dossier → preuve → revue.</p>
            </div>
          </CardHeader>
          <ol className="space-y-3 text-sm leading-6 text-muted">
            <li>1. Créer ou rattacher le foyer au tenant.</li>
            <li>2. Collecter les pièces et marquer les manquants.</li>
            <li>3. Lancer les simulations déterministes.</li>
            <li>4. Demander la revue expert si une conclusion est sensible.</li>
            <li>5. Produire le rapport seulement avec limites et sources.</li>
          </ol>
        </Card>
      </section>
    </div>
  );
}
