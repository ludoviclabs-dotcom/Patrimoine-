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
| PFU | Constante globale 31,4 % (12,8 + 18,6) appliquée à toute assiette | Profil de taux par catégorie de revenu ; assurance-vie maintenue à 17,2 % (PFU 30 %) | Absent → 12 golden cases (PF-01C1) | § 17 TAX-P0-002 | MISMATCH | **P0 — corrigé (PF-01C1)** |
| Apport-cession | 70 % / 36 mois en dur, sans date du fait générateur | Règle datée : 60 %/2 ans avant le 21/02/2026, 70 %/3 ans à compter | Absent | § 8.2, § 17 TAX-P0-003 | PARTIAL | **P0 — non corrigé** |
| Taxe holding | `(somptuaires + financiers + immobilier + liquidités) × 20 %` | Liste fermée art. 235 ter C, assiette et taux à qualifier | Absent | § 9, § 17 TAX-P0-004 | MISMATCH | **P0 — non corrigé** |
| Résidence principale | Booléen `isMainResidence` → exonération 100 % automatique | Questionnaire factuel ; `professional-review` si délai > 1 an | Absent → 7 golden cases (PF-01B) | § 17 TAX-P0-006 | MISMATCH | **P0 — corrigé (PF-01B)** |
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

### TAX-P0-006 — Exonération résidence principale sur simple booléen (PF-01B)

- **Root cause** : `computePvImmo` traitait `isMainResidence: boolean` comme
  suffisant à lui seul pour appliquer une exonération de 100 % (`incomeTaxAllowanceRate = 1`,
  `socialAllowanceRate = 1`, `surtax = 0`), sans aucune donnée factuelle sur
  l'occupation du bien au jour de la cession. Un simple `isMainResidence: true`
  produisait une exonération totale certaine — c'est une **sous-estimation de
  l'impôt**, le seul des P0 identifiés en PF-01 à produire une exonération
  indue plutôt qu'une surévaluation.
- **Comportement précédent** : `isMainResidence: true` seul → `estimatedTax = 0`,
  quelles que soient les circonstances réelles de départ, de vacance ou de
  mise en vente.
- **Comportement corrigé** : `isMainResidence` ne fait plus que déclarer le
  bien candidat à l'exonération. Le résultat réel dépend de
  `assessMainResidenceExemption(mainResidenceQualification)`, qui distingue
  trois issues :
  - `eligible` — occupation effective confirmée au jour de la cession, ou
    vacance avec diligences de vente actives et délai ≤ 12 mois (tolérance
    BOFiP) → exonération totale appliquée ;
  - `not-eligible` — les faits excluent positivement la tolérance (logement
    loué, prêté, ou non activement mis en vente) → imposition normale ;
  - `needs_review` — informations absentes ou ambiguës (déclaration seule
    sans qualification, vacance sans diligence renseignée, délai non établi
    ou supérieur à 12 mois) → **imposition normale, jamais d'exonération
    automatique**, avec motif explicite et action de revue.
  Seule l'issue `eligible` déclenche l'exonération ; `not-eligible` et
  `needs_review` produisent exactement le même calcul (durée de détention,
  abattements, surtaxe) que pour un bien non déclaré résidence principale.
