# Patrimoine Fiscal Demo

Demonstrateur evidence-first pour une plateforme patrimoniale et fiscale francaise.

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
- Drizzle ORM + schema Postgres V1/V1.1
- Vercel Blob adapter pret a brancher pour pieces privees
- Fixtures TypeScript pour le mode demo
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

## Parcours demo

- `/dashboard` : synthese patrimoniale Claire et Marc.
- `/cabinet` : cockpit cabinet V1.1 avec completude, data quality, radar, timeline, coverage limits et watcher.
- `/client` : collecte documentaire, completude, data quality, consentements et droits client.
- `/simulations` : IFI simplifie, transmission, facturation electronique et panneau "Pourquoi ce resultat ?".
- `/scenarios` : comparateur 5 scenarios, radar de vigilance, timeline et checklist rendez-vous.
- `/evidence` : sources officielles enrichies, snapshots, regles versionnees, diff de regles et watcher.
- `/review` : validation humaine et audit append-only.
- `/report` : rapport professionnel enrichi / export PDF via navigateur.
- `/compliance` : registre RGPD, AIPD pilote et gouvernance IA runtime desactivee.

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

## Couche V1.1 ajoutee

- Score de completude dossier Claire/Marc : 72 %, avec manquants explicites.
- Data quality status sur actifs, passifs et documents critiques.
- Badges de fiabilite sur les resultats et `calculation_steps` enrichies.
- Limites de couverture visibles : couvert, partiel, non couvert V1.
- Evidence Center enrichi : sourceVersion, verifiedAt, contentHash, resume, regles liees.
- Source snapshots et watcher demo via `/api/cron/source-watch`.
- Comparateur 5 scenarios, radar de vigilance, timeline patrimoniale.
- 7 personas fictifs et checklists rendez-vous cabinet.
- `vercel.json` avec cron quotidien vers `/api/cron/source-watch`.
- Routes API demo : completeness, coverage, source-snapshots, scenario-comparisons, personas.

## Prochaine etape

Brancher un provider Postgres Marketplace, choisir le provider auth, configurer
Vercel Blob prive, puis remplacer progressivement les fixtures V1 par les
repositories Postgres.
