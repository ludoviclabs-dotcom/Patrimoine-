# V1.2 Security, Workflow, Evidence

Cette iteration traite les priorites 2 a 5 sans brancher les connecteurs externes.
Postgres, Blob et auth provider restent le prochain lot, mais les contrats sont prets.

## Priorite 2 - Securite cabinet

- Isolation tenant/cabinet/client renforcee dans `lib/security/access-control.ts`.
- Le client ne voit que son dossier rattache via `clientUserId`.
- Les roles cabinet sont separes : admin, conseiller, expert, client.
- L'admin evidence est limite a admin/expert.
- Les documents sont prives par defaut : `allowPublicUrl=false`.
- Le cron refuse la production si `CRON_SECRET` n'est pas configure.
- L'audit a un contrat insert-only via `lib/audit/repository.ts`.

## Priorite 3 - Workflow metier reel

Routes demo :

- `POST /api/v1/cases`
- `PATCH /api/v1/cases`
- `POST /api/v1/assets`
- `POST /api/v1/liabilities`
- `POST /api/v1/simulations`
- `POST /api/v1/simulation-replays`
- `POST /api/v1/review-decisions`
- `POST /api/v1/report-versions`

La page `/workflow` montre le flux complet : dossier, saisie actifs/passifs,
simulation persistable, replay, revue expert et rapport versionne.

## Priorite 4 - Evidence Center reel controle

- `lib/evidence/source-control.ts` calcule un hash SHA-256 de contenu.
- `EVIDENCE_LIVE_CHECKS=enabled` active le fetch controle des URLs officielles.
- Par defaut, le controle reste fixture-driven pour une demo stable.
- `GET /api/v1/source-control` retourne resultats, alertes et recommandations.
- `GET /api/v1/rule-diffs` retourne l'impact dossiers avant recalcul.
- `/admin/evidence` expose le poste admin regles/sources.

## Priorite 5 - Produit pilote

- 3 cas de demo cabinet propres.
- Script commercial 7 minutes.
- Plan de deck court.
- Mentions RGPD, mandat, limites et non-conseil.
- Page `/pilot` pour presenter le pack.

## Ce qui reste externe

- Brancher `DATABASE_URL` et appliquer les migrations.
- Brancher Blob prive avec `BLOB_READ_WRITE_TOKEN`.
- Ajouter auth provider.
- Configurer `CRON_SECRET` en production Vercel.
