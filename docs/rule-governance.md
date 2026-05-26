# Gouvernance Des Regles

## Principes

- Une simulation ne retourne jamais un resultat sans `calculation_steps`.
- Chaque `calculation_step` pointe vers une `ruleVersionId`.
- Chaque regle pointe vers au moins une source officielle.
- Un resultat fiscal est `indicative` ou `needs_review`, jamais presente comme
  avis definitif.
- Une donnee manquante doit produire une abstention ou un statut a verifier.

## Cycle de vie

```txt
draft -> active -> archived
```

Une regle active doit contenir :

- identifiant stable ;
- version ;
- date d'effet ;
- sources liees ;
- golden case associe lorsque le calcul est deterministe.

## IFI V0

Le moteur IFI simplifie retient :

- residence principale avec abattement demo de 30 % ;
- immobilier locatif ;
- parts SCI immobilieres a verifier ;
- dettes immobilieres declarees sous conditions.

Le moteur ne traite pas encore :

- biens professionnels ;
- plafonnement ;
- cas internationaux ;
- actifs immobiliers indirects complexes ;
- toutes exceptions et exonérations particulieres.

## Revue humaine

La validation professionnelle devra devenir une entite persistante :

```txt
professional_reviews
  simulation_run_id
  reviewer_id
  status
  comment
  reviewed_at
```

Pour la V0, cette responsabilite est visible dans les limites du rapport.
