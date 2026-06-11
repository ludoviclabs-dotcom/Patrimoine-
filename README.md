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

- `/cabinet` : cockpit cabinet avec alertes fiscales chiffrees derivees des moteurs.
- `/dossiers` : dossier vivant, suivi des preconisations (CRM) et calendrier fiscal.
- `/dashboard` : synthese patrimoniale Claire et Marc, alertes calculees.
- `/client` : espace client simule (role restreint), comptes agreges Powens/DSP2 fixtures.
- `/workflow` : dossier, saisie actifs/passifs, simulation persistable, replay, revue et rapport versionne.
- `/simulations` : 20 moteurs deterministes — IFI, IR bareme 2026, PFU vs bareme, plus-value immobiliere v2 (forfaits 7,5/15 %), transmission DMTG multi-liens, demembrement art. 669, assurance-vie 990 I/757 B, Dutreil v3 (chainage DMTG), apport-cession, taxe holding, IS, SCI IR vs IS, exit tax, PEA, PER (plafonds 2026), succession, stress liquidite, adequation produit.
- `/comptabilite-sci` : balance Pennylane simulee, classification 2072/2065, import FEC pedagogique.
- `/conformite-cgp` : DER, lettre de mission, KYC -> declaration d'adequation, scoring LCB-FT, signature simulee (SES) et PDF natifs.
- `/atlas-fiscal` : atlas visuel statique, cartes de frictions fiscales et ventilation de 1 000 EUR de prelevements publics.
- `/scenarios` : comparateur de scenarios (estimations calculees par le moteur de projection), courbes 10 ans, radar, timeline fusionnee avec le calendrier fiscal.
- `/evidence` : sources officielles hashees, snapshots, regles versionnees, diffs de regles (PFU, PV immo, DMTG, Dutreil, PER, SCI) et watcher.
- `/admin/evidence` : controle des sources, hash, alertes et impact dossiers.
- `/review` : validation humaine et audit append-only.
- `/report` : rapport professionnel (print CSS durci, en-tete repete avec versions de regles).
- `/compliance` : registre RGPD, AIPD pilote et gouvernance IA runtime desactivee.
- `/pilot` : cas pilote, script commercial 7 minutes, deck et mentions non-conseil.
- `/mentions-legales`, `/cgu`, `/politique-confidentialite` : pages legales.

## Discipline des baremes (v3)

Chaque moteur porte une regle versionnee reliee a au moins une source officielle hashee.
Les baremes 2026 verifies en ligne (IR, decote, DMTG, art. 669, IS, exit tax, LFSS PS 18,6 %)
sont en regles `active` ; les parametres non reverifies a la source (2048-IMM, 990 I,
PASS/PER, liasses) restent en `draft`/`to-review` avec badge — le produit applique sa
propre discipline de preuve. Voir `docs/v3-socle-moteurs.md` et `docs/v3-3-gestion-client.md`.
Les integrations (Powens, Pennylane, signature) sont simulees et pretes a brancher :
la demo fonctionne sans aucune variable d'environnement.

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

## Couche V1.2 ajoutee

- Isolation tenant/cabinet/client renforcee, tests roles et politiques documentaires privees.
- `CRON_SECRET` requis en production pour `/api/cron/source-watch`.
- Contrat audit insert-only pret Postgres.
- Workflow metier demo via APIs : cases, assets, liabilities, simulations, replays,
  review decisions, report versions.
- Evidence control : hash SHA-256, fetch controle optionnel avec `EVIDENCE_LIVE_CHECKS=enabled`,
  alertes et diff de regles.
- Pack produit pilote : 3 cas, script 7 minutes, deck, mentions RGPD/non-conseil.

## Couche V2 ajoutee

- Repositionnement cabinet : moteur fiscal source pour CGP, experts-comptables et fiscalistes.
- Navigation resserree : Cockpit, Dossiers, Simulations, Preuves, Rapports.
- Onboarding 90 secondes et instanciation des 7 personas en dossiers de demonstration.
- Dossier vivant : enveloppes fiscales, snapshot, simulations, revue et rapport versionne.
- Moteurs fiscaux V2 : IFI complet, IR/PFU/CDHR, plus-value immobiliere, transmission,
  Pacte Dutreil, apport-cession 150-0 B ter et taxe holding patrimoniale.
- Generateur documentaire cabinet : DER, FIL, lettre de mission, rapport d'adequation,
  note fiscale et checklist LCB-FT.
- Routes API V2 demo : `personas/:id/instantiate`, `onboarding`, `tax-runs`,
  `documents/generate`, `reports/:id/version`.

## Couche V2.1 sans connecteurs ajoutee

- Contrats repository et migration `drizzle/0002_v2_1_pilot_readiness.sql` prets Postgres.
- Plan de seed `lib/db/seed-v2-1.ts`, non execute sans `DATABASE_URL`.
- Export RGPD JSON, demande de suppression en revue, politique de conservation pilote.
- Metadonnees documentaires privees : aucun lien public, aucun fichier reel sans Blob prive.
- Golden cases fiscaux pour chaque moteur V2, avec sources, regles et validation professionnelle.
- Controle offline des snapshots de preuves, sans scraping live ni dependance reseau.
- APIs demo : `repository-readiness`, `data-export`, `data-deletion`,
  `documents/private-metadata`, `golden-cases`, `evidence/offline-control`.
- UI cabinet enrichie : panneau V2.1 sans connecteurs, contrat repository et golden cases.
