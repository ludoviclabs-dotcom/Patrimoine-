# V1.1 Trust Layer

La V1.1 transforme le socle cabinet en demonstrateur de confiance vendable.
Elle ne branche pas encore de donnees reelles, d'auth provider ou d'IA runtime.

## Intentions produit

- Afficher chaque resultat comme simulation indicative ou point a valider.
- Separer calcul, explication, suggestion et validation professionnelle.
- Rendre les limites de couverture visibles dans l'interface.
- Conserver un mode demo sans secret obligatoire et sans donnees personnelles reelles.

## Surfaces ajoutees

- `/cabinet` : completude, data quality, radar, timeline, limites et watcher.
- `/client` : completude et data quality visibles cote client.
- `/simulations` : panneau "Pourquoi ce resultat ?" et limites IFI.
- `/scenarios` : comparateur 5 options, radar, timeline et meeting briefs.
- `/evidence` : filtres, snapshots, regles liees, diff de regles, watcher.
- `/report` : rapport cabinet enrichi avec sources, limites, statut non valide et scenarios.

## API demo

Toutes les routes restent fixture-driven et tenant-scoped :

- `GET /api/v1/completeness`
- `GET /api/v1/coverage`
- `GET /api/v1/source-snapshots`
- `GET /api/v1/scenario-comparisons`
- `GET /api/v1/personas`
- `GET /api/cron/source-watch`

## Cron

`vercel.json` declare un cron quotidien UTC :

```json
{
  "path": "/api/cron/source-watch",
  "schedule": "0 6 * * *"
}
```

Le watcher respecte `CRON_SECRET` si la variable existe. En mode demo, il compare
les hashes fixtures et ne scrape pas les sites officiels.

## Tests

Les tests V1.1 couvrent :

- completude Claire/Marc a 72 % ;
- data quality sur donnees critiques ;
- statuts de fiabilite et coverage limits sur chaque etape IFI ;
- coverage IFI couvert, partiel et non couvert ;
- comparateur 5 scenarios ;
- watcher sans mutation destructive ;
- snapshots relies a sources et regles existantes ;
- 7 personas fictifs.
