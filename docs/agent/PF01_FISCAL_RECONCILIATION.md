# PF-01 — RÉCONCILIATION DES MOTEURS FISCAUX 2026

Date : 2026-08-19
Branche : `claude/patrimoine-fiscal-context-e5b7df`
HEAD de départ : `afe1a79713eeb16935993d04d10d9f263569d1a6`
Référentiel appliqué : `docs/reference/2026-08/` (baseline approuvée du 18/08/2026)

## 1. Baseline avant modification

| Validation | Résultat |
|---|---|
| `npm test` | PASS — 20 fichiers, 183 tests, 0 échec |
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `git status --short` | worktree propre |

Aucun test en échec, aucun test `skipped` au démarrage. La baseline est donc
saine : tout écart constaté relève du fond fiscal, pas d'une dette de test.

## 2. Inventaire des moteurs

| Moteur | Fichier | Statut |
|---|---|---|
| IR progressif 2026 | `lib/tax/engines/ir.ts` | IMPLEMENTED |
| CEHR (art. 223 sexies) | `lib/tax/engines/ir.ts` | IMPLEMENTED — distincte de la CDHR |
| CDHR (plancher 20 % du RFR) | `lib/tax/engines/ir.ts` | IMPLEMENTED — distincte de la CEHR |
| PFU / arbitrage barème | `lib/tax/engines/pfu-arbitrage.ts` | PARTIAL — taux global unique |
| IFI | `lib/simulations/ifi.ts` | PARTIAL — V0 simplifiée, limites documentées |
| Plus-value immobilière | `lib/tax/engines/pv-immo.ts` | IMPLEMENTED |
| Résidence principale | `lib/tax/engines/pv-immo.ts` | PARTIAL — booléen unique |
| DMTG multi-liens | `lib/tax/engines/dmtg.ts` | IMPLEMENTED |
| Dutreil | `lib/tax/v2-engines.ts` | IMPLEMENTED — **corrigé en V4** |
| Apport-cession 150-0 B ter | `lib/tax/v2-engines.ts` | PARTIAL — non versionné par date |
| Taxe holding 235 ter C | `lib/tax/v2-engines.ts` | PARTIAL — assiette non fermée |
| Démembrement art. 669 | `lib/tax/engines/demembrement.ts` | IMPLEMENTED |
| Assurance-vie 990 I / 757 B | `lib/tax/engines/assurance-vie.ts` | IMPLEMENTED |
| IS | `lib/tax/engines/is.ts` | IMPLEMENTED |
| SCI IR/IS | `lib/tax/engines/sci-arbitrage.ts` | IMPLEMENTED |
| Exit tax art. 167 bis | `lib/tax/engines/exit-tax.ts` | IMPLEMENTED |
| PER | `lib/tax/engines/per.ts` | IMPLEMENTED |
| Holding animatrice | — | ABSENT — notion non modélisée |

## 3. Matrice de réconciliation

Le référentiel approuvé tient lui-même un registre des incompatibilités P0
(`REGLEMENTATION_AOUT_2026.md` § 17). La réconciliation confirme **7 P0 sur 7**
comme réellement présents dans le code.

