import { Database, FileArchive, FileLock2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPrivateDocumentMetadataFixture,
  getRepositoryReadinessReport,
  getRetentionPolicy,
} from "@/lib/repositories/pilot-readiness";

export function PilotReadinessPanel() {
  const readiness = getRepositoryReadinessReport();
  const retention = getRetentionPolicy();
  const privateDocument = getPrivateDocumentMetadataFixture();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">V2.1 sans connecteurs externes</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Cette couche rend le pilote cabinet exploitable en mode fixtures : contrats de persistance,
          export RGPD, suppression contrôlée, métadonnées documentaires privées et tables prêtes
          pour Postgres, sans dépendre de Postgres, Blob ou auth provider au runtime.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Contrat repository</CardTitle>
              <p className="mt-1 text-sm text-muted">Lecture démo, cible Postgres, isolation tenant explicite.</p>
            </div>
            <Database className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{readiness.mode}</Badge>
            <Badge tone="success">safeWithoutConnectors</Badge>
            <Badge>{readiness.persistenceTarget}</Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {readiness.tablesReady.map((table) => (
              <span key={table} className="rounded-lg border border-border bg-[var(--surface-soft)] px-3 py-2 font-mono text-xs text-muted">
                {table}
              </span>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Politique RGPD pilote</CardTitle>
                <p className="mt-1 text-sm text-muted">Export et suppression disponibles sans connecteur.</p>
              </div>
              <FileArchive className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
            </CardHeader>
            <div className="grid gap-3 text-sm leading-6 text-muted">
              <p>Données personnelles : {retention.personalDataMonths} mois</p>
              <p>Audit : {retention.auditLogYears} ans</p>
              <p>Documents : {retention.documentRetentionYears} ans</p>
              <p>Suppression : revue professionnelle requise</p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Documents privés</CardTitle>
                <p className="mt-1 text-sm text-muted">Métadonnées seulement, aucun fichier public.</p>
              </div>
              <FileLock2 className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{privateDocument.visibility}</Badge>
              <Badge tone="danger">publicUrl: false</Badge>
              <Badge>{privateDocument.storageProvider}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{privateDocument.expectedAction}</p>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Connecteurs exclus de cette itération</CardTitle>
            <p className="mt-1 text-sm text-muted">Ils restent prêts à brancher, mais non nécessaires à la V2.1.</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {readiness.externalConnectorsRequired.map((connector) => (
            <Badge key={connector} tone="warning">
              {connector}
            </Badge>
          ))}
          <Badge tone="warning">signature électronique</Badge>
          <Badge tone="warning">connecteur bancaire</Badge>
          <Badge tone="warning">scraping live</Badge>
        </div>
      </Card>
    </section>
  );
}
