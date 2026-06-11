# V3.3 — Gestion transverse (agrégation, projections, CRM, alertes, calendrier)

Cette couche transforme la plateforme « simulateurs + preuves » en outil de
gestion : les chiffres affichés viennent des moteurs, plus jamais de textes
statiques.

## Briques livrées

| Manquement audit | Brique | Où la voir |
|---|---|---|
| Agrégation bancaire | `lib/integrations/powens.ts` (interface + fixture DSP2/SCA) + `lib/aggregation/simulated-accounts.ts` (`mapToAssets`, dataQuality `external_source`) | `/client` → « Mes comptes », badge « Agrégé (simulé) » |
| Projections chiffrées | `lib/projections/wealth-projection.ts` — capitalisation composée par catégorie, scénarios statu quo / donation 300 k€ / cession (frottement 15 %) ; hypothèses = paramètres de `rule-projections-2026-v1` | `/scenarios` → courbes 10 ans ; `netWealthEstimate` du comparateur désormais calculé |
| CRM préconisations | `lib/crm/recommendations.ts` — machine d'états proposée → acceptée → en cours → réalisée, transitions journalisées (`recommendation.updated`) | `/dossiers` → « Suivi des préconisations » |
| Espace client | `components/v3-3/client-portal-gate.tsx` — session simulée rôle `client`, vue restreinte (synthèse, documents, rapports validés) ; câblage réel Auth.js/Clerk documenté | `/client` |
| Alertes fiscales chiffrées | `lib/alerts/fiscal-alerts.ts` — chaque alerte porte un montant issu d'un run (`computedFromRunId`) : marge IFI vs seuil, distance CDHR, plafond PER inutilisé, économie Dutreil en jeu, taxe holding 84 000 € | `/dashboard` (remplace les alertes statiques) + `/cabinet` |
| Calendrier fiscal | `lib/calendar/fiscal-deadlines.ts` — 2042/2044, 2072, 2065 + acomptes IS, IFI, CFE, attestations Dutreil, taxe holding printemps 2027 ; fusion dans la frise patrimoniale | `/dossiers` + `/scenarios` |

## Garanties

- **Zéro variable d'environnement** : Powens et Pennylane sont des fixtures ;
  le câblage réel est documenté en en-tête de chaque fichier d'intégration.
- **Montants = sorties moteurs** : le test `v3-3-gestion.test.ts` vérifie
  l'égalité stricte entre chaque montant d'alerte et le run correspondant.
- **Projections ≠ prévisions** : taux d'hypothèse internes versionnés
  (`src-interne-hypotheses-projection-2026`, reliability `internal`),
  bandeau « indicatif, revue professionnelle requise ».
- Golden vérifié à la main : 3 420 000 € à 2 % sur 10 ans → 4 168 961 €.
