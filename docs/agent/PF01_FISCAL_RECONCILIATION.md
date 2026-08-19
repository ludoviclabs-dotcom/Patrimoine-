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
| Apport-cession | 70 % / 36 mois en dur, sans date du fait générateur | Règle datée : 60 %/2 ans avant le 21/02/2026, 70 %/3 ans à compter | Absent → 9 golden cases (PF-01C2) | § 8.2, § 17 TAX-P0-003 | PARTIAL | **P0 — corrigé (PF-01C2)** |
| Taxe holding | `(somptuaires + financiers + immobilier + liquidités) × 20 %` | Liste fermée art. 235 ter C, assiette et taux à qualifier | Absent → 15 golden cases (PF-01C3) | § 9, § 17 TAX-P0-004 | MISMATCH | **P0 — corrigé (PF-01C3)** |
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

### TAX-P0-003 — Apport-cession 150-0 B ter non versionné par date (PF-01C2)

- **Root cause** : `simulateApportCessionV2` ne recevait **aucune date**.
  `requiredReinvestment = saleProceeds * 0.7` et `reinvestmentMonths <= 36`
  étaient des constantes en dur, et la condition de conservation était figée à
  `conservationYears >= 5`. Toute cession, y compris antérieure au 21/02/2026,
  se voyait donc appliquer le régime LF 2026 — une **rétro-application** du
  droit nouveau à des faits générateurs antérieurs.
- **Date opérative retenue** : la **date de cession des titres apportés**
  (`disposalDate`), et non la date de l'apport. La LF 2026 art. 11 s'applique
  aux cessions réalisées à compter du lendemain de la publication de la loi,
  soit le **21/02/2026**. La version consolidée de l'article sur Légifrance est
  elle-même datée du 21 février 2026, ce qui corrobore le pivot.
- **Champ ajouté** : `disposalDate?: string` (ISO `YYYY-MM-DD`). Aucun champ
  existant n'a été détourné : la date d'apport n'a pas été réutilisée sous un
  autre nom. **En son absence, le moteur s'abstient** — `regimeId`,
  `reinvestmentMinimumRate` et `requiredReinvestment` restent `null`,
  `undetermined = true`, toutes les étapes passent en `needs_review` et
  `resultAmount` n'est pas renseigné. Le régime 2026 n'est jamais présumé.
- **Régime antérieur (cessions du 01/01/2019 au 20/02/2026)** : remploi minimal
  **60 %**, délai **2 ans**, conservation **12 mois**.
  Règle `rule-apport-cession-2019-v1` (APPORT-CESSION-2019.08-V1).
- **Régime LF 2026 (cessions à compter du 21/02/2026)** : remploi minimal
  **70 %**, délai **3 ans**, conservation **5 ans**.
  Règle `rule-apport-cession-2026-v3` (APPORT-CESSION-2026.08-V3).
- **Régime historique (cessions antérieures au 01/01/2019)** : remploi 50 %,
  délai 2 ans repris du référentiel, mais **durée de conservation non
  documentée** → le moteur ne l'invente pas : `minimumHoldingPeriodMonths` reste
  `null`, la condition n'est pas évaluée et le résultat devient `undetermined`.
  Règle `rule-apport-cession-pre-2019-v1`, statut `draft`, source marquée
  `[À VÉRIFIER BOFIP]`.
- **Sources** : `REGLEMENTATION_AOUT_2026.md` § 8.1 et § 8.2 ; § 17
  (TAX-P0-003) ; CGI art. 150-0 B ter, versions consolidées **contrôlées sur
  legifrance.gouv.fr** (version au 21/02/2026 : 70 % / trois ans / cinq ans ;
  version antérieure : 60 % / deux ans / douze mois) ; LF 2026 n° 2026-103 du
  19/02/2026, art. 11 ; implémentation de référence `MOTEURS_FISCAUX_2026.ts`
  `getApportCessionRegime` (L1938-1954).
- **Résolution de la date** : comparaison lexicographique de dates ISO de même
  format, ordonnée **au jour près**. Aucune comparaison fondée sur l'année n'est
  utilisée — un test dédié vérifie qu'une cession du 15/01/2026 relève encore du
  régime antérieur.
