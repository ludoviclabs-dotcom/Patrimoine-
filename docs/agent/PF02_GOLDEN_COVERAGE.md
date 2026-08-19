# PF-02 — GOUVERNANCE DES RÈGLES ET COUVERTURE GOLDEN

Date : 2026-08-19
Branche : `claude/patrimoine-fiscal-context-e5b7df`
HEAD de départ : `b3b2dade33d1fad80286c5ff98edf130e703d935`
Contexte : PF-01 clôturé, registre P0 fermé (7 sur 7 corrigés).

PF-02 ne corrige aucun montant fiscal. Il durcit l'infrastructure qui rend les
montants traçables, et comble la couverture golden là où elle manquait.

---

## 1. Audit du registre de règles

Inventaire au démarrage : **55 règles** — 24 actives, 12 archivées, 19 `draft`.

Contrôles exécutés sur la totalité du registre et sur les 20 runs produits par
`getAllTaxRuns()` :

| Contrôle | Résultat |
|---|---|
| Identifiants dupliqués | Aucun |
| `effectiveFrom` absente ou mal formée | Aucune |
| Règle active sans source | Aucune |
| Source référencée inexistante | Aucune |
| Version absente | Aucune |
| `calculation_step` sans `ruleVersionId` | Aucun |
| `ruleVersionId` référencé mais absent du registre | Aucun |
| Moteur référençant une règle archivée | Aucun |
| Étape sans source ou avec source inconnue | Aucune |

### Anomalie détectée et corrigée

| Anomalie | Détail | Correction |
|---|---|---|
| Deux règles actives sur la même portée | `rule-ifi-simplified-2026-v1` et `rule-ifi-complete-2026-v2`, toutes deux `active` avec `effectiveFrom: 2026-01-01`, même périmètre. Le moteur `lib/simulations/ifi.ts` ne référence que la V2. | `rule-ifi-simplified-2026-v1` passée en `archived`. Aucun calcul existant n'est modifié : la V1 n'était référencée nulle part. |

C'est l'invariant B (§ 2) qui a fait apparaître cette anomalie.

### Constat documenté, non corrigé

Neuf règles en statut `draft` sont référencées par des moteurs produisant des
`calculation_steps` : `rule-donation-usufruit-2026-v1`,
`rule-per-deduction-2026-v2`, `rule-bank-import-demo-2026-v1`,
`rule-succession-checklist-2026-v1`, `rule-per-early-exit-primary-home-2026-v1`,
`rule-succession-liquidity-stress-2026-v1`, `rule-product-adequacy-demo-2026-v1`,
`rule-assurance-vie-990i-757b-2026-v1`, `rule-sci-arbitrage-2026-v2`.

Ces moteurs sont explicitement pilotes ou démonstratifs, et tous leurs runs
portent `professionalValidationRequired` et `status: needs_review`. Promouvoir
ces règles en `active` est une **décision de gouvernance**, pas une correction
technique : elle suppose une revue professionnelle par règle. Laissé ouvert en
FOLLOW-UP plutôt que promu unilatéralement.

---

## 2. Invariants de gouvernance ajoutés

Fichier : `tests/unit/pf02-rule-governance.test.ts` — **13 tests**.

| Réf | Invariant | Portée |
|---|---|---|
| A | Toute règle active porte id, version, `effectiveFrom` ISO et ≥ 1 source | 24 règles actives |
| A bis | Aucun identifiant dupliqué | 55 règles |
| B | Pas de seconde règle active non déclarée sur un même `ruleSet` | allowlist explicite `MULTI_ACTIVE_RULESETS` |
| C | Une règle archivée reste résolvable via `getRuleVersion` | 13 règles archivées |
| D | Tout run expose des `calculation_steps` | 20 runs |
| E | Chaque étape porte un `ruleVersionId` non vide | toutes étapes |
| F | Tout `ruleVersionId` référencé existe dans le registre | toutes étapes |
| F bis | Aucun moteur ne référence une règle archivée | toutes étapes |
| G | Aucune source factice (`TBD`, `TODO`, …), toute source résolvable | règles + étapes |
| H | Aucune plage `effectiveFrom`/`effectiveTo` inversée | régimes datés |
| I | Une date frontière résout **exactement une** version temporelle | 5 dates sondées |
| I bis | Chaque régime daté pointe une règle existante et ≥ 1 source | régimes apport-cession |

L'allowlist de l'invariant B est le garde-fou principal : ajouter une seconde
règle active sur un `ruleSet` existant fait échouer la suite tant que la
coexistence n'est pas déclarée avec sa raison.

---

## 3. Matrice de couverture golden

Légende : `COVERED` · `PARTIAL` · `MISSING` · `N/A`