- **Modélisation** : ajout minimal et additif de `MainResidenceQualification`
  (`occupiedAtSale`, `vacantWithActiveSaleEffort`, `monthsBetweenVacatingAndSale`)
  dans `PvImmoInput`, sans migration du modèle patrimonial ni breaking change —
  `isMainResidence` reste utilisable seul (résultat : `needs_review`, plus
  jamais d'exonération silencieuse).
- **Rule ID / version** : `rule-plus-value-immobiliere-2026-v3`
  (`PV-IMMO-2026.08-V3`), statut `active` ; `rule-plus-value-immobiliere-2026-v2`
  passée en `archived`.
- **Date d'effet** : 2026-01-01 (aucun changement de régime dans le temps —
  correction de modélisation, pas d'évolution légale datée).
- **Source** : CGI art. 150 U, II-1° ; BOFiP RFPI-PVI-10-40-10 ; référentiel
  `REGLEMENTATION_AOUT_2026.md` § 17 (TAX-P0-006) et § 5.6 du protocole
  PF-01B ; implémentation de référence `MOTEURS_FISCAUX_2026.ts`
  `assessMainResidenceExemption` (L1121-1196) et son câblage dans
  `computeRealEstateCapitalGain2026` (L1295-1322) — seul `assessment === "eligible"`
  déclenche l'exonération totale, `professional-review` retombe sur le calcul
  normal, conformément au modèle repris ici.
- **Nouvelle étape de calcul** : `pvi-step-main-residence`, ajoutée uniquement
  quand `isMainResidence` est déclaré, avec `coverageLimitIds: ["coverage-plus-value-main-residence"]`
  (nouvelle limite de couverture dédiée) et `confidenceStatus` reflétant
  l'issue de l'évaluation.
- **Fichiers corrigés** : `lib/tax/engines/pv-immo.ts`, `lib/rules/rule-versions.ts`,
  `lib/coverage/limits.ts`, `components/v2/tax-scenario-lab.tsx`,
  `components/v3/forms/pv-immo-form.tsx`.
- **Statut** : **FIXED**, 7 golden cases ajoutés.

### TAX-P0-002 — PFU traité comme constante globale (PF-01C1)

- **Root cause** : le taux agrégé de 31,4 % était la **source primaire** du
  calcul et non une valeur dérivée. Chaîne complète constatée :
  `PFU_TOTAL_RATE_2026 = 0.314` et `PFU_SOCIAL_RATE_2026 = 0.186`
  (`pfu-arbitrage.ts`) → appliqués indistinctement à toute assiette dans
  `computePfuVsBareme` → réexportés et consommés par `exit-tax.ts` → dupliqués
  en littéraux `0.314` dans `simulateApportCessionV2` et
  `simulateIrPfuCdhr({ pfuRate = 0.314 })` → libellés « 31,4 % » figés dans les
  `calculation_steps`, le rule-diff, et le cockpit Claire et Marc.
  Aucune notion de catégorie de revenu ni de date de fait générateur n'existait.
- **Comportement précédent** : un unique taux agrégé, non daté, non catégorisé.
  Corollaire mesuré : `simulatePeaWithdrawalV2` retenait par défaut **17,2 %**
  de prélèvements sociaux alors que le PEA n'est pas un produit dérogatoire et
  suit la hausse LFSS 2026 à **18,6 %** — sous-imposition de 1,4 point.
- **Comportement corrigé** : nouveau registre
  `lib/tax/investment-income-profiles.ts` transcrivant la matrice par produit du
  référentiel (§ 3.2). Chaque catégorie porte ses composantes **IR et
  prélèvements sociaux séparées** ; le taux agrégé est **dérivé** et réservé à
  l'affichage. La résolution se fait par catégorie **et** par date : le pivot
  LFSS 2026 (01/01/2026) fait passer les prélèvements sociaux de 17,2 % à
  18,6 %, sauf pour les produits expressément dérogatoires (assurance-vie,
  CEL/PEL/PEP historiques) qui restent à 17,2 % des deux côtés.
- **Catégories supportées** : `dividend`, `interest`, `securities-capital-gain`,
  `private-crypto-gain`, `pea-before-five-years`, `pea-after-five-years`,
  `life-insurance`, `legacy-cel-pel-pep`, `disability-savings-annuity`
  (transcription intégrale de la table § 3.2 — aucune valeur déduite de la
  mémoire du modèle). Wirées aux moteurs : dividendes, plus-values mobilières,
  PEA avant/après cinq ans. Les autres sont disponibles et testées mais aucun
  moteur ne les route encore (`NOT_IMPLEMENTED` côté parcours).
- **Compatibilité** : `PFU_INCOME_TAX_RATE`, `PFU_SOCIAL_RATE_2026` et
  `PFU_TOTAL_RATE_2026` sont conservés mais **dérivés** du profil dividendes ;
  ils décrivent le droit commun et ne sont plus la source du calcul. Le
  paramètre historique `pfuRate` de `simulateIrPfuCdhr` reste accepté comme
  override explicite et produit un résultat identique ; laissé vide, le taux est
  dérivé du profil. Idem pour `socialContributionRate` du moteur PEA.
- **Rule IDs / versions** : `rule-pfu-arbitrage-2026-v2` (PFU-ARBITRAGE-2026.08-V2),
  `rule-ir-pfu-cdhr-2026-v3` (IR-PFU-CDHR-2026.08-V3),
  `rule-pea-withdrawal-2026-v2` (PEA-2026.08-V2) — les prédécesseurs v1/v2
  passent en `archived`, l'historique n'est pas réécrit.
- **Source** : `REGLEMENTATION_AOUT_2026.md` § 3.1 à § 3.4 et § 17
  (TAX-P0-002) ; CGI art. 200 A ; LFSS 2026 art. 12 ; implémentation de
  référence `MOTEURS_FISCAUX_2026.ts` `PFU_2026_RATE_PROFILES` (L328-384) et
  `computePfu2026` (L411-462).
- **Démo Claire et Marc** : le scénario porte sur des revenus de capitaux du
  dirigeant (dividendes), catégorie de droit commun. Le libellé « 31,4 % » est
  donc **juridiquement correct** et a été conservé, mais il est désormais
  **dérivé** du profil `dividend` au lieu d'être une chaîne figée
  (`cabinet-hero.tsx`). Le calcul du dossier est inchangé (37 680 € sur
  120 000 €), désormais décomposé en 15 360 € d'IR et 22 320 € de PS.
- **Fichiers corrigés** : `lib/tax/investment-income-profiles.ts` (nouveau),
  `lib/tax/engines/pfu-arbitrage.ts`, `lib/tax/engines/exit-tax.ts`,
  `lib/tax/v2-engines.ts`, `lib/rules/rule-versions.ts`,
  `lib/evidence/pfu-rule-diff.ts`, `lib/validation/golden-cases.ts`,
  `components/v2/cabinet-hero.tsx`.
- **Statut** : **FIXED**, 12 golden cases ajoutés.

## 5. Golden cases

Le golden case existant `tests/unit/v3-1-transmission.test.ts` **verrouillait la
règle erronée** : il affirmait que la réduction ne s'appliquait qu'aux donations
antérieures au 21/02/2026 (cas explicitement visé par le protocole PF-01 :
« golden case qui verrouille une règle erronée »). Il a été remplacé, et non
ajusté pour faire passer un calcul : la justification légale est documentée
ci-dessus (§ 4, TAX-P0-001).

Golden cases ajoutés en PF-01 (9 nouveaux tests, 183 → 191) :

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

Golden cases ajoutés en PF-01B pour TAX-P0-006 (7 nouveaux tests, 191 → 198) :

| Cas | Attendu |
|---|---|
| 1. Éligible — occupation confirmée au jour de la cession | `eligible`, exonération totale, impôt 0 € |
| 2. Résidence secondaire | pas d'évaluation, imposition normale 78 326 € |
| 3. Déclarée mais informations insuffisantes | `needs_review`, imposition normale, jamais 0 € |
| 4. Départ avant cession : tolérance ≤ 12 mois vs > 12 mois | 6 et 12 mois → `eligible` ; 18 mois → `needs_review` |
| 5. Vacance ambiguë vs vacance sans diligence | ambiguë → `needs_review` ; sans diligence → `not-eligible` |
| 6. `needs_review` ne bénéficie jamais d'une exonération silencieuse | sur 3 scénarios : imposition normale systématique |
| 7. Étape dédiée `pvi-step-main-residence` et compatibilité non-résidence-principale | étape présente et `needs_review` si déclarée sans preuve ; absente sinon |

Golden cases ajoutés en PF-01C1 pour TAX-P0-002 (12 nouveaux tests, 198 → 210) :

| Cas | Attendu |
|---|---|
| 1. Catégorie standard, régime nominal 2026 | dividendes 10 000 € → 3 140 €, taux agrégé 0,314 |
| 2. Composante IR isolée | 12,8 % → 1 280 € |
| 3. Composante prélèvements sociaux isolée | 18,6 % → 1 860 € |
| 4. Total = somme des composantes | 1 280 + 1 860 = 3 140 € |
| 5. Catégorie au régime social dérogatoire | assurance-vie PS 17,2 % → 1 720 €, total 3 000 € ; l'abattement d'IR ne réduit pas la base PS |
| 6. Date AVANT la hausse LFSS 2026 | PS 17,2 %, agrégat 30 %, total 3 000 € |
| 7. Date À COMPTER du 01/01/2026 + bascule au jour près | 31/12/2025 → 17,2 % ; 01/01/2026 → 18,6 % |
| 8. Anti-contamination | assurance-vie et CEL/PEL/PEP à 17,2 % à toute date ; constantes de compatibilité alignées sur le seul profil dividendes |
| 9. PEA (non dérogatoire) | après 5 ans : IR 0 %, PS 18,6 % ; avant 5 ans : IR 12,8 %, PS 18,6 % |
| 10. Moteur PEA, défaut corrigé | 40 000 € → PS 7 440 € à 18,6 % (et non 6 880 € à 17,2 %) ; fait générateur 2025 → 6 880 € |
| 11. Pré-diagnostic dirigeant | IR 15 360 € et PS 22 320 € séparés, total 37 680 € ; override `pfuRate` toujours honoré |
| 12. Arbitrage PFU/barème daté | 2026 → 314 € ; 2025 → 300 € |

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

## 6. P0 confirmés et NON corrigés

Ces trois P0 restent **confirmés présents dans le code** mais volontairement
hors périmètre des runs PF-01/PF-01B/PF-01C1 : chacun demande une modification de
fond sur un moteur distinct, et le protocole impose de corriger « un moteur à la
fois ». TAX-P0-006 (PF-01B) et TAX-P0-002 (PF-01C1), initialement dans cette
liste, ont été corrigés — voir § 4.

| ID | Constat vérifié dans le code | Emplacement |
|---|---|---|
| TAX-P0-003 | `requiredReinvestment = saleProceeds * 0.7` et `reinvestmentMonths <= 36` en dur, sans date de cession : le régime 2026 serait appliqué rétroactivement aux cessions antérieures au 21/02/2026. | `lib/tax/v2-engines.ts`, `simulateApportCessionV2` |
| TAX-P0-004 | `holdingTax = taxableLuxuryInventory * 0.2` où l'inventaire additionne intégralement liquidités et actifs financiers : assiette ouverte, non conforme à la liste fermée de l'art. 235 ter C. | `lib/tax/v2-engines.ts`, `simulateHoldingTaxV2` |
| TAX-P0-005 | Échéance stockée en chaîne statique `"1er septembre 2026"` ; aucun état passé/futur calculé par rapport à la date courante. | `lib/simulations/e-invoicing.ts` L12 |

## 7. Revue juridique requise / `needs_review`

- **Holding animatrice** : notion non modélisée. Le référentiel (§ 7.4) et la
  jurisprudence `Cass. com., 17 déc. 2025, n° 24-17.415` imposent un faisceau
  d'indices et une charge de la preuve ; toute qualification automatique est à
  proscrire. À traiter avec un statut `needs_review` dédié.
- **Écart d'arrondi DMTG** (§ 5) : arbitrage à confirmer entre la convention
  par tranche du dépôt et la convention du référentiel.
- **PEA et hausse LFSS 2026** : la correction porte le taux social par défaut du
  moteur PEA de 17,2 % à 18,6 % (le PEA ne figure pas parmi les produits
  dérogatoires de la table § 3.2). Les dossiers PEA liquidés sous
  `rule-pea-withdrawal-2026-v1` sous-estimaient les prélèvements sociaux et
  doivent être recalculés.
- Aucune situation `[BLOCKED — SOURCE VERIFICATION REQUIRED]` n'a été
  rencontrée : les quatre corrections (PF-01 + PF-01B + PF-01C1) reposent sur le
  référentiel approuvé du 18/08/2026, qui documente lui-même le constat et la
  correction attendue.

## 8. Backlog P1 / P2 (non implémenté)

- **P1** — IFI V0 : décote, plafonnement, démembrement, dettes in fine et
  dettes familiales absents (`docs/rule-governance.md` les documente comme non
  couverts).
- **P1** — Holding animatrice : modélisation par faisceau d'indices.
- **P2** — Harmoniser les conventions d'arrondi entre moteurs et référentiel.
- **P2** — Étendre la couverture golden aux moteurs sans cas dédié
  (exit tax, SCI IR/IS, PER).

## 9. Validation finale

État après PF-01C1 (TAX-P0-002 inclus) :

| Commande | Résultat |
|---|---|
| `npm test` | PASS — 20 fichiers, **210 tests**, 0 échec (183 baseline PF-01 → 191 PF-01 → 198 PF-01B → +12 nets en PF-01C1) |
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
