# Patrimoine Fiscal Demo

V0 demonstrateur evidence-first pour une plateforme patrimoniale et fiscale francaise.

La promesse du produit est volontairement stricte :

- chaque chiffre est explicable ;
- chaque regle est versionnee ;
- chaque conclusion est indicative et validable par un professionnel habilite ;
- aucun appel OpenAI API ou IA generative n'est effectue au runtime.

## Stack

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- Composants UI locaux inspires de shadcn/ui
- Drizzle ORM + schema Postgres V1
- Vercel Blob adapter pret a brancher pour pieces privees
- Fixtures TypeScript pour la V0
- Vitest pour les golden cases
- Playwright pour le parcours demo

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Checks

```bash
npm run lint
npm test
npm run build
```

Le test e2e peut etre lance avec :

```bash
npm run e2e
```

## Parcours V0

- `/dashboard` : synthese patrimoniale Claire et Marc.
- `/cabinet` : portail cabinet V1 avec tenant, roles, dossiers et moteurs avances.
- `/client` : collecte documentaire, consentements et droits client.
- `/simulations` : IFI simplifie, transmission, facturation electronique.
- `/evidence` : sources officielles et regles versionnees.
- `/review` : validation humaine et audit append-only.
- `/report` : rapport imprimable / export PDF via navigateur.
- `/compliance` : registre RGPD, AIPD pilote et gouvernance IA.

## Donnees demo

Persona : Claire et Marc, dirigeants d'une PME, deux enfants.

- Patrimoine brut : 3 840 000 EUR
- Dettes : 420 000 EUR
- Patrimoine net : 3 420 000 EUR
- Liquidites : 220 000 EUR
- Base IFI simplifiee : 1 110 000 EUR

## Hors perimetre V0

- Pas d'authentification provider reelle tant que Clerk/Auth.js n'est pas choisi.
- Pas de donnees clients reelles avant configuration Postgres + Blob + mandat/consentement.
- Pas de conseil fiscal ou juridique opposable.
- Pas de chatbot LLM.
- Pas de base Postgres obligatoire au runtime demo.
- Pas de paiement, upload documentaire ou signature.

## Socle V1 ajoute

- Schema Drizzle : tenants, users, clients, households, assets, liabilities, documents,
  simulation_runs, calculation_steps, rule_versions, evidence_sources, audit_logs,
  consents, dpia_records.
- Fixtures V1 tenant-scoped pour cabinet, client, documents, revue et audit.
- Controle d'acces par tenant et role : admin, conseiller, expert, client.
- Moteurs additionnels indicatifs : donation demembree, plus-value immobiliere,
  arbitrage SCI.
- Registre RGPD, AIPD pilote, politique de conservation et garde-fous IA.

## Prochaine etape

Brancher un provider Postgres Marketplace, choisir le provider auth, configurer
Vercel Blob prive, puis remplacer progressivement les fixtures V1 par les
repositories Postgres.