| Engine | Nominal | Lower boundary | Exact boundary | Upper boundary | Date boundary | needs_review | Historical version | Status |
|---|---|---|---|---|---|---|---|---|
| IR barème | COVERED | COVERED | COVERED | COVERED | N/A | COVERED | N/A | **COVERED** |
| CEHR / CDHR | COVERED | PARTIAL | PARTIAL | PARTIAL | N/A | COVERED | N/A | **PARTIAL** |
| PFU | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | **COVERED** |
| PEA | COVERED | N/A | COVERED | N/A | COVERED | COVERED | COVERED | **COVERED** |
| IFI | COVERED | COVERED | COVERED | COVERED | N/A | PARTIAL | N/A | **PARTIAL** |
| PV immobilière | COVERED | COVERED | COVERED | COVERED | N/A | COVERED | N/A | **COVERED** |
| Résidence principale | COVERED | N/A | COVERED | COVERED | COVERED | COVERED | N/A | **COVERED** |
| DMTG | COVERED | COVERED | COVERED | COVERED | N/A | COVERED | N/A | **COVERED** |
| Dutreil | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | **COVERED** |
| 150-0 B ter | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | **COVERED** |
| Taxe holding | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | N/A | **COVERED** |
| Exit tax | COVERED | COVERED | COVERED | COVERED | N/A | COVERED | N/A | **COVERED** |
| SCI IR/IS | COVERED | MISSING | MISSING | MISSING | N/A | COVERED | N/A | **PARTIAL** |
| IS | COVERED | COVERED | COVERED | COVERED | N/A | COVERED | N/A | **COVERED** |
| PER | COVERED | COVERED | COVERED | COVERED | N/A | COVERED | N/A | **COVERED** |
| E-facturation | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | COVERED | **COVERED** |

### Couverture ajoutée en PF-02

| Moteur | Cas ajoutés |
|---|---|
| Exit tax | seuil 800 000 € (799 999 / 800 000) ; seuil de détention 50 % ; condition de résidence 6/10 ans ; dégrèvement 2 ans vs 5 ans au-delà de 2,57 M€ ; hors champ → aucune taxe |
| IS | plafond du taux réduit 42 500 € ; limite de CA 10 M€ ; seuil de contribution sociale 763 000 € |
| PER | plancher salarié (10 % PASS 2025) ; plancher TNS (10 % PASS 2026) ; plafonds 37 680 / 88 911 € ; blocage à 70 ans avec économie d'impôt annulée |

### Écarts restants

- **SCI IR/IS — PARTIAL** : le moteur est couvert en nominal (foncier net,
  amortissements, plus-value de sortie) mais aucune frontière n'est testée. Les
  bascules IR/IS dépendent de plusieurs paramètres corrélés (TMI, durée,
  amortissement) ; définir une frontière pertinente relève d'un arbitrage
  produit, pas d'un ajout mécanique. FOLLOW-UP.
- **IFI — PARTIAL** : barème, décote et seuils sont couverts, mais les branches
  non implémentées (plafonnement, démembrement, dettes in fine et familiales)
  n'ont pas de cas `needs_review` dédié. Dépend des P1 IFI, hors périmètre PF-02.
- **CEHR/CDHR — PARTIAL** : les seuils 250 k€ / 500 k€ ne sont pas testés aux
  frontières exactes. FOLLOW-UP à faible risque.

---

## 4. Invariants d'abstention

Fichier : `tests/unit/pf02-abstention-and-history.test.ts`.

Ces tests garantissent qu'une donnée manquante ne produit jamais silencieusement
une exonération, un taux par défaut, la règle courante ou un résultat confirmé.

| Situation | Attendu, vérifié |
|---|---|
| Date opérative manquante (150-0 B ter) | `regimeId`, taux et seuil `null`, `undetermined`, **et le régime 2026 n'est pas appliqué par défaut** |
| Fait de qualification manquant (résidence principale) | `needs_review`, aucune exonération, abattements < 100 % |
| Fraction d'affectation inconnue (taxe holding) | `undetermined`, actif signalé, fraction jamais présumée nulle |
| Sous-régime non supporté (holding étrangère) | `NOT_IMPLEMENTED`, taxe 0, `undetermined` |
| Taille d'entreprise inconnue (e-facturation) | `qualificationRequired`, obligations ni retenues ni écartées |
| Runs concernés | `professionalValidationRequired` et `status: needs_review` |

---

## 5. Reproductibilité historique

Le but n'est pas de recalculer l'historique utilisateur, mais de garantir que le
code sait sélectionner un régime antérieur à partir d'une date explicite.

