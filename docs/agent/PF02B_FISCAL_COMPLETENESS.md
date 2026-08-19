# PF-02B — FISCAL COMPLETENESS GATE

Date : 2026-08-19
Branche : `claude/patrimoine-fiscal-bootstrap-a045d2`
HEAD de départ : `ef64ae7fb64cccca32c8d0af9c21652cc2aa0f88` (PR #9 mergée dans `main`)
Contexte : PF-00/PF-01/PF-02 clôturés, registre P0 fermé (7 sur 7). Ce run
(PF-02B1) traite exclusivement le backlog P1 IFI identifié dans
`docs/agent/PF02_GOLDEN_COVERAGE.md` § 10 et `docs/rule-governance.md`.

Portée stricte : **IFI uniquement**. Aucun autre moteur (PFU, Dutreil,
150-0 B ter, taxe holding, DMTG, holding animatrice) n'a été modifié.
L'infrastructure (Postgres, Auth, UI, PDF, watcher, IA) n'a pas été touchée.

---

## IFI

### 1. Sous-règles auditées

Périmètre audité à partir du code existant (`lib/simulations/ifi.ts`),
`docs/reference/2026-08/MOTEURS_FISCAUX_2026.ts` § 4 (baseline gelée le
18/08/2026, `computeIfi2026`, L660-1056) et `docs/rule-governance.md`
(« IFI V0 »).

| Sous-règle | État avant PF-02B1 | État après PF-02B1 |
|---|---|---|
| Seuil d'assujettissement (> 1,3 M€) | IMPLEMENTED | IMPLEMENTED (inchangé) |
| Barème progressif (6 tranches) | IMPLEMENTED | IMPLEMENTED (inchangé) |
| Décote 1,3-1,4 M€ | IMPLEMENTED | IMPLEMENTED (inchangé) |
| Résidence principale (abattement 30 % direct) | IMPLEMENTED | IMPLEMENTED (inchangé) |
| Immobilier direct (locatif, autres) | IMPLEMENTED | IMPLEMENTED (inchangé) |
| SCI / immobilier indirect | PARTIAL (needs_review) | PARTIAL (inchangé, needs_review conservé) |
| Démembrement CGI art. 968 | MISSING | **PARTIAL** — règle générale + deux exceptions limitatives documentées |
| Biens professionnels (art. 975) | MISSING (champ `isProfessionalAsset` déclaré mais non consommé par l'IFI) | **PARTIAL** — exclusion sur déclaration, revue documentaire obligatoire, conditions d'éligibilité non automatisées |
| Dettes ordinaires | PARTIAL (needs_review générique) | PARTIAL (inchangé, needs_review générique conservé) |
| Prêts in fine / échéances non constantes | MISSING | **IMPLEMENTED** — amortissement légal, abstention si donnée manquante |
| Prêts sans terme | MISSING | **IMPLEMENTED** — réduction d'1/20e par an, abstention si donnée manquante |
| Dettes familiales / liées | MISSING | **IMPLEMENTED** — non déduites sauf preuve d'un objectif non principalement fiscal |
| Plafond des dettes > 60 % (patrimoine > 5 M€) | MISSING | **IMPLEMENTED** |
| Plafonnement global de l'IFI à 75 % (art. 979) | IMPLEMENTED (non documenté comme tel) | IMPLEMENTED, confirmé mathématiquement équivalent à la référence, couverture golden ajoutée |
| Trusts | NOT_IMPLEMENTED | NOT_IMPLEMENTED (hors périmètre, `coverage-ifi-trusts`) |
| Non-résidents complexes | NOT_IMPLEMENTED | NOT_IMPLEMENTED (hors périmètre) |
| Holdings patrimoniales avancées | NOT_IMPLEMENTED | NOT_IMPLEMENTED (hors périmètre) |

**Constat de départ important** : la décote, le barème exact et le
plafonnement à 75 % étaient déjà correctement implémentés et mathématiquement
vérifiés contre `computeIfi2026` avant ce run (les cas golden
`IFI-ENTRY-THRESHOLD-1300000` et `IFI-DECOTE-1310000` de la référence
passaient déjà avec le code existant). Le déficit réel portait sur le
démembrement, les dettes avancées et les actifs professionnels — c'est sur ces
trois axes que porte l'implémentation.

### 2. Corrections / implémentations

#### 2.1 Démembrement — CGI art. 968

- **Root cause** : aucune notion de droit démembré n'existait sur `Asset`. Un
  bien détenu en usufruit ou en nue-propriété était nécessairement saisi comme
  une pleine propriété, sans mécanisme pour appliquer la règle légale ni ses
  exceptions.
- **Règle implémentée** :
  - par défaut (`ifiOwnershipRight` absent ou `"full-owner"`) : comportement
    inchangé, pleine valeur ;
  - **règle générale** (droit démembré déclaré, sans fondement d'exception
    documenté, ou fondement déclaré sans l'âge de l'usufruitier) :
    l'usufruitier est taxé sur la pleine valeur, le nu-propriétaire sur zéro —
    conformément à la règle de principe de l'art. 968, jamais présumée
    favorable au contribuable ;
  - **exception limitative documentée** (`ifiDismembermentBasis` =
    `legal-usufruct-surviving-spouse` ou
    `sale-with-reserved-usufruct-unrelated-third-party`, ET âge de
    l'usufruitier fourni) : répartition selon le barème art. 669, réutilisant
    la fonction déjà sourcée `getBareOwnershipRate` (`lib/tax/engine-kit.ts`,
    vérifiée le 11/06/2026 sur Légifrance, LEGIARTI000006310173 — cf.
    `lib/tax/engines/demembrement.ts`).
  - Un fondement d'exception invoqué **sans** l'âge de l'usufruitier ne
    déclenche jamais la répartition : il retombe sur la règle générale
    (pleine valeur), jamais sur une estimation d'âge.
- **Modélisation** : ajout additif sur `Asset` — `ifiOwnershipRight`,
  `ifiDismembermentBasis` (union fermée à deux valeurs, pas un booléen),
  `ifiUsufructuaryAge`. Aucun champ existant détourné, aucune migration de
  modèle.
- **Fondement de l'exception** : confirmé le 19/08/2026 sur Légifrance — la
  répartition art. 669 n'est admise que lorsque le démembrement résulte de la
  loi, notamment l'usufruit légal du conjoint survivant (art. 757 c. civ.),
  ou d'une vente avec réserve d'usufruit à un tiers non lié ; un usufruit
  conventionnel (donation entre époux, art. 1094-1 c. civ.) reste sur la
  pleine valeur chez l'usufruitier.

#### 2.2 Dettes avancées — CGI art. 974

- **Root cause** : `deductibleDebt` sommait `liability.value` pour toute dette
  liée à un actif immobilier, sans aucune distinction de modalité de
  remboursement, de caractère lié, ni de plafond.
- **Prêts in fine / échéances non constantes** : `dette admise = capital
  initial × (1 − années écoulées / durée totale)`. Réutilise
  `fullYearsBetweenIso` de `lib/tax/holding-tax-assets.ts` (déjà sourcée et
  testée pour la même mécanique légale sous la taxe holding, PF-01C3).
- **Prêts sans terme** : `dette admise = capital initial × (1 − années
  écoulées / 20)`.
- **Dettes familiales / liées** : non déduites sauf preuve d'un objectif non
  principalement fiscal (`ifiNonTaxPurposeProven`) — jamais présumée.
- **Abstention** : capital initial, date de décaissement, date d'échéance
  (prêts in fine) ou date de valorisation (`options.valuationDate`) manquants
  → dette non déduite et signalée (`insufficient-data`), jamais estimée. Le
  moteur n'appelle jamais l'horloge système : `valuationDate` est un paramètre
  explicite, à l'image du précédent e-facturation (PF-01C4).
- **Plafonnement des dettes (art. 974, IV)** : patrimoine taxable brut > 5 M€
  ET dettes admises > 60 % de ce patrimoine ET absence de preuve d'un objectif
  non principalement fiscal (`options.excessiveDebtNonTaxPurposeProven`) →
  `dette déductible = 60 % du patrimoine + 50 % de l'excédent`. Exemple
  vérifié : actifs 6 M€, dette 5,5 M€ → dette admise 4,55 M€ (golden
  `IFI-DEBT-CAP-6M-5M5` de la référence, reproduit à l'identique).

#### 2.3 Actifs professionnels déclarés — CGI art. 975

- **Root cause** : `Asset.isProfessionalAsset` existait déjà dans le modèle
  (utilisé sur l'actif société du dossier démo) mais n'était **jamais
  consommé** par le moteur IFI — un bien immobilier professionnel n'était ni
  exclu, ni signalé.
- **Comportement implémenté** : un actif immobilier déclaré professionnel est
  exclu de l'assiette, avec une étape de calcul dédiée en `needs_review`
  rappelant que l'exonération doit être documentée chaque année (CGI art.
  975). Les conditions d'éligibilité elles-mêmes (activité principale,
  quote-part par activité, proche affectataire, activités connexes) ne sont
  **pas** automatisées : la déclaration seule ne vaut jamais preuve. Ce choix
  reproduit fidèlement `computeIfiAsset` de la référence
  (`professionalAssetExempt`, L764-781), qui attache systématiquement un
  drapeau de revue à l'exonération plutôt que de la présenter comme acquise.

#### 2.4 Non-régression

Le calcul existant (barème, décote, résidence principale, plafonnement à
75 %, dette simple) est **inchangé bit à bit** pour tout dossier n'utilisant
aucun des nouveaux champs : les 4 tests golden existants et les tests IFI des
suites `v2-tax-product.test.ts` / `v3-2-dirigeant.test.ts` passent sans
modification. Le cas de référence Claire et Marc reste à 1 110 000 €.

### 3. Gouvernance de règle

- `rule-ifi-complete-2026-v3` (`IFI-2026.08-V3`), statut `active`, source
  `["src-service-public-ifi-2026", "src-legifrance-bofip-ifi-avance-2026"]`.
- `rule-ifi-complete-2026-v2` passée en `archived` (comportement fiscal
  changé : nouvelles branches déterministes ajoutées).
- Nouvelle source de preuve `src-legifrance-bofip-ifi-avance-2026` :
  Légifrance CGI art. 968, 974 (dont IV), 975 + BOFiP
  BOI-PAT-IFI-20-40-10/20 et BOI-PAT-IFI-30-10, vérifiée le 19/08/2026.
- Couverture (`lib/coverage/limits.ts`) : `coverage-ifi-demembrement-complexe`
  passe de `not_covered_v1` à `partially_covered` (règle générale + deux
  exceptions documentées couvertes ; quasi-usufruit et démembrements chaînés
  restent hors périmètre). `coverage-ifi-deductible-debt` et
  `coverage-ifi-actifs-pro-complexes` : explications mises à jour pour
  refléter précisément ce qui est désormais couvert.

### 4. Sources

- **Baseline locale** (autorité primaire, référentiel gelé le 18/08/2026) :
  `docs/reference/2026-08/MOTEURS_FISCAUX_2026.ts` § 4 (`computeIfi2026`,
  L660-1056), `docs/reference/2026-08/REGLEMENTATION_AOUT_2026.md` § 4.
- **Vérification complémentaire, effectuée le 19/08/2026** (aucune règle
  n'a été codée sans confirmation officielle) :
  - [Article 974 - Code général des impôts - Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037988599) —
    conditions de déductibilité, prêts in fine, plafond 60 %/50 %.
  - [Article 968 - Code général des impôts - Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036385009) —
    règle générale de l'usufruitier, exception de l'usufruit légal (art. 757
    c. civ.).
  - [Article 975 - Code général des impôts - Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036385035) —
    exonération des actifs professionnels, conditions non automatisées.
  - BOFiP PAT-IFI (BOI-PAT-IFI-20-40-10, BOI-PAT-IFI-20-40-20,
    BOI-PAT-IFI-30-10), cités par la baseline et confirmés par la recherche
    complémentaire.
- Aucun conflit détecté entre la baseline locale et les sources officielles :
  les formules, seuils et bornes coïncident exactement (barème 800 k€/1,3 M€/
  2,57 M€/5 M€/10 M€, décote 17 500 € − 1,25 %, plafond dette 60 %/50 %,
  diviseur 1/20e pour les prêts sans terme).

### 5. Golden cases

22 nouveaux tests ajoutés à `tests/unit/ifi.test.ts` (279 → 301), regroupés
sous `describe("PF-02B1 — IFI advanced deterministic rules")` :

| Catégorie | Cas | Attendu |
|---|---|---|
| Seuil | 1 299 999 € | hors IFI |
| Seuil | 1 300 000 € (borne exacte) | hors IFI (comparaison strictement supérieure) |
| Seuil | 1 300 001 € | IFI dû : brut 2 500 €, décote 1 250 €, net 1 250 € |
| Décote | 1 310 000 € | brut 2 570 €, décote 1 125 €, net **1 445 €** (golden référentiel `IFI-DECOTE-1310000`) |
| Décote | 1 400 000 € (borne exacte) | décote nulle |
| Décote | 1 400 001 € | décote nulle, branche de calcul distincte |
| Dette | Dette ordinaire 300 000 € | déduite telle quelle (non-régression) |
| Dette | Actifs 6 M€ / dette 5,5 M€ | plafonnée à **4,55 M€** (golden référentiel `IFI-DEBT-CAP-6M-5M5`) |
| Dette | Idem, preuve d'objectif non fiscal | plafonnement écarté, 5,5 M€ déduits |
| Dette | Prêt in fine, 5 ans écoulés sur 10 | 200 000 € admis sur 400 000 € |
| Dette | Prêt sans terme, 10 ans écoulés | 150 000 € admis sur 300 000 € |
| Dette | Dette liée non prouvée / prouvée | 0 € puis 200 000 € admis |
| Dette | Données insuffisantes (date d'échéance ou de valorisation manquante) | 0 € admis, jamais estimé |
| Démembrement | Usufruitier, règle générale | pleine valeur, `needs_review` |
| Démembrement | Nu-propriétaire, règle générale | valeur nulle |
| Démembrement | Exception documentée, usufruitier 75 ans | 30 % (barème art. 669) |
| Démembrement | Exception documentée, nu-propriétaire 75 ans | 70 % |
| Démembrement | Exception invoquée, âge manquant | repli sur la règle générale, jamais de répartition présumée |
| Bien professionnel | Actif immobilier professionnel déclaré | exclu de l'assiette, étape de revue dédiée |
| SCI | Non-régression | `needs_review` conservé, valeur inchangée |
| Plafonnement 75 % | Borne exacte | non appliqué |
| Plafonnement 75 % | Juste au-delà de la borne | appliqué |

### 6. Limitations connues (hors périmètre PF-02B1)

- **Quasi-usufruit et démembrements chaînés** (via société interposée,
  démembrements successifs) : non modélisés, retombent sur la règle générale
  et un statut `needs_review`.
- **Conditions d'éligibilité aux biens professionnels** (activité principale,
  quote-part par activité, proche affectataire, pluralité d'activités
  connexes et complémentaires) : non automatisées. Seule la déclaration est
  consommée, jamais comme preuve suffisante.
- **Conditions générales de déductibilité des dettes ordinaires** (existence
  au 1er janvier, charge effective par le redevable, justificatif) : signalées
  globalement (`needs_review`) mais non vérifiées individuellement dette par
  dette — inchangé depuis la V2.
- **Trusts, non-résidents complexes, holdings patrimoniales avancées** :
  toujours `NOT_IMPLEMENTED`, hors périmètre de ce run.
- **Résidence principale via société ou SCI** : toujours sans abattement
  automatique (`needs_review`), comportement inchangé.

### 7. `needs_review` — synthèse

Toute nouvelle branche ajoutée en PF-02B1 produit un statut `needs_review`,
jamais `validated` ni `indicative` :

- démembrement (règle générale **et** exception documentée) ;
- actif professionnel déclaré ;
- dettes avancées (in fine, sans terme, dette liée) dès qu'une modalité non
  standard est déclarée ;
- plafonnement des dettes > 60 % dès que le patrimoine taxable dépasse 5 M€
  (que le plafond s'applique ou non, pour tracer le contrôle effectué).

Aucune de ces branches ne peut produire un résultat "validé" sans
intervention professionnelle, conformément à `docs/rule-governance.md`.

---

## Validation

| Commande | Résultat |
|---|---|
| `npm test` | PASS — 22 fichiers, **301 tests**, 0 échec (279 avant PF-02B1, +22) |
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm run build` | PASS (exit 0) |
| `git diff --check` | PASS (exit 0) |
| `npm run e2e` | NON EXÉCUTÉ — harnais Playwright non exécutable de façon fiable dans cet environnement non interactif ; aucune modification n'a touché à l'UI dans ce run. |

Note d'environnement : ce worktree ne disposait initialement d'aucun
`node_modules` installé (chaque worktree Git a sa propre copie, distincte du
dépôt canonique). `npm install` a été exécuté pour permettre `npx tsc
--noEmit` et `npm run build` (532 paquets, conformes à `package-lock.json`,
aucune version modifiée). C'est une opération d'infrastructure sans rapport
avec le fiscal, non un choix de dépendance.

## Recalculation candidates

Aucun résultat IFI n'a été recalculé automatiquement. Les nouvelles branches
sont additives : un dossier n'utilisant aucun des nouveaux champs
(`ifiOwnershipRight`, `ifiDismembermentBasis`, `ifiUsufructuaryAge`,
`ifiRepaymentKind`, `ifiOriginalPrincipal`, `ifiDisbursementDate`,
`ifiContractualEndDate`, `ifiRelatedPartyDebt`, `ifiNonTaxPurposeProven`) et
sans actif `isProfessionalAsset` sur un bien immobilier produit un résultat
strictement identique à la V2. Aucune entrée n'est donc ajoutée à
`docs/agent/RECALCULATION_CANDIDATES.md` : ce run n'a changé le résultat
d'aucun dossier existant, il ajoute une capacité de calcul absente
auparavant.
