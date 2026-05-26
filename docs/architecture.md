# Architecture V0

## Objectif

La V0 doit etre montrable en rendez-vous sans secret, sans cle API et sans
dependance a un service externe. Elle prouve la logique produit : calcul
deterministe, preuve officielle, statut indicatif et validation humaine.

## Couches

```txt
Next.js App Router
  app/dashboard
  app/simulations
  app/evidence
  app/report

Domain fixtures
  lib/demo-data
  lib/simulations
  lib/rules
  lib/evidence
  lib/report

Verification
  tests/unit
  tests/e2e
```

## Donnees

La V0 utilise des fixtures TypeScript :

- `demoHousehold` pour le foyer Claire et Marc ;
- `evidenceSources` pour les sources officielles ;
- `ruleVersions` pour les regles versionnees ;
- `calculateIfi` pour le golden case IFI.

Une migration future vers Postgres/Drizzle doit conserver les memes concepts :

- `households`
- `assets`
- `liabilities`
- `simulation_runs`
- `calculation_steps`
- `rule_versions`
- `evidence_sources`
- `audit_logs`

## Runtime IA

Aucun appel IA n'est present dans la V0. Les futurs adapters IA devront rester
hors du moteur de calcul :

```txt
LLM != source de verite
LLM != calculateur fiscal
LLM != validateur juridique
LLM = aide a la redaction et a l'explication, sous controle humain
```

## Deploiement

L'application est compatible Vercel avec `npm run build`. La V0 n'exige pas de
variable d'environnement.
