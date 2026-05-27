# V2.1 sans connecteurs externes

Objectif : livrer tout ce qui renforce le pilote cabinet sans brancher Postgres, Blob, auth provider, signature électronique, scraping live ou connecteur bancaire.

## Ce qui est livré

- Contrat repository fixture-compatible via `lib/repositories/pilot-readiness.ts`.
- Migration Postgres-ready `drizzle/0002_v2_1_pilot_readiness.sql`.
- Plan de seed non exécuté `lib/db/seed-v2-1.ts`.
- Export RGPD JSON en mode démo via `/api/v1/data-export`.
- Demande de suppression mise en revue via `/api/v1/data-deletion`.
- Métadonnées documentaires privées via `/api/v1/documents/private-metadata`.
- Golden cases fiscaux via `/api/v1/golden-cases`.
- Contrôle offline de snapshots de preuves via `/api/v1/evidence/offline-control`.
- État de préparation repository via `/api/v1/repository-readiness`.
- Panneaux UI visibles sur `/cabinet` et `/evidence`.

## Contrats de sécurité

- Les documents restent privés par construction : `visibility=private`, `allowPublicUrl=false`.
- Les demandes de suppression restent en revue professionnelle pour préserver audit, mission et obligations cabinet.
- `audit_logs` reste append-only : insertion autorisée, update/delete interdits.
- Les tables V2.1 sont prêtes pour Postgres, mais l'application continue de fonctionner sans `DATABASE_URL`.

## Hors périmètre conservé

- Pas de vrai stockage Blob.
- Pas d'auth provider.
- Pas de données bancaires.
- Pas de signature électronique.
- Pas de scraping live obligatoire.
- Pas d'IA runtime.

## APIs démo ajoutées

```txt
GET  /api/v1/repository-readiness
GET  /api/v1/data-export
POST /api/v1/data-deletion
GET  /api/v1/documents/private-metadata
POST /api/v1/documents/private-metadata
GET  /api/v1/golden-cases
POST /api/v1/golden-cases
GET  /api/v1/evidence/offline-control
```

Réponse standard : `mode`, `tenantId`, `generatedAt`, `data`.

## Prochain jalon connector-ready

Quand les connecteurs seront autorisés, brancher dans cet ordre :

1. `DATABASE_URL` et migration Drizzle.
2. Auth provider et mapping rôles réels.
3. Blob privé pour pièces documentaires.
4. Signature électronique.
5. Contrôles live de sources officielles.