- **Calculation steps** : une étape `apport-step-regime` a été ajoutée en tête,
  exposant la date opérative, le régime retenu, le seuil, le délai, la
  conservation et les références légales. Les libellés des étapes suivantes
  dérivent du régime résolu ; plus aucun texte « 70 % / 36 mois » figé.
- **RECALCULATION CANDIDATE** : les runs `apport-cession` produits avant cette
  correction ont tous été liquidés au régime 70 %/3 ans/5 ans, quelle que soit
  la date de cession réelle. Les dossiers portant sur une cession **antérieure
  au 21/02/2026** ont donc été évalués contre un seuil trop élevé et une
  conservation trop longue. Aucune migration automatique n'est lancée dans ce
  run ; les résultats historiques ne sont pas réécrits. La fixture de démonstration
  porte désormais une date de cession explicite (`2026-06-11`), ce qui laisse son
  résultat inchangé (840 000 €).
- **Fichiers corrigés** : `lib/tax/apport-cession-regimes.ts` (nouveau),
  `lib/tax/v2-engines.ts`, `lib/rules/rule-versions.ts`.
- **Statut** : **FIXED**, 9 golden cases ajoutés.

### TAX-P0-004 — Assiette ouverte de la taxe holding (PF-01C3)

- **Root cause** : `simulateHoldingTaxV2` calculait
  `taxableLuxuryInventory = luxuryAssetsValue + financialAssetsValue +
  realEstateLuxuryValue + cashAndReceivablesValue`, puis `× 20 %`. La
  **trésorerie et les titres financiers étaient donc directement taxés**, par
  simple analogie avec leur caractère patrimonial/passif. Assujettissement et
  assiette étaient en outre fusionnés dans un unique bloc `criteria`, et aucune
  date de clôture n'existait : la taxe pouvait être chiffrée pour un exercice
  hors de son champ temporel.
- **Ancien modèle** : assiette ouverte, générique, alimentée par quatre agrégats
  scalaires dont deux ne sont pas taxables en droit.
- **Nouveau modèle** : registre `lib/tax/holding-tax-assets.ts` portant la
  **liste fermée** du II A sous forme d'union discriminée de catégories, plus
  les règles de dette et les constantes légales. Le moteur sépare désormais
  strictement **champ temporel → assujettissement → assiette → liquidation**.
