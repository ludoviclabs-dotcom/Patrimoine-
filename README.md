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
- `/simulations` : IFI simplifie, transmission, facturation electronique.
- `/evidence` : sources officielles et regles versionnees.
- `/report` : rapport imprimable / export PDF via navigateur.

## Donnees demo

Persona : Claire et Marc, dirigeants d'une PME, deux enfants.

- Patrimoine brut : 3 840 000 EUR
- Dettes : 420 000 EUR
- Patrimoine net : 3 420 000 EUR
- Liquidites : 220 000 EUR
- Base IFI simplifiee : 1 110 000 EUR

## Hors perimetre V0

- Pas d'authentification reelle.
- Pas de donnees clients reelles.
- Pas de conseil fiscal ou juridique opposable.
- Pas de chatbot LLM.
- Pas de base Postgres obligatoire au runtime.
- Pas de paiement, upload documentaire ou signature.

## Prochaine etape

Le jalon suivant consiste a ajouter persistance Postgres/Drizzle, authentification,
roles, audit append-only, export PDF serveur, puis pilotes cabinets.
