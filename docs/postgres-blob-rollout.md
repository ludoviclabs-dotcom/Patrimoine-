# Rollout Postgres Et Blob

## Postgres

1. Creer une base Postgres via Vercel Marketplace, Neon ou Supabase.
2. Ajouter `DATABASE_URL` dans Vercel.
3. Executer `npm run db:push` ou appliquer `drizzle/0000_v1_foundation.sql`.
4. Migrer les fixtures de `lib/demo-data/v1.ts` en seeds.
5. Remplacer les lectures fixtures par des repositories tenant-scoped.

## Blob prive

1. Activer Vercel Blob.
2. Ajouter `BLOB_READ_WRITE_TOKEN`.
3. Stocker les pieces sous `tenants/{tenantId}/cases/{caseId}/documents/{documentId}`.
4. Ne jamais exposer un chemin Blob sans controle de tenant et role.
5. Journaliser chaque depot, lecture, export ou suppression.

## Auth

Le code prepare les roles `admin`, `conseiller`, `expert`, `client`. Le provider
reste a choisir entre Clerk, Auth.js ou Supabase Auth. La regle d'integration est
simple : la session doit produire `userId`, `tenantId` et `role`.