| Moteur | Implémentation existante | Référentiel 2026 | Golden case | Source | Statut | Sévérité |
|---|---|---|---|---|---|---|
| Dutreil — réduction art. 790 | Réduction traitée comme abrogée après le 21/02/2026 (`donationBeforeFeb2026`) | Art. 790 CGI toujours en vigueur, sans condition de date | Golden case verrouillait la règle erronée | § 7.5, § 17 TAX-P0-001 | MISMATCH | **P0 — corrigé** |
| Dutreil — pivot 21/02/2026 | `individualCommitmentYears >= 6` en dur ; exclusions LF 2026 appliquées à toute date | 4 ans avant le 21/02/2026, 6 ans à compter ; exclusions non rétroactives | Absent | § 17 TAX-P0-007 | MISMATCH | **P0 — corrigé** |
| PFU | Constante globale 31,4 % (12,8 + 18,6) appliquée à toute assiette | Profil de taux par catégorie de revenu ; assurance-vie maintenue à 17,2 % (PFU 30 %) | Absent | § 17 TAX-P0-002 | MISMATCH | **P0 — non corrigé** |
| Apport-cession | 70 % / 36 mois en dur, sans date du fait générateur | Règle datée : 60 %/2 ans avant le 21/02/2026, 70 %/3 ans à compter | Absent | § 8.2, § 17 TAX-P0-003 | PARTIAL | **P0 — non corrigé** |
| Taxe holding | `(somptuaires + financiers + immobilier + liquidités) × 20 %` | Liste fermée art. 235 ter C, assiette et taux à qualifier | Absent | § 9, § 17 TAX-P0-004 | MISMATCH | **P0 — non corrigé** |
| Résidence principale | Booléen `isMainResidence` → exonération 100 % automatique | Questionnaire factuel ; `professional-review` si délai > 1 an | Absent | § 17 TAX-P0-006 | MISMATCH | **P0 — non corrigé** |
| E-facturation | Échéance en chaîne statique `"1er septembre 2026"` | État daté, bascule au 1er septembre | Absent | § 17 TAX-P0-005 | PARTIAL | **P0 — non corrigé** |
| IR / CEHR / CDHR | Barème, quotient plafonné, décote, CEHR et CDHR distinctes | Conforme au référentiel | Cas officiel service-public présent | § 1, § 3 | MATCH | N/A |
| DMTG multi-liens | Barèmes 777, abattements 779/790 B, rappel 15 ans, arrondi par tranche | Conforme ; arrondi reproduit l'exemple officiel (50 000 € → 8 195 €) | Présent | § 6 | MATCH | N/A |
| Plus-value immo (hors RP) | Abattements 150 VC, surtaxe 1609 nonies G, PS 17,2 % | Conforme (PS immobiliers hors hausse LFSS 2026) | Présent | § 5 | MATCH | N/A |
| IFI | V0 simplifiée, exclusions documentées | Moteur complet attendu (décote, plafonnement, démembrement) | Présent | § 4 | PARTIAL | P1 |
| Holding animatrice | Non modélisée | Faisceau d'indices + preuve, `needs_review` | Absent | § 7.4 | MISSING | P1 |

## 4. P0 corrigés dans ce run

### TAX-P0-001 — Réduction de 50 % des droits : art. 790 CGI (et non 790 I)

- **Comportement avant** : `simulateDutreilV2` exposait un paramètre
  `donationBeforeFeb2026`. La réduction de 50 % n'était accordée que si la
  donation était antérieure au 21/02/2026. Le libellé, la règle
  `rule-dutreil-2026-v3`, la source de preuve et le diff réglementaire
  affirmaient tous que la LF 2026 avait abrogé le dispositif.
- **Comportement attendu** : l'article **790 CGI** — à ne pas confondre avec
  l'ancien article 790 I, dispositif distinct — prévoit toujours, au
  18/08/2026, une réduction de 50 % des droits liquidés lorsque la donation
  porte en pleine propriété sur des titres éligibles Dutreil et que le donateur
  a moins de 70 ans. **Aucune condition de date.**
- **Source** : `docs/reference/2026-08/REGLEMENTATION_AOUT_2026.md` § 7.5 et
  § 17 (TAX-P0-001) ; CGI art. 790 ; implémentation de référence
  `MOTEURS_FISCAUX_2026.ts` L1790-1799.
- **Impact chiffré** (cas de référence 2 M€, donateur 65 ans, pleine propriété,
  1 bénéficiaire) : droits avec pacte **78 195 € → 39 098 €**. La V3
  **surévaluait les droits de 39 097 €**, soit un conseil erroné dans le sens
  défavorable au client.
- **Fichiers corrigés** : `lib/tax/v2-engines.ts`, `lib/rules/rule-versions.ts`,
  `lib/evidence/sources.ts`, `lib/evidence/dutreil-rule-diff.ts`,
  `components/v2/tax-scenario-lab.tsx`.
- **Statut** : corrigé, 6 golden cases ajoutés.

### TAX-P0-007 — Versionnement du régime Dutreil au 21/02/2026

