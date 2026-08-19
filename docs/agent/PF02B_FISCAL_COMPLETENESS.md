# PF-02B — FISCAL COMPLETENESS GATE

Date : 2026-08-19
Branche : `claude/patrimoine-fiscal-bootstrap-a045d2`
HEAD de départ (PF-02B1) : `ef64ae7fb64cccca32c8d0af9c21652cc2aa0f88` (PR #9 mergée dans `main`)
Contexte : PF-00/PF-01/PF-02 clôturés, registre P0 fermé (7 sur 7). Ce
document couvre deux runs successifs sur le même backlog P1/P2 identifié
dans `docs/agent/PF02_GOLDEN_COVERAGE.md` et `docs/rule-governance.md` :

- **PF-02B1** — complétude IFI (démembrement, dettes avancées, actifs
  professionnels). Portée stricte : IFI uniquement.
- **PF-02B2** — arrondi DMTG et gouvernance des règles `draft`. Portée
  stricte : arrondi DMTG (et ses moteurs consommateurs : Dutreil, transmission
  multi-liens, démembrement, assurance-vie 757 B) et invariants de
  gouvernance des règles `draft`. Aucun autre moteur, aucun montant fiscal
  hors périmètre de l'arrondi n'a été modifié.
- **PF-02B3** — qualification holding animatrice (CGI art. 787 B). Portée
  stricte : la qualification holding animatrice, et son intégration dans
  `simulateDutreilV2` uniquement lorsqu'elle alimente l'éligibilité. Les
  règles quantitatives Dutreil déjà sécurisées (engagement collectif,
  fonction de direction, engagement individuel 4/6 ans, exclusions LF 2026,
  réduction art. 790) n'ont pas été modifiées.

Aucun des trois runs n'a touché l'infrastructure (Postgres, Auth, UI, PDF,
watcher, IA).

---

## IFI (PF-02B1)

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

## DMTG — arrondi (PF-02B2)

### 1. Reproduction précise de l'écart

Cas de référence : `DUTREIL-2026-ARTICLE-790` de
`docs/reference/2026-08/MOTEURS_FISCAUX_2026.ts` (société 1 M€, donation
postérieure au 21/02/2026, Dutreil validé, donateur 65 ans, pleine propriété,
1 bénéficiaire).

| | Base taxable après abattement | Droits avant art. 790 | Droits après réduction 50 % |
|---|---:|---:|---:|
| Référentiel (`computeIfi2026`/`computeDutreilTransmission2026`) | 150 000 € | 28 194,35 € (exact, non arrondi) → **28 194 €** | **14 097 €** |
| Dépôt avant PF-02B2 (`simulateDutreilV2`) | 150 000 € | **28 195 €** (arrondi par tranche) | **14 098 €** |
| Dépôt après PF-02B2 | 150 000 € | **28 194 €** | **14 097 €** |

Reproduit et vérifié directement en exécutant `simulateDutreilV2` avec les
paramètres exacts du cas référentiel (résultat confirmé avant et après
correction, voir § 5).

### 2. Localisation de chaque opération d'arrondi

- **Référentiel** : `applyProgressiveScale` (L176-188) ne procède à **aucun**
  arrondi intermédiaire — chaque tranche est calculée au centime exact et
  sommée. Le résultat n'est arrondi qu'au moment où il devient une donnée de
  sortie (`roundCent` pour une composante intermédiaire, `roundEuro` pour un
  montant final dû après application d'une réduction comme l'art. 790).
- **Dépôt avant PF-02B2** : `calculateProgressiveTax`
  (`lib/tax/engine-kit.ts`) acceptait une option `perSliceRounding`, utilisée
  uniquement par `computeDmtg` (`lib/tax/engines/dmtg.ts`), qui arrondissait
  **chaque tranche** du barème à l'euro avant de les sommer. Sur la 4ᵉ tranche
  du cas de référence (134 068 € × 20 % = 26 813,60 €), cet arrondi ajoute
  0,40 € qui, cumulés aux autres tranches, portent le total de 28 194,35 € à
  28 195 € — puis, après la réduction de 50 % de l'art. 790, le passage de
  28 195 € (pair impossible, ici impair) à 14 097,5 € fait basculer
  l'arrondi final (`Math.round`, qui arrondit 0,5 vers le haut) à 14 098 €
  au lieu de 14 097 €.

### 3. Vérification sur sources officielles

Aucune décision n'a été prise sans confirmation sur legifrance.gouv.fr /
bofip.impots.gouv.fr / service-public.gouv.fr, vérifiés le 19/08/2026 :

- **[Article 1657 - Code général des impôts - Légifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051219510)**
  : la règle d'arrondi à l'euro le plus proche qu'il pose (« fraction d'euro
  égale à 0,50 comptée pour 1 ») **ne s'applique qu'aux impôts directs**
  (taxes foncières, taxe d'habitation et taxes annexes) — **pas** aux droits
  d'enregistrement / DMTG. Écartée comme fondement direct.
- **[BOI-ENR-DG-30 — Mise en œuvre des droits d'enregistrement, § 100](https://bofip.impots.gouv.fr/bofip/2030-PGP.html/identifiant=BOI-ENR-DG-30-20131223)**
  (la disposition réellement applicable aux DMTG) : « Les sommes ou valeurs
  servant de base aux droits ou taxes exigibles sont arrondies à l'euro le
  plus proche. La même règle s'applique pour l'arrondissement des montants
  des droits ou taxes exigibles. » L'arrondi porte sur la **base** puis sur
  le **montant final dû** — jamais sur les tranches intermédiaires d'un même
  barème progressif. La mention de « plusieurs droits particuliers donnant
  lieu à une perception distincte » (chacun arrondi séparément) vise des
  droits juridiquement distincts sur un même acte (ex. droits d'enregistrement
  et taxe de publicité foncière), **pas** les tranches d'un seul barème.
- **[Droits de donation — Calcul et paiement, fiche F14205 — service-public.gouv.fr](https://www.service-public.gouv.fr/particuliers/vosdroits/F14205)**
  : exemple chiffré officiel — donation de 200 000 € à un enfant, abattement
  100 000 € → base taxable 100 000 € ; tranches présentées **au centime
  exact** (403,60 € / 403,70 € / 573,45 € / 16 813,60 €) ; total exact
  18 194,35 € ; **« soit un total de droits de 18 194 € »**. Confirme sans
  ambiguïté l'arrondi final unique — et contredit directement l'exemple
  « 404 + 404 + 573 + 6 814 = 8 195 € » qui justifiait `perSliceRounding`
  dans le code (largement répété sur des sites tiers non officiels, mais
  absent de la méthodologie officielle).

**Aucun conflit non tranché** : les trois sources officielles convergent sur
l'arrondi final unique. Aucun `[BLOCKED — ROUNDING POLICY LEGAL REVIEW
REQUIRED]` n'est nécessaire — contrairement au précédent point bloquant
documenté en PF-02 (`docs/agent/PF02_GOLDEN_COVERAGE.md` § 7), qui portait
sur un désaccord *documenté et non résolu* entre deux conventions
elles-mêmes sourcées. Ici, une des deux conventions n'était en réalité
adossée à aucune source officielle vérifiable.

### 4. Politique d'arrondi explicite

| Paramètre | Règle |
|---|---|
| Arrondi intermédiaire par tranche | **Interdit**. Chaque tranche du barème progressif est calculée au centime exact. |
| Unité de l'arrondi final | Euro entier (`Math.round`, équivalent à la règle « fraction ≥ 0,50 comptée pour 1 » de BOI-ENR-DG-30). |
| Moment d'application | Sur le montant total des droits dus pour **une seule perception distincte** (ex. : le total DMTG d'un barème donné). Lorsqu'une réduction ultérieure s'applique (ex. art. 790, 50 %), l'arrondi final porte sur le montant **après réduction**, jamais avant — sans quoi la réduction elle-même introduit un second arrondi non fondé. |
| Arrondi final | Un seul, au dernier montant représentant les droits réellement dus. |
| Périmètre | S'applique à `computeDmtg` et à tout moteur qui en dérive un montant final (Dutreil, transmission multi-liens, démembrement, assurance-vie 757 B). Ne s'applique pas à l'IFI ni aux autres barèmes qui ne relèvent pas des droits d'enregistrement (barème IR, IFI : déjà conformes, cf. `roundEuro`/`Math.round` en sortie uniquement). |

### 5. Implémentation

- `lib/tax/engine-kit.ts` : option `perSliceRounding` retirée de
  `calculateProgressiveTax` (elle n'avait plus aucun appelant légitime).
  La fonction arrondissait déjà le total une seule fois (`Math.round` en
  sortie) — le seul défaut était l'arrondi *supplémentaire* par tranche en
  amont, désormais supprimé.
- `lib/tax/engines/dmtg.ts` : `computeDmtg` appelle
  `calculateProgressiveTax(taxableAfterAllowance, brackets)` sans option.
- `lib/tax/v2-engines.ts`, `lib/tax/engines/demembrement.ts` : libellés des
  étapes de calcul corrigés (ne mentionnent plus « arrondi par tranche »).
- Rule governance : `rule-dmtg-bareme-2026-v2` (`DMTG-2026.08-V2`) active,
  `rule-dmtg-bareme-2026-v1` archivée. Nouvelle source
  `src-bofip-enr-dg-30-arrondi-2026` (BOI-ENR-DG-30 § 100, vérifiée le
  19/08/2026), rattachée à la V2 aux côtés de la source barème existante.
- `lib/evidence/dmtg-rule-diff.ts` : l'artefact de démonstration
  « RuleDiff » (fonctionnalité produit illustrant le flux revue/recalcul)
  documentait *par construction* l'ancien comportement comme la version
  « à jour ». Son sens a été inversé pour documenter fidèlement CETTE
  correction (V1 erronée → V2 corrigée), plutôt que d'illustrer un scénario
  fictif désormais faux.

### 6. Golden cases

Cas corrigés avec justification légale (jamais ajustés pour « faire passer »
le test sans preuve) : barème ligne directe 50 000 €, tableau III
frères/sœurs, démembrement viager, chaînage Dutreil (cas 1 M€ et 2 M€),
assurance-vie 757 B, RuleDiff DMTG et Dutreil. Un nouveau golden reproduit
littéralement le cas `DUTREIL-2026-ARTICLE-790` du référentiel (1 M€ →
14 097 €). Un golden supplémentaire verrouille l'exemple officiel
service-public.gouv.fr F14205 (100 000 € → 18 194 €). Détail complet dans
`tests/unit/v3-1-transmission.test.ts` et `tests/unit/v3-socle.test.ts`.

### 7. Recalcul

Entrée n° 5 ajoutée à `docs/agent/RECALCULATION_CANDIDATES.md` :
**surévaluation systématique de 1 € (ou plus, selon les tranches franchies)**
sur tout dossier DMTG/Dutreil/démembrement/757 B liquidé avant PF-02B2. Aucun
résultat historique n'a été réécrit ; la reprise reste une décision humaine
par dossier.

---

## Gouvernance des règles `draft` (PF-02B2)

### 1. Inventaire

19 règles au statut `draft` dans le registre. Neuf sont effectivement
consommées par un moteur produisant des `calculation_steps` (vérifié
empiriquement via `getAllTaxRuns()`, pas seulement par grep textuel) :

| Rule id | Moteur | Raison du draft | Source | Résultat produit | Statut utilisateur | Justification needs_review |
|---|---|---|---|---|---|---|
| `rule-donation-usufruit-2026-v1` | `simulateTransmissionV2` (donation avec démembrement) | Valorisation *indicative* de l'usufruit/nue-propriété ; la réserve d'usufruit et l'acte réel restent à qualifier au cas par cas. | `src-impots-donation-usufruit`, `src-legifrance-code-civil-transmission` | Valeur transmise après application du taux d'usufruit | `needs_review` (run), `indicative` (étape dédiée) | Pas de golden boundary dédié ; qualification factuelle de l'acte toujours requise. |
| `rule-sci-arbitrage-2026-v2` | `simulateSciIrVsIs` (`lib/tax/engines/sci-arbitrage.ts`) | Arbitrage SCI IR/IS : bascules dépendantes de plusieurs paramètres corrélés (TMI, durée, amortissement). | `src-bofip-sci-is-2026`, `src-service-public-is-taux-2026` | Comparaison foncier net / IS / plus-value de sortie | `needs_review` | Golden boundaries manquantes (PF-02, § 3 « SCI IR/IS — PARTIAL »), non comblées par PF-02B1/B2 (hors périmètre). |
| `rule-assurance-vie-990i-757b-2026-v1` | `computeAssuranceVieTransmission` / `simulateAssuranceVieTransmission` | Cas standard bien sourcé et golden-testé, MAIS `coverage-assurance-vie-transmission` reste `partially_covered` : ventilation par contrat, contrats vie-génération, clauses démembrées et intégration successorale fine du 757 B non automatisées. | `src-bofip-tcas-aut-60-2026` (BOI-TCAS-AUT-60, art. 990 I/757 B), `src-impots-dmtg-bareme-2026` | Taxation 990 I et 757 B par bénéficiaire | `needs_review` | Question factuelle/juridique ouverte (clauses démembrées, contrats multiples) malgré une couverture nominale solide — écarte la promotion malgré un dossier a priori favorable. |
| `rule-per-deduction-2026-v2` | `simulatePerDeductionV2` | Plafonds calculés (37 680/88 911 €) sensibles au TMI et au report de plafond non consommé sur 3 ans, non entièrement automatisé. | Registre PER (plafonds PASS) | Déduction PER, économie TMI | `needs_review` | Report de plafond des années antérieures non intégralement modélisé. |
| `rule-bank-import-demo-2026-v1` | `simulateBankImportV2` | Fonctionnalité explicitement **simulée** (titre : « Import bancaire simulé ») — agrégation DSP2/Powens non branchée à un fournisseur réel. | `src-eurlex-sca-2018-389`, `src-banque-france-sca-2022`, `src-eurlex-aml-2015-849` | Statut d'import simulé, alertes de rapprochement | `needs_review` | Démo produit, aucune donnée réelle ; jamais destinée à devenir une source de vérité fiscale. |
| `rule-succession-checklist-2026-v1` | `simulateSuccessionChecklistV24` | Checklist successorale simplifiée ; actif brut, notaire et paiement restent « à vérifier » par construction. | Registre succession | Checklist non chiffrée en droits définitifs | `needs_review` | Pas un calcul de droits — une checklist de dossier, par nature incomplète tant que non revue par notaire. |
| `rule-per-early-exit-primary-home-2026-v1` | `simulatePerEarlyExitV24` | Sortie anticipée résidence principale : distinction versements/gains et régime applicable non entièrement automatisée. | `src-service-public-per-release-2025`, `src-bofip-per-fiscal-regime-2026` | Montant débloqué, part imposable | `needs_review` | Cas de déblocage anticipé multiples (autres que résidence principale) non couverts par le même moteur. |
| `rule-succession-liquidity-stress-2026-v1` | `simulateSuccessionLiquidityStressV24` | Stress test simplifié : droits estimés vs cash disponible, sur hypothèses internes non individuellement vérifiées. | Registre succession | Alerte de déficit de liquidité | `needs_review` | Objectif d'alerte, pas de liquidation définitive des droits. |
| `rule-product-adequacy-demo-2026-v1` | `simulateProductAdequacyV24` | Adéquation produit **simulée**, explicitement « sans recommandation » (titre). | `src-amf-mif2-adequation`, `src-amf-cif-orias-2026`, `src-cnil-profiling-automated-decision` | Score d'adéquation horizon/risque/durabilité | `needs_review` | Démo produit ; toute recommandation réelle exige un conseiller habilité (MIF2/CIF). |

Les dix règles restantes (`rule-signature-demo-2026-v1`,
`rule-agregation-demo-2026-v1`, `rule-projections-2026-v1`,
`rule-calendrier-fiscal-2026-v1`, `rule-compta-sci-2026-v1`,
`rule-ai-governance-2026-v1`, `rule-apport-cession-pre-2019-v1`,
`rule-manual-review-complexity-2026-v1`, `rule-regulatory-controls-2026-v1`,
`rule-cyber-hygiene-demo-2026-v1`) sont déclarées dans le registre mais ne
sont référencées par **aucun** `calculation_step` d'un run existant — soit
qu'elles alimentent un catalogue statique non chiffré (calendrier fiscal,
régime historique apport-cession non atteint par la fixture de démonstration
qui porte sur une cession datée du 21/02/2026), soit qu'elles ne sont pas
encore câblées à un moteur.

### 2. Décision de promotion

**Aucune règle `draft` n'est promue `active` dans ce run.** Conformément au
seuil fixé par le protocole (source suffisante **ET** date d'effet valide
**ET** couverture golden **ET** aucune question factuelle/juridique
ouverte), chacune des neuf règles consommées bute sur au moins un critère :
golden boundaries manquantes (SCI), fonctionnalité explicitement démo/pilote
(bank-import, product-adequacy), portée par nature non chiffrée (checklists),
ou — cas le plus proche de la promotion — question factuelle documentée et
non résolue (assurance-vie : clauses démembrées, contrats multiples). Rester
`draft` est la décision correcte pour les neuf, pas une abstention par
défaut.

### 3. Invariants ajoutés

Nouveau fichier `tests/unit/pf02b2-draft-rule-governance.test.ts`
(7 tests) :

- au moins une règle `draft` est effectivement consommée par un moteur (le
  test ne peut pas passer trivialement si l'inventaire devient vide) ;
- aucune étape référençant une règle `draft` n'a jamais
  `confidenceStatus: "validated"` ;
- aucune étape référençant une règle `draft` n'a jamais
  `displayStatus: "validated_calculation"` ;
- tout run contenant une étape `draft` porte `status: "needs_review"` ;
- tout run contenant une étape `draft` porte
  `professionalValidationRequired: true` ;
- chaque règle `draft` consommée reste résolvable et distincte d'une règle
  archivée ;
- l'inventaire empirique des règles `draft` consommées est verrouillé
  (liste explicite) — toute évolution (nouvelle règle draft câblée, ou une
  règle qui cesse de l'être) doit être ajoutée délibérément au test et
  documentée ici, jamais silencieusement.

Ces invariants constatent que la garantie est **déjà respectée** aujourd'hui
(aucune étape `draft` n'affiche jamais `validated`) ; leur rôle est de
protéger cette garantie contre une régression future — y compris pour une
règle `draft` qui n'existe pas encore.

---

## Holding animatrice (PF-02B3)

### 1. Audit préalable

Recherche exhaustive dans `lib/`, `components/`, `app/` (hors correspondances
CSS `animate-*`) : **aucune** occurrence de « holding animatrice », `isHoldingCompany`,
`holdingType` ou logique de qualification équivalente n'existait avant ce run.
`simulateDutreilV2` acceptait `eligibleOperatingValue` comme une donnée déjà
qualifiée, sans aucun contrôle sur le point de savoir si l'entité transmise
était elle-même une holding réellement animatrice — confirmant l'écart
documenté depuis PF-01 (« Holding animatrice : not modelled »).

### 2. Sources vérifiées le 19/08/2026

Aucune source secondaire retenue comme autorité — seuls le texte légal
consolidé et la décision elle-même, consultés directement :

- **[CGI art. 787 B — Légifrance (LEGIARTI000047623071)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047623071)**,
  texte consolidé depuis la LF 2024. Al. 1 : « N'est pas considérée comme une
  activité industrielle, commerciale, artisanale, agricole ou libérale
  l'exercice par une société d'une activité de gestion de son propre
  patrimoine mobilier ou immobilier. » Al. 2 : « Est néanmoins considérée
  comme exerçant une activité commerciale la société qui, outre la gestion
  d'un portefeuille de participations, a pour activité principale la
  participation active à la conduite de la politique de son groupe constitué
  de sociétés contrôlées directement ou indirectement, exerçant une activité
  industrielle, commerciale, artisanale, agricole ou libérale, et auxquelles
  elle rend, le cas échéant et à titre purement interne, des services
  spécifiques, administratifs, juridiques, comptables, financiers et
  immobiliers. » Ce second alinéa code **quatre critères cumulatifs**
  (activité principale, participation active, contrôle, filiales
  opérationnelles) et **un élément de soutien facultatif** (« le cas
  échéant » — prestations internes).
- **[Cass. com., 17 décembre 2025, n° 24-17.415 — Légifrance (JURITEXT000053196991)](https://www.legifrance.gouv.fr/juri/id/JURITEXT000053196991)**,
  publié au bulletin, pourvoi rejeté. § 10 : « en cas de transmission par
  décès, c'est au jour du décès, fait générateur de l'impôt, et non au jour
  de la déclaration de succession, que le caractère opérationnel des
  sociétés, dont les titres sont transmis, doit être apprécié. » § 13 : « Il
  appartient au redevable, qui entend bénéficier de l'exonération prévue à
  l'article 787 B du code général des impôts, de rapporter la preuve que les
  filiales de la société holding... exercent une activité commerciale. » La
  holding en cause (dénommée MCFG dans la décision) a été jugée **non
  animatrice** : ses filiales, des SCI valorisées sur leur rendement locatif,
  n'exerçaient pas d'activité opérationnelle éligible — confirmant
  l'exclusion de l'al. 1 dès lors que les filiales contrôlées restent de
  simples véhicules patrimoniaux.
- `docs/reference/2026-08/REGLEMENTATION_AOUT_2026.md` § 7.4 et § 12.3 :
  synthèse locale conforme aux deux sources ci-dessus ; § 12.3 précise
  qu'aucune doctrine BOFiP 2026 pleinement alignée n'est confirmée dans le
  gel du 18/08/2026 (`pending_doctrine`) et qu'« un ratio d'actifs
  opérationnels » ne doit « jamais » devenir « un safe harbor automatique ».

### 3. Modèle — faisceau de faits, jamais un score

Nouveau module `lib/tax/holding-animatrice.ts`, `assessHoldingAnimatrice(facts)`.
Les faits structurés représentables :

| Fait | Champ | Fondement |
|---|---|---|
| Contrôle de filiales | `subsidiariesControlled` | Art. 787 B, al. 2 |
| Participation à la politique du groupe | `groupPolicyActivelyLed` | Art. 787 B, al. 2 |
| Animation effective (filiales réellement opérationnelles, au fait générateur) | `operationalSubsidiariesActivityProven` | Art. 787 B, al. 2 ; Cass. com. § 10 et § 13 |
| Activité principale | `animationIsPrincipalActivity` | Art. 787 B, al. 2 (« a pour activité principale ») |
| Prestations internes éventuelles | `internalServicesProvided` | Art. 787 B, al. 2 (« le cas échéant ») — soutien facultatif, jamais déterminant seul |
| Période observée | `taxableEventDate` | Cass. com. § 10 — informatif, n'entre dans aucune branche de décision |
| Éléments de preuve | `contemporaneousEvidenceTypes` (liste fermée : procès-verbaux, conventions, reporting, décisions, prestations, moyens humains) | § 7.4 ; Cass. com. § 13 (charge de la preuve) |
| Ratio d'actifs opérationnels | `operationalAssetRatio` | § 7.4 — un indice, **n'entre dans aucune condition de qualification** de la fonction |
| Validation déjà obtenue | `professionalValidationConfirmed` | Jamais présumée, jamais déduite des autres faits |

**Aucun score** n'est calculé : les quatre critères cumulatifs de l'al. 2 sont
évalués en `AND` strict, jamais pondérés. Logique :

1. Un critère cumulatif expressément à `false` → `NOT_QUALIFIED` (exclusion
   de l'al. 1 applicable).
2. Un critère cumulatif non renseigné (`undefined`) → `NEEDS_REVIEW` (données
   insuffisantes ; aucune qualification n'est présumée).
3. Les quatre critères à `true` mais aucune preuve contemporaine rassemblée
   → `NEEDS_REVIEW` (une allégation seule ne suffit jamais, charge de la
   preuve sur le contribuable).
4. Les quatre critères à `true`, preuves rassemblées, mais validation
   professionnelle non confirmée → `NEEDS_REVIEW`.
5. Les quatre critères à `true`, preuves rassemblées, validation
   professionnelle confirmée → `QUALIFIED`.

Chaque conclusion retourne `factsConsidered`, `missingFacts`, `ruleVersionId`
(`rule-holding-animatrice-2026-v1`), `sourceRefs` (les deux sources
ci-dessus) et `reviewReason` (toujours renseigné, y compris pour `QUALIFIED`
et `NOT_QUALIFIED`).

### 4. Intégration Dutreil — additive, jamais rétroactive sur les règles quantitatives

`simulateDutreilV2` accepte un nouveau paramètre optionnel
`holdingAnimatrice?: { isHoldingCompany: boolean; facts?: HoldingAnimatriceFacts }`.
Absent (comportement historique) ou `isHoldingCompany: false` → aucun impact,
runs strictement inchangés (non-régression vérifiée : cas de référence 2 M€
toujours à 78 194 € / 39 097 €, cf. PF-02B2).

Lorsque `isHoldingCompany: true` :

- `QUALIFIED` → l'abattement de 75 % s'applique normalement.
- `NOT_QUALIFIED` ou `NEEDS_REVIEW` → l'abattement de 75 % **n'est jamais
  accordé** (`exemptValue = 0`), suivant exactement le précédent TAX-P0-006
  (exonération résidence principale) : un statut incertain ne vaut jamais
  présomption favorable.
- La réduction de 50 % de l'art. 790 CGI suit la même logique
  (`eligibleConsideringHoldingAnimatrice`, pas la seule éligibilité
  quantitative) : des titres de holding non qualifiée animatrice ne sont pas
  des « titres éligibles Dutreil » au sens de l'art. 790.
- Les conditions quantitatives (engagement collectif, fonction de direction,
  engagement individuel 4/6 ans, exclusions LF 2026) restent **strictement
  inchangées** dans tous les cas.
- Une nouvelle étape `dutreil-step-holding-animatrice` (`confidenceStatus:
  needs_review` systématique) n'est ajoutée que lorsque la qualification est
  engagée.

Gouvernance : `rule-holding-animatrice-2026-v1` (ruleSet `dutreil`) active,
`effectiveFrom: 2024-01-01` (date d'entrée en vigueur de la définition
codifiée par la LF 2024). Deux nouvelles sources : `src-legifrance-cgi-787b-holding-animatrice-2026`
et `src-jurisprudence-cass-com-2025-24-17415`. Nouvelle limite de couverture
`coverage-dutreil-holding-animatrice` (`partially_covered` : chaînes de
contrôle complexes, quasi-usufruit sur titres et animation partagée entre
plusieurs holdings restent hors périmètre, retombent sur `NEEDS_REVIEW`).
Allowlist `MULTI_ACTIVE_RULESETS` du test de gouvernance mise à jour pour
déclarer la coexistence de `rule-dutreil-2026-v4` et
`rule-holding-animatrice-2026-v1` sur le même jeu de règles `dutreil`.

### 5. Golden cases

14 nouveaux tests (`tests/unit/pf02b3-holding-animatrice.test.ts`) :

| Catégorie | Cas | Attendu |
|---|---|---|
| Faits suffisants | Quatre critères établis, preuves rassemblées, validation confirmée | `QUALIFIED` |
| Purement passive | Filiales non prouvées opérationnelles (SCI patrimoniales), critères écartés | `NOT_QUALIFIED`, motif citant l'art. 787 B, al. 1 |
| Activité mixte | Ratio d'actifs 55 % favorable mais validation professionnelle absente | `NEEDS_REVIEW` — le ratio n'apparaît jamais dans le motif de la décision |
| Données incomplètes | Trois des quatre critères cumulatifs non renseignés | `NEEDS_REVIEW`, `missingFacts` liste les trois |
| Contradiction déclaratif/preuves | Quatre critères déclarés réunis, tableau de preuves vide | `NEEDS_REVIEW`, motif citant Cass. com. 24-17.415 |
| Absence de preuve | Preuves jamais renseignées (`undefined`) | `NEEDS_REVIEW` |
| Non-régression Dutreil | `holdingAnimatrice` absent | Résultats identiques au cas de référence PF-02B2 (78 194 € / 39 097 €) |
| Société opérationnelle directe | `isHoldingCompany: false` | Comportement inchangé |
| Intégration QUALIFIED | Holding qualifiée | Abattement 1 500 000 € accordé normalement |
| Intégration NOT_QUALIFIED | Holding passive | Abattement refusé, droits alignés sur le montant sans pacte |
| Intégration NEEDS_REVIEW | Preuves manquantes | Abattement non présumé, jamais accordé par défaut |
| Traçabilité | Tout appel | `factsConsidered`, `missingFacts`, `ruleVersionId`, `sourceRefs`, `reviewReason` toujours renseignés |

### 6. Limitations connues

- Chaînes de contrôle complexes (sous-holdings multiples), quasi-usufruit sur
  titres transmis, animation partagée entre plusieurs holdings : hors
  périmètre, retombent sur `NEEDS_REVIEW` via les critères cumulatifs non
  renseignés (comportement sûr, pas une lacune silencieuse).
- Aucune doctrine BOFiP 2026 pleinement alignée n'est confirmée
  (`pending_doctrine`, REGLEMENTATION_AOUT_2026.md § 12.3) : une revue
  juridique reste recommandée avant toute promotion de la doctrine
  administrative applicable.
- Le ratio d'actifs opérationnels est capturé (`operationalAssetRatio`) mais
  n'entre dans **aucune** branche de décision — délibéré, pour ne jamais
  devenir un safe harbor automatique (§ 7.4 et § 12.3).

---

## Validation

### PF-02B1 (IFI)

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

### PF-02B2 (arrondi DMTG et gouvernance draft)

| Commande | Résultat |
|---|---|
| `npm test` | PASS — 23 fichiers, **309 tests**, 0 échec (301 avant PF-02B2, +7 gouvernance draft, +1 golden 1 M€ Dutreil) |
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm run build` | PASS (exit 0) |
| `git diff --check` | PASS (exit 0) |
| `npm run e2e` | NON EXÉCUTÉ — même limitation d'environnement ; aucune modification n'a touché à l'UI dans ce run. |

### PF-02B3 (holding animatrice)

| Commande | Résultat |
|---|---|
| `npm test` | PASS — 24 fichiers, **323 tests**, 0 échec (309 avant PF-02B3, +14) |
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0, un avertissement d'import inutilisé corrigé en cours de run) |
| `npm run build` | PASS (exit 0) |
| `git diff --check` | PASS (exit 0) |
| `npm run e2e` | NON EXÉCUTÉ — même limitation d'environnement ; aucune modification n'a touché à l'UI dans ce run. |

## Recalculation candidates

- **PF-02B1** : aucun résultat IFI recalculé. Les nouvelles branches sont
  additives : un dossier n'utilisant aucun des nouveaux champs
  (`ifiOwnershipRight`, `ifiDismembermentBasis`, `ifiUsufructuaryAge`,
  `ifiRepaymentKind`, `ifiOriginalPrincipal`, `ifiDisbursementDate`,
  `ifiContractualEndDate`, `ifiRelatedPartyDebt`, `ifiNonTaxPurposeProven`)
  et sans actif `isProfessionalAsset` sur un bien immobilier produit un
  résultat strictement identique à la V2. Aucune entrée ajoutée à
  `docs/agent/RECALCULATION_CANDIDATES.md`.
- **PF-02B2** : entrée n° 5 ajoutée à `docs/agent/RECALCULATION_CANDIDATES.md`
  — la correction de l'arrondi DMTG (par tranche → final unique) modifie le
  résultat de **tout** dossier DMTG, Dutreil, démembrement ou assurance-vie
  757 B liquidé avant ce run (surévaluation systématique d'environ 1 € par
  dossier). Aucun résultat historique n'a été réécrit ; la reprise reste une
  décision humaine, dossier par dossier.
- **PF-02B3** : aucun résultat existant recalculé. Le nouveau paramètre
  `holdingAnimatrice` est entièrement additif et absent de tous les dossiers
  Dutreil déjà liquidés (le champ n'existait pas avant ce run) : aucun run
  historique ne peut donc l'avoir engagé. Aucune entrée ajoutée à
  `docs/agent/RECALCULATION_CANDIDATES.md`. À l'usage, tout dossier Dutreil
  portant sur des titres de holding **devrait désormais renseigner**
  `holdingAnimatrice` pour bénéficier du contrôle — un dossier existant qui
  ne le fait pas continue de recevoir l'abattement de 75 % sans ce contrôle
  supplémentaire, exactement comme avant PF-02B3 (aucune régression, mais
  aucune protection nouvelle tant que le paramètre n'est pas engagé).
