# V2 Cabinet Fiscal Evidence-First

## Positionnement

La V2 repositionne Patrimoine Fiscal Demo comme un moteur fiscal sourcé pour cabinets,
CGP, experts-comptables et fiscalistes. Le produit ne vise pas le particulier autonome :
il prépare un dossier, calcule de façon déterministe, affiche les sources et impose une
validation professionnelle.

## Capacités livrées

- Cockpit cabinet avec CTA : créer un dossier, ouvrir un persona, générer un rapport,
  demander une démo.
- Dossiers : onboarding 90 secondes, instanciation des 7 personas, dossier vivant,
  enveloppes fiscales, snapshot et dernier run.
- Simulations : IFI complet, IR/PFU/CDHR, plus-value immobilière, transmission,
  Dutreil, apport-cession et taxe holding.
- Preuves : sources officielles versionnées LF 2026, diff de règles, source watcher,
  accès conformité.
- Rapports : livrable V2 avec sommaire, hypothèses, scénarios, sources, limites,
  annexes de calcul et documents cabinet.

## Garde-fous

- Toutes les sorties restent indicatives.
- Chaque moteur produit des `calculationSteps` avec règle, source, statut, limite et
  action professionnelle.
- L'IA runtime reste désactivée.
- Les connecteurs externes restent hors périmètre : Powens, signature, Blob réel,
  auth provider et Postgres réel.

## Prochaines décisions

- Brancher la persistance Postgres et remplacer les fixtures par repositories.
- Faire relire les moteurs fiscaux par un professionnel habilité.
- Lancer un pilote avec 1 à 3 cabinets et mesurer clarté, objections et volonté de payer.
