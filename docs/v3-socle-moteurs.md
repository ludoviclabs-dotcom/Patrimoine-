# V3 — Socle des moteurs fiscaux (Phase 0)

Cette couche prépare l'arrivée des moteurs v3 (IR au barème, PFU vs barème, DMTG
multi-liens, démembrement, IS, SCI…) sans rien changer au comportement des 13
moteurs v2 existants.

## Ce que contient le socle

| Brique | Fichier | Rôle |
|---|---|---|
| Argent en centimes | `lib/tax/money.ts` | `toCents` / `fromCents` / `roundEuros` / `roundCents` / `applyRate`. Les goldens officiels v3 sont au centime près (ex. IR 2026 : 30 000 € → 2 103,99 €), l'arithmétique flottante directe ne suffit plus. |
| Kit moteur | `lib/tax/engine-kit.ts` | Extraction pure de `v2-engines.ts` : `makeStep`, `createTaxRunFactory`, `ProgressiveBracket`, `calculateProgressiveTax`, `getBareOwnershipRate`, barème art. 777 ligne directe. |
| Arrondi par tranche | option `{ perSliceRounding: true }` | Reproduit l'exemple officiel DMTG (50 000 € → 404 + 404 + 573 + 6 814 = **8 195 €**). Sans l'option, comportement historique conservé (8 194 €). |
| Champs formulaires | `components/v3/forms/fields.tsx` | `NumberInput`, `CheckboxInput`, `SelectInput` extraits du lab v2, réutilisés par tous les formulaires v3. |
| Visualisations | `components/viz/bars.tsx`, `components/viz/curve.tsx` | SVG pur, couleurs en CSS vars (dark mode + impression sûrs). Barres groupées/empilées et courbes multi-séries. |
| CI | `.github/workflows/ci.yml` | `npm ci` → lint → tests → build sur push `main` et PR. |

## Corrections embarquées

- **Bug `/dossiers` corrigé** : `DossierWorkspaceV26` affichait des valeurs codées en
  dur fausses (brut 3 420 000, passifs 680 000, donut « 2,74 M€ »). Les chiffres
  viennent désormais de `lib/demo-data/metrics.ts` appliqué à `demoHousehold` :
  **brut 3 840 000 € / dettes 420 000 € / net 3 420 000 €** — alignés avec
  `/dashboard` et `/report`. Test de régression dans `tests/unit/v3-socle.test.ts`.
- **Impression durcie** : marges `@page`, titres jamais orphelins
  (`break-after: avoid-page`), cartes jamais coupées (`break-inside`), et en-tête
  répété sur chaque page imprimée du rapport avec la version de règles et le statut
  « simulation indicative — non validée ».

## Conventions pour chaque moteur v3 (garde-fou)

Chaque moteur livré dans les phases suivantes embarque obligatoirement :

1. une règle versionnée `rule-{module}-2026-v{n}` dans `lib/rules/rule-versions.ts`
   (montée de version ⇒ entrée RuleDiff) ;
2. au moins une source officielle hashée `src-{authority}-{topic}-2026` dans
   `lib/evidence/sources.ts` ;
3. un golden test Vitest reproduisant un exemple officiel + un GoldenCase runtime ;
4. des coverage limits ; chaque `CalculationStep` porte `ruleVersionId`,
   `evidenceSourceId`, `coverageLimitIds`, `nextAction` ;
5. l'UI complète (catalogue, lab, run, annexe rapport, gate de revue) ;
6. la vérification post-cutoff des barèmes : source officielle consultée ⇒ règle
   `active`, sinon règle `draft` + badge « À vérifier » ;
7. aucun LLM dans le calcul — tout reste « indicatif, revue professionnelle requise ».