- **Comportement avant** : éligibilité conditionnée en dur à
  `individualCommitmentYears >= 6`, et exclusions d'actifs LF 2026 appliquées
  quelle que soit la date du fait générateur — donc **application rétroactive**
  de la réforme aux transmissions antérieures au 21/02/2026.
- **Comportement attendu** : engagement individuel de **4 ans** avant le
  21/02/2026 et de **6 ans** à compter de cette date ; exclusions d'actifs
  LF 2026 **non rétroactives**.
- **Source** : `REGLEMENTATION_AOUT_2026.md` § 17 (TAX-P0-007) et § 18 ;
  CGI art. 787 B ; LF 2026 art. 8 ; implémentation de référence
  `MOTEURS_FISCAUX_2026.ts` L1739-1741 et L1771.
- **Fichiers corrigés** : `lib/tax/v2-engines.ts`.
- **Statut** : corrigé, 3 golden cases ajoutés (dont bascule au jour près).

### Gouvernance appliquée

- Nouvelle version de règle `rule-dutreil-2026-v4` (`DUTREIL-2026.08-V4`),
  statut `active` ; `rule-dutreil-2026-v3` passée en `archived` (cycle
  `draft → active → archived` de `docs/rule-governance.md`).
- Identifiant de règle stable, date d'effet conservée, sources officielles
  rattachées, `calculation_steps` conservés sur chaque étape.
- La source de preuve `src-bofip-dmtg-reduction-790-2026` affirmait elle-même
  l'abrogation : titre, référence légale et résumé corrigés, `contentHash`
  et `verifiedAt` mis à jour, rattachement à la V4.
- Le diff réglementaire est devenu un diff **V3 → V4** documentant la
  correction et exigeant le recalcul des dossiers liquidés sous la V3.

## 5. Golden cases

Le golden case existant `tests/unit/v3-1-transmission.test.ts` **verrouillait la
règle erronée** : il affirmait que la réduction ne s'appliquait qu'aux donations
antérieures au 21/02/2026 (cas explicitement visé par le protocole PF-01 :
« golden case qui verrouille une règle erronée »). Il a été remplacé, et non
ajusté pour faire passer un calcul : la justification légale est documentée
ci-dessus (§ 4, TAX-P0-001).

Golden cases ajoutés (9 nouveaux tests, 183 → 191) :

| Cas | Attendu |
|---|---|
| Art. 790 — donation postérieure au 21/02/2026 | réduction appliquée, taux 0,5, droits 39 098 € |
| Art. 790 — donation antérieure au 21/02/2026 | réduction appliquée, droits 39 098 € |
| Art. 790 — non-régression du taux au 18/08/2026 | taux 0,5 |
| Art. 790 — seuil d'âge 69 ans / 70 ans | 69 → appliquée ; 70 → refusée, droits 78 195 € |
| Art. 790 — démembrement et succession | réduction refusée dans les deux cas |
| Art. 790 — pacte non éligible | réduction refusée |
| Pivot — engagement 4 ans avant / 6 ans après | éligible avant, non éligible après |
| Pivot — bascule exacte 20/02 vs 21/02 | régime antérieur puis régime LF 2026 |
| Exclusions LF 2026 non rétroactives | 1 500 000 € avant, 1 350 000 € après |

### Écart d'arrondi documenté (non corrigé, volontaire)

Sur le cas de référence à 1 M€ du référentiel
(`FISCAL_GOLDEN_CASES_2026`, `DUTREIL-2026-ARTICLE-790`), le référentiel attend
**14 097 €** et le moteur du dépôt calcule **14 098 €**. L'écart de 1 € provient
d'une convention d'arrondi différente :

- le dépôt applique un arrondi **par tranche** (`perSliceRounding`), qui
  reproduit exactement l'exemple officiel service-public des DMTG
  (50 000 € en ligne directe → 404 + 404 + 573 + 6 814 = 8 195 €) ;
- le référentiel liquide sur base exacte puis arrondit une seule fois.

La convention du dépôt est adossée à un exemple officiel : elle n'a **pas** été
modifiée dans PF-01. L'écart est signalé ici pour arbitrage explicite, et non
absorbé silencieusement.

## 6. P0 confirmés et NON corrigés dans ce run