| Moteur | Pivot | Vérifié |
|---|---|---|
| PFU | 01/01/2026 (LFSS 2026) | 31/12/2025 → PS 17,2 %, total 3 000 € ; 01/01/2026 → PS 18,6 %, total 3 140 € |
| 150-0 B ter | 21/02/2026 (LF 2026 art. 11) | 20/02 → 60 % / 24 mois ; 21/02 → 70 % / 36 mois |
| Taxe holding | 31/12/2026 (LF 2026 art. 7) | 30/12/2026 hors champ ; 31/12/2026 dans le champ |
| E-facturation | 01/09/2026 et 01/09/2027 | ETI : rien en vigueur au 31/08/2026, tout en vigueur au 01/09/2026 ; PME : 2 jalons encore à venir en 2026, aucun en 2027 |

---

## 6. Audit des constantes fiscales littérales

Contrôle volontairement **étroit**, pour éviter les faux positifs : aucun taux
ni seuil fiscal ne doit être réinscrit en dur dans `components/` ou `app/`. Les
constantes légales vivent dans les moteurs et registres versionnés ; l'UI les
dérive. C'est exactement la régression corrigée en PF-01C1, où le cockpit
affichait « 31,4 % » en chaîne figée.

Littéraux surveillés : `0.128`, `0.172`, `0.186`, `0.314`, `0.19`,
`5 000 000`, `1 300 000`, `800 000`.

| Résultat | Valeur |
|---|---|
| Fichiers UI scannés | `components/**` et `app/**`, hors tests |
| Littéraux fiscaux suspects trouvés | **0** |
| Corrigés | 0 (aucun à corriger) |
| Différés | Le périmètre `lib/**` n'est pas scanné : c'est là que les constantes doivent vivre. Un contrôle plus fin (littéral fiscal hors registre *dans* un moteur) produirait trop de faux positifs pour être utile en l'état. FOLLOW-UP. |

---

## 7. Politique d'arrondi

Politique explicitée, non modifiée :

1. **Pas d'arrondi intermédiaire** sauf lorsque la loi ou un exemple officiel
   l'impose.
2. **Convention finale documentée par moteur**, au plus près de la source :
   - DMTG : arrondi **par tranche** (`perSliceRounding`), qui reproduit
     l'exemple officiel service-public (50 000 € en ligne directe → 404 + 404 +
     573 + 6 814 = 8 195 €) ;
   - Plus-value immobilière : bases exactes, impôt **tronqué** à l'euro,
     conforme aux exemples BOFiP / 2048-IMM ;
   - PFU et profils de revenus : calcul en **centimes** (`lib/tax/money.ts`),
     arrondi final unique ;
   - Taxe holding : assiette arrondie à l'euro avant application du taux.
3. **Représentation monétaire cohérente** : centimes entiers dans les moteurs
   qui manipulent des taux composés, euros dans les moteurs à barème.

### Écart DMTG non tranché

Sur le cas de référence Dutreil à 1 M€, le dépôt calcule **14 098 €** et le
référentiel attend **14 097 €**. L'écart d'un euro vient de la convention :
arrondi par tranche (dépôt) contre arrondi unique sur base exacte (référentiel).

Les deux conventions sont défendables et adossées à des sources : celle du dépôt
reproduit un exemple officiel publié. **Le golden expected n'a pas été modifié
pour faire disparaître l'écart.**

**[BLOCKED — ROUNDING POLICY LEGAL REVIEW REQUIRED]**
Arbitrage à rendre par le réviseur fiscal : retenir l'arrondi par tranche
(aligné sur l'exemple service-public) ou l'arrondi unique (aligné sur le
référentiel). Tant que l'arbitrage n'est pas rendu, la convention du dépôt reste
en place et l'écart est documenté.

---

## 8. Registre des candidats au recalcul

Créé : `docs/agent/RECALCULATION_CANDIDATES.md`.

Quatre entrées, toutes en `IDENTIFIED_NOT_MIGRATED` : Dutreil, PEA,
apport-cession, taxe holding. Aucune migration automatique n'a été lancée.

---

## 9. Validation

| Commande | Résultat |
|---|---|
| `npm test` | PASS — 22 fichiers, **279 tests**, 0 échec (244 avant PF-02, +35) |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| `npm run e2e` | NON EXÉCUTÉ — harnais Playwright non exécutable en environnement non interactif |

---

## 10. FOLLOW-UP

Hors périmètre PF-02, à traiter dans des runs dédiés :

- **P1** — IFI : décote complète, plafonnement, démembrement, prêts in fine et
  dettes familiales.
- **P1** — Qualification de la holding animatrice (faisceau d'indices).
- **P1** — Taxe holding : parcours société étrangère (`NOT_IMPLEMENTED`).
- **P2** — Frontières golden SCI IR/IS et CEHR/CDHR.
- **P2** — Arbitrage de la convention d'arrondi DMTG (bloqué, revue juridique).
- **P2** — Statut des neuf règles `draft` référencées par des moteurs.
- **P2** — Extension éventuelle de l'audit de constantes au périmètre `lib/**`.
