# V1 Cabinet Pilot

## Objectif

La V1 ajoute les fondations d'un pilote cabinet sans activer d'IA runtime :
tenancy, roles, dossiers, documents, audit append-only, revue humaine,
schema Postgres/Drizzle et registre de conformite.

## Runtime

Le projet reste deployable sans secret. Si `DATABASE_URL` est absent,
l'application utilise les fixtures V1. Si `BLOB_READ_WRITE_TOKEN` est absent,
l'interface documentaire reste en mode metadata-only demo.

## Donnees

Le schema Drizzle couvre les tables suivantes :

- tenants, users, clients, households
- assets, liabilities
- client_cases, documents
- simulation_runs, calculation_steps
- evidence_sources, rule_versions
- professional_reviews, audit_logs
- consents, dpia_records

La migration de reference est `drizzle/0000_v1_foundation.sql`.

## Regles produit

- Toute donnee applicative doit porter `tenantId`.
- Les roles de revue sont limites a `admin` et `expert`.
- Les conclusions restent `indicative` ou `needs_review` tant qu'une revue
  professionnelle n'est pas approuvee.
- L'audit est append-only : aucune edition retroactive.
- L'IA future ne calcule pas et ne valide pas. Elle explique, qualifie et aide
  a rediger sous controle humain.