Ces cinq P0 sont **confirmés présents dans le code** mais volontairement laissés
hors périmètre de ce run : chacun demande une modification de fond sur un moteur
distinct, et le protocole impose de corriger « un moteur à la fois ».

| ID | Constat vérifié dans le code | Emplacement |
|---|---|---|
| TAX-P0-002 | `PFU_SOCIAL_RATE_2026 = 0.186` appliqué à toute assiette ; aucune catégorie de revenu en entrée. L'assurance-vie (17,2 %) n'est signalée que par une `coverage limit`, pas calculée. | `lib/tax/engines/pfu-arbitrage.ts` L22-23, L52-55 |
| TAX-P0-003 | `requiredReinvestment = saleProceeds * 0.7` et `reinvestmentMonths <= 36` en dur, sans date de cession : le régime 2026 serait appliqué rétroactivement aux cessions antérieures au 21/02/2026. | `lib/tax/v2-engines.ts` L435-436 |
| TAX-P0-004 | `holdingTax = taxableLuxuryInventory * 0.2` où l'inventaire additionne intégralement liquidités et actifs financiers : assiette ouverte, non conforme à la liste fermée de l'art. 235 ter C. | `lib/tax/v2-engines.ts` L529-531 |
| TAX-P0-005 | Échéance stockée en chaîne statique `"1er septembre 2026"` ; aucun état passé/futur calculé par rapport à la date courante. | `lib/simulations/e-invoicing.ts` L12 |
| TAX-P0-006 | `isMainResidence: boolean` → `incomeTaxAllowanceRate = 1` et `socialAllowanceRate = 1`, soit exonération totale automatique sur simple case à cocher, sans aucun élément factuel (occupation au jour de la cession, délai de vente, vacance, diligences). | `lib/tax/engines/pv-immo.ts` L95-96, L102 |

**TAX-P0-006 mérite une attention prioritaire** : c'est le seul des cinq qui
produit une exonération indue (donc une sous-estimation de l'impôt) sur la
simple valeur d'un booléen, ce que le protocole PF-01 § 5.6 interdit
explicitement.

## 7. Revue juridique requise / `needs_review`

- **Holding animatrice** : notion non modélisée. Le référentiel (§ 7.4) et la
  jurisprudence `Cass. com., 17 déc. 2025, n° 24-17.415` imposent un faisceau
  d'indices et une charge de la preuve ; toute qualification automatique est à
  proscrire. À traiter avec un statut `needs_review` dédié.
- **Écart d'arrondi DMTG** (§ 5) : arbitrage à confirmer entre la convention
  par tranche du dépôt et la convention du référentiel.
- Aucune situation `[BLOCKED — SOURCE VERIFICATION REQUIRED]` n'a été
  rencontrée : les deux corrections de ce run reposent sur le référentiel
  approuvé du 18/08/2026, qui documente lui-même le constat et la correction
  attendue.

## 8. Backlog P1 / P2 (non implémenté)

- **P1** — IFI V0 : décote, plafonnement, démembrement, dettes in fine et
  dettes familiales absents (`docs/rule-governance.md` les documente comme non
  couverts).
- **P1** — Holding animatrice : modélisation par faisceau d'indices.
- **P2** — Harmoniser les conventions d'arrondi entre moteurs et référentiel.
- **P2** — Étendre la couverture golden aux moteurs sans cas dédié
  (exit tax, SCI IR/IS, PER).

## 9. Validation finale

| Commande | Résultat |
|---|---|
| `npm test` | PASS — 20 fichiers, **191 tests**, 0 échec (183 avant, +8 nets) |
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm run build` | PASS (exit 0) |
| `npm run e2e` | NON EXÉCUTÉ — voir ci-dessous |
| `git diff --check` | PASS (exit 0) |

`npm run e2e` n'a pas été exécuté : le harnais Playwright démarre un serveur et
n'est pas exécutable de façon fiable dans cet environnement non interactif. Les
parcours utilisateurs touchés se limitent au libellé d'un contrôle du
laboratoire de scénarios ; le rendu est couvert par le succès de `npm run build`.
À exécuter avant toute mise en production.