- **Assujettissement** (conditions cumulatives, distinctes de l'assiette) :
  exercice clos à compter du **31/12/2026** ; valeur vénale de l'ensemble des
  actifs **≥ 5 000 000 €** ; contrôle par une personne physique **≥ 50 %** ;
  revenus passifs **> 50 %** des produits d'exploitation et financiers
  (strictement supérieur — 50,00 % ne suffit pas).
- **Liste fermée d'actifs taxables** (II A 1° à 7°) : chasse ; pêche ;
  véhicules non professionnels et de tourisme, yachts et bateaux de plaisance,
  aéronefs ; bijoux et métaux précieux (hors exception musée / monument
  historique / exposition) ; chevaux de course ou de concours ; vins et
  alcools ; logements dont la personne contrôlante se réserve la jouissance.
- **Exclusions explicites** : trésorerie, titres financiers, participations
  actives et œuvres d'art sont inventoriables mais **jamais** agrégés à
  l'assiette. Ils continuent d'alimenter la valeur totale des actifs (seuil de
  5 M€) et la qualification des revenus passifs — revenu passif et actif
  taxable restent deux notions distinctes.
- **Affectation opérationnelle** : `operationalUseFraction` exclut la proportion
  affectée à une activité opérationnelle éligible. Une fraction **non
  renseignée n'est jamais présumée nulle** : l'actif est signalé et le résultat
  devient `undetermined`.
- **Logement à jouissance réservée** : un logement réellement loué aux
  conditions de marché (`reservedForControllingPersonUse: false`) n'est pas
  visé par le 7° et sort de l'assiette.
- **Dettes** : aucune déduction générale des dettes de la holding. Seules les
  dettes d'acquisition rattachées à un logement taxable sont admises, selon la
  formule légale du mode de remboursement — capital restant dû (échéances
  constantes), amortissement linéaire (in fine / échéances non constantes),
  réduction d'un vingtième par an (sans terme). Une échéance contractuelle
  manquante ne donne lieu à aucune estimation. Les **dettes liées** sont
  exclues sauf preuve d'un objectif non principalement fiscal ; cette preuve
  n'est jamais supposée.
- **Taux** : 20 %, appliqué uniquement à l'assiette nette et seulement après
  validation du champ temporel et de l'assujettissement.
- **Société étrangère** : `FOREIGN HOLDING PATH: NOT_IMPLEMENTED`. Le calcul
  français n'est pas généralisé à une société étrangère : le cas bascule en
  revue, sans taxe chiffrée.
- **Rule ID / version** : `rule-holding-tax-2026-v3` (HOLDING-TAX-2026.08-V3),
  date d'effet 2026-12-31, statut `active` ; `rule-holding-tax-2026-v2`
  archivée.
- **Source** : `REGLEMENTATION_AOUT_2026.md` § 9.1 à § 9.5 et § 17
  (TAX-P0-004) ; CGI art. 235 ter C, II-A et IV ; LF 2026 n° 2026-103 du
  19/02/2026, art. 7 ; implémentation de référence `MOTEURS_FISCAUX_2026.ts`
  § 8 (L2085-2370).
- **RECALCULATION CANDIDATE** : tous les runs `holding-tax` antérieurs ont été
  liquidés sur une assiette ouverte incluant trésorerie et titres financiers.
  Les dossiers concernés **surévaluaient la taxe** dès qu'un montant était
  saisi dans les champs financiers ou de liquidités. Aucune migration
  automatique n'a été lancée et aucun résultat historique n'a été réécrit.
  Le cas de démonstration a été recomposé en actifs explicitement catégorisés
  (bateau 250 000 € + bijoux 90 000 € + vins 80 000 €), ce qui laisse son
  résultat inchangé à 84 000 €.
- **Compatibilité** : `financialAssetsValue` et `cashAndReceivablesValue` sont
  conservés en entrée pour la valeur totale des actifs et l'analytique, mais ne
  sont plus additionnés à l'assiette. Les agrégats `luxuryAssetsValue` et
  `realEstateLuxuryValue`, qui n'avaient aucune qualification légale, ont été
  remplacés par l'inventaire catégorisé `assets`.
- **Fichiers corrigés** : `lib/tax/holding-tax-assets.ts` (nouveau),
  `lib/tax/v2-engines.ts`, `lib/rules/rule-versions.ts`,
  `components/v2/tax-scenario-lab.tsx`.
- **Statut** : **FIXED**, 15 golden cases ajoutés.

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

Golden cases ajoutés en PF-01C2 pour TAX-P0-003 (9 nouveaux tests, 210 → 219) :

| Cas | Attendu |
|---|---|
| A. Seuil PRÉ-réforme (cession 20/02/2026) | 599 900 € → insuffisant ; 600 000 € → seuil atteint (60 % de 1 M€) |
| B. Seuil POST-réforme (cession 21/02/2026) | 699 900 € → insuffisant ; 700 000 € → seuil atteint (70 % de 1 M€) |
| C. Délai PRÉ-réforme | 24 mois → respecté ; 25 mois → dépassé |
| D. Délai POST-réforme | 36 mois → respecté ; 37 mois → dépassé |
| E. Date opérative (apport antérieur dans les deux cas) | cession 20/02 → régime 60 %/24 m/12 m ; cession 21/02 → 70 %/36 m/60 m ; un même remploi de 650 000 € est conforme avant et insuffisant après |
| E bis. Bascule au jour près | 20/02/2026 et 15/01/2026 → régime antérieur ; 21/02/2026 → LF 2026 ; 31/12/2018 → pre-2019 |
| F. Conservation | 1 an suffit avant la réforme ; insuffisant après (5 ans requis) |
| G. Date de cession manquante | `regimeId`, seuil et délai `null`, `undetermined`, toutes les étapes `needs_review`, `resultAmount` non renseigné |
| H. Cession antérieure à 2019 | seuil 50 % repris, conservation `null` non inventée, résultat `undetermined` |

Golden cases ajoutés en PF-01C3 pour TAX-P0-004 (15 nouveaux tests, 219 → 234) :

| Cas | Attendu |
|---|---|
| A. Champ temporel | clôture 30/12/2026 → taxe 0 ; 31/12/2026 → 84 000 € |
| B. Seuil 5 M€ | 4 999 999 € → non assujetti ; 5 000 000 € → assujetti |
| C. Contrôle | 49,99 % → condition non satisfaite ; 50 % → satisfaite |
| D. Revenus passifs | 50,00 % → non satisfaite (strictement supérieur exigé) ; 50,01 % → satisfaite |
| E. Assujettie sans actif listé | trésorerie 4 M€ + financiers 3 M€ → assiette 0 €, taxe 0 € |
| F. Actifs financiers | `cash`, `financial-security`, `active-participation`, `work-of-art` à 3 M€ → assiette 0 € |
| G. Sept catégories légales | chacune des 9 catégories mobilières à 100 000 € → 20 000 € ; logement réservé 500 000 € → 100 000 € |
| H/I. Logement | jouissance réservée → taxé ; location aux conditions de marché → hors assiette |
| — Exception musée/exposition | bijoux exposés → hors assiette |
| J. Affectation opérationnelle | 40 % affectés → assiette 600 000 € ; fraction inconnue → `undetermined` + signalement |
| K. Dette échéances constantes | capital restant dû 300 000 € déduit → assiette 500 000 € |
| K bis. Formules légales | sans terme → 350 000 € (1/20 par an) ; in fine → 200 000 € ; échéance manquante → `null` |
| L. Dette liée | sans preuve → non déduite + note ; preuve rapportée → déduite |
| — Société étrangère | `NOT_IMPLEMENTED`, taxe 0 €, `undetermined` |
| — Étapes de calcul | les 10 étapes présentes, toutes rattachées à `rule-holding-tax-2026-v3`, taux 0,2 |

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

Ce P0 reste **confirmé présent dans le code** mais volontairement hors périmètre
des runs PF-01 à PF-01C3 : le protocole impose de corriger « un moteur à la
fois ». TAX-P0-006 (PF-01B), TAX-P0-002 (PF-01C1), TAX-P0-003 (PF-01C2) et
TAX-P0-004 (PF-01C3), initialement dans cette liste, ont été corrigés — voir § 4.

| ID | Constat vérifié dans le code | Emplacement |
|---|---|---|
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
- **Apport-cession antérieur à 2019** : la durée de conservation applicable aux
  cessions antérieures au 01/01/2019 n'est documentée ni par le référentiel
  (marqué `[À VÉRIFIER BOFIP]`) ni par les versions consultées. Le moteur
  s'abstient (`minimumHoldingPeriodMonths: null`) au lieu de supposer une durée.
  Statut pour cette sous-règle : `[BLOCKED — SOURCE VERIFICATION REQUIRED]`.
- **Taxe holding, société étrangère** : le parcours n'est pas modélisé
  (`FOREIGN HOLDING PATH: NOT_IMPLEMENTED`). La reconstitution de la fraction
  de participation représentative des actifs taxables, le démembrement et la
  clause anti-contournement demandent une analyse dédiée. Le moteur bascule en
  revue plutôt que de généraliser le calcul français.
- **Taxe holding, doctrine** : la doctrine administrative n'est pas stabilisée
  (§ 9.6). Une revue juridique reste obligatoire sur chaque dossier tant qu'elle
  ne l'est pas.
- Aucune autre situation `[BLOCKED — SOURCE VERIFICATION REQUIRED]` n'a été
  rencontrée : les six corrections (PF-01 + PF-01B + PF-01C1 + PF-01C2 +
  PF-01C3) reposent sur le référentiel approuvé du 18/08/2026 et, pour
  l'apport-cession, sur une vérification complémentaire des versions
  consolidées de l'art. 150-0 B ter sur legifrance.gouv.fr.

## 8. Backlog P1 / P2 (non implémenté)

- **P1** — IFI V0 : décote, plafonnement, démembrement, dettes in fine et
  dettes familiales absents (`docs/rule-governance.md` les documente comme non
  couverts).
- **P1** — Holding animatrice : modélisation par faisceau d'indices.
- **P2** — Harmoniser les conventions d'arrondi entre moteurs et référentiel.
- **P2** — Étendre la couverture golden aux moteurs sans cas dédié
  (exit tax, SCI IR/IS, PER).

## 9. Validation finale

État après PF-01C3 (TAX-P0-004 inclus) :

| Commande | Résultat |
|---|---|
| `npm test` | PASS — 20 fichiers, **234 tests**, 0 échec (183 baseline PF-01 → 191 PF-01 → 198 PF-01B → 210 PF-01C1 → 219 PF-01C2 → +15 nets en PF-01C3) |
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
