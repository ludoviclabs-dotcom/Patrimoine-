# PATRIMOINE FISCAL — CURRENT STATE

Last updated: 2026-08-19

## Git state

Branch: claude/patrimoine-fiscal-bootstrap-a045d2 (fresh worktree off `main`
after PR #9 merged the prior `claude/patrimoine-fiscal-context-e5b7df` work;
HEAD is exactly the merge commit, confirmed via
`git merge-base --is-ancestor` against `origin/main`)
Merge commit (PR #9): ef64ae7fb64cccca32c8d0af9c21652cc2aa0f88
HEAD before PF-01: afe1a79713eeb16935993d04d10d9f263569d1a6
HEAD before PF-01B: a1a6d0cb2bb0ec7993aa99dd408b0838a126d3d8
HEAD before PF-01C1: 8531cc900f6bf5eaccbdaa28949cba8f6c15a13c
HEAD before PF-01C2: b1263b2053ebcd5616fdaac1dc2c3c114b566a9a
HEAD before PF-01C3: 7c7597a7805f01170c6319232cbaee6e5c7cd7a4
HEAD before PF-01C4: b8cb7050d4aeceed6c16e2d2bc09597d472a9149
HEAD before PF-02: b3b2dade33d1fad80286c5ff98edf130e703d935
HEAD before PF-02B1: ef64ae7fb64cccca32c8d0af9c21652cc2aa0f88
HEAD before PF-02B2: b293984899e589b019cc6cf1c90f3da3effbea5a
git diff --check: PASS (exit 0, no whitespace/conflict-marker errors)

## Current milestone

MVP cabinet-ready — Q1 2027

## Current priority

PF-02B3 — Harden holding animatrice qualification. P0 register closed: 7 of 7
fixed, 0 remaining. PF-02 COMPLETE. PF-02B1 COMPLETE (IFI démembrement, dettes
avancées, actifs professionnels). PF-02B2 COMPLETE (arrondi DMTG corrigé,
gouvernance des règles draft renforcée). PF-03 (Postgres/migrations/RLS and
beyond) remains reserved and unrenamed, per explicit instruction, until the
PF-02B fiscal sub-series concludes.

## Completed

- Agent context layer installed.
- 2026-08 reference baseline installed.
- Source routing configured.
- Claude Code project memory configured.
- Codex AGENTS instructions configured.
- PF-00 validated in Claude Desktop isolated worktree.
- PF-01 (partial) — fiscal engine reconciliation against the 2026 approved reference.
- PF-01B — TAX-P0-006 (main residence capital-gain exemption) fixed.
- PF-01C1 — TAX-P0-002 (PFU as a global constant) fixed.
- PF-01C2 — TAX-P0-003 (apport-cession not versioned by operative date) fixed.
- PF-01C3 — TAX-P0-004 (holding-tax base not a closed statutory list) fixed.
- PF-01C4 — TAX-P0-005 (e-invoicing timeline not date-aware) fixed.
- **PF-01 COMPLETE — 7 of 7 P0 fixed.**
- **PF-02 COMPLETE — rule governance invariants + golden coverage hardened.**
- PR #9 merged into `main` (bootstrap session confirmed HEAD, PF-00/01/02
  state, and P1 inventory from a fresh worktree; no files modified in that run).
- **PF-02B1 COMPLETE — IFI démembrement art. 968, dettes in fine/sans
  terme/liées, plafond dettes 60 %, actifs professionnels déclarés.**
- **PF-02B2 COMPLETE — arrondi DMTG corrigé (arrondi par tranche → arrondi
  final unique, BOI-ENR-DG-30) ; gouvernance des règles draft renforcée par
  des invariants automatisés.**

## PF-02B2 — DMTG rounding and draft-rule governance (COMPLETE)

Full report: `docs/agent/PF02B_FISCAL_COMPLETENESS.md` (sections « DMTG —
arrondi » et « Gouvernance des règles draft »).

**Arrondi DMTG** : la V1 (`rule-dmtg-bareme-2026-v1`, désormais archivée)
arrondissait chaque tranche du barème progressif à l'euro avant sommation
(`perSliceRounding`). Vérification sur trois sources officielles
(legifrance.gouv.fr art. 1657 — écarté, ne s'applique qu'aux impôts directs ;
BOFiP BOI-ENR-DG-30 § 100 — arrondi une seule fois sur le montant final dû ;
service-public.gouv.fr fiche F14205 — exemple chiffré officiel confirmant
l'arrondi final unique, 18 194,35 € → 18 194 € et non 18 195 €) : les trois
convergent, aucun `[BLOCKED]` nécessaire. `rule-dmtg-bareme-2026-v2` (active)
calcule chaque tranche au centime exact et arrondit une seule fois, à la fin.
Corrige le cas de référence Dutreil 1 M€ : 14 098 € → **14 097 €**, conforme
au golden `DUTREIL-2026-ARTICLE-790` de `MOTEURS_FISCAUX_2026.ts`. Impact
systématique (~1 €) sur tout dossier DMTG/Dutreil/démembrement/assurance-vie
757 B — entrée n° 5 ajoutée à `docs/agent/RECALCULATION_CANDIDATES.md`,
aucun résultat historique réécrit.

**Gouvernance draft** : inventaire empirique (via `getAllTaxRuns()`, pas un
grep textuel) — 9 des 19 règles `draft` du registre sont effectivement
consommées par un moteur produisant des `calculation_steps` (transmission
avec démembrement, PER, import bancaire démo, checklist succession, sortie
anticipée PER résidence principale, stress test liquidité succession,
adéquation produit démo, assurance-vie 990 I/757 B, arbitrage SCI IR/IS).
Aucune promotion à `active` : chacune bute sur au moins un des quatre
critères (source/date/golden/absence de question ouverte) — y compris
l'assurance-vie, dossier le plus solide, bloqué par les clauses démembrées et
contrats multiples non automatisés. Nouveau fichier
`tests/unit/pf02b2-draft-rule-governance.test.ts` (7 invariants) : aucune
étape référençant une règle `draft` n'affiche jamais `confidenceStatus:
"validated"` ni `displayStatus: "validated_calculation"` ; tout run
concerné porte `status: "needs_review"` et `professionalValidationRequired:
true` ; l'inventaire empirique est verrouillé contre une dérive silencieuse.

## PF-02B1 — IFI completeness gate (COMPLETE)

Full report: `docs/agent/PF02B_FISCAL_COMPLETENESS.md`

Scope: IFI only, per explicit instruction. No other engine, and no
infrastructure (Postgres/Auth/UI/PDF/watcher/AI), was touched.

Starting point clarified: décote, exact barème and the 75 % global cap
(art. 979) were **already correct** before this run — verified mathematically
equivalent to `docs/reference/2026-08/MOTEURS_FISCAUX_2026.ts` `computeIfi2026`
— they only lacked boundary golden coverage, now added. The real gap was
démembrement, advanced debts and professional assets.

Implemented (all additive to `Asset`/`Liability`, zero behavior change when
the new fields are absent — the Claire/Marc golden case is unchanged at
1 110 000 €):
- Démembrement (CGI art. 968): general rule (full value to the usufructuary,
  nothing to the bare owner) by default; the art. 669 age-based split
  (`getBareOwnershipRate`, already sourced in `lib/tax/engine-kit.ts`) applies
  only when a closed, legally-grounded exception is declared
  (`legal-usufruct-surviving-spouse` or
  `sale-with-reserved-usufruct-unrelated-third-party`, confirmed on
  Légifrance 19/08/2026) **and** the usufructuary's age is provided — an
  exception claimed without an age never triggers a presumed split.
- Debts (CGI art. 974): in fine / non-constant loans and no-term loans use the
  statutory linear formulas (reusing `fullYearsBetweenIso` from
  `lib/tax/holding-tax-assets.ts`, the same mechanism already sourced for
  holding-tax debts in PF-01C3); related-party debt is excluded unless a
  non-tax purpose is proven; missing capital/dates never get estimated —
  the debt is simply not admitted and flagged. The 60 %-of-assets debt cap
  (art. 974, IV) is implemented and reproduces the reference's own worked
  example exactly (assets 6 M€, debt 5,5 M€ → 4,55 M€ admitted).
- Professional assets (CGI art. 975): `Asset.isProfessionalAsset` — already
  declared in the type but never consumed by the IFI engine — now excludes a
  real-estate asset from the base, with a mandatory `needs_review` step
  requiring annual documentation. Eligibility conditions themselves are not
  automated; the declaration alone is never treated as proof.

Rule governance: `rule-ifi-complete-2026-v3` (`IFI-2026.08-V3`) active,
`rule-ifi-complete-2026-v2` archived (fiscal behavior changed — new
deterministic branches added). New evidence source
`src-legifrance-bofip-ifi-avance-2026` (Légifrance CGI art. 968/974/975 +
BOFiP PAT-IFI-20-40-10/20 and PAT-IFI-30-10, verified 19/08/2026).
`coverage-ifi-demembrement-complexe` upgraded `not_covered_v1` →
`partially_covered`.

22 new golden cases (`tests/unit/ifi.test.ts`, 279 → 301 tests): threshold
boundaries (1 299 999 / 1 300 000 / 1 300 001 €), décote zone including the
reference's own `IFI-DECOTE-1310000` golden (1 445 €), décote phase-out at
1 400 000 €, the reference's own `IFI-DEBT-CAP-6M-5M5` golden (4,55 M€), in
fine and no-term debt formulas, related-party debt proven/unproven,
insufficient-data abstention, démembrement general rule and art. 669
exception (both sides, both with and without a missing age), professional
asset exclusion, SCI non-regression, and the 75 % cap at its exact boundary.

Limitations left open (not this run's scope): quasi-usufruit and chained
dismemberment, professional-asset eligibility conditions themselves (only the
declared-flag pass-through was added), individual per-debt eligibility
conditions for ordinary debt, trusts, complex non-residents, advanced
holdings. All unchanged from before PF-02B1 and still `NOT_IMPLEMENTED` or
generically `needs_review`.

No recalculation candidate: every new branch is additive and inert unless the
new fields are explicitly set, so no previously-produced IFI result changes.

Environment note: this worktree had no `node_modules` installed (each Git
worktree has its own, separate from the canonical repo). `npm install` was
run to complete `tsc`/`build` validation — 532 packages, matching
`package-lock.json` exactly, no version changed. Infrastructure, not a
dependency decision.

## PF-02 — Rule governance and golden coverage (COMPLETE)

Full report: `docs/agent/PF02_GOLDEN_COVERAGE.md`
Recalculation register: `docs/agent/RECALCULATION_CANDIDATES.md`

No fiscal amount was changed in PF-02. It hardens the infrastructure that makes
amounts traceable, and fills the golden gaps left by PF-01.

Registry audit: 55 rules (24 active → 23, 12 archived → 13, 19 draft). Clean on
every hard invariant — no duplicate ids, no active rule without a source, no
dangling source ref, no step without a `ruleVersionId`, no engine referencing an
unknown or archived rule.

One anomaly found and fixed: `rule-ifi-simplified-2026-v1` and
`rule-ifi-complete-2026-v2` were both `active` with the same `effectiveFrom` and
the same scope, while the IFI engine referenced only V2. V1 archived — no
existing calculation changed. Invariant B is what surfaced it.

Governance invariants added (13 tests, `tests/unit/pf02-rule-governance.test.ts`):
active-rule completeness, no duplicate ids, no undeclared second active rule per
ruleSet (explicit allowlist), archived rules stay resolvable, every run has
calculation steps, every step has a valid and non-archived `ruleVersionId`, no
placeholder sources, no inverted date range, a boundary date resolves exactly
one temporal version.

Abstention and historical-reproducibility invariants added
(`tests/unit/pf02-abstention-and-history.test.ts`): a missing operative date,
missing qualification fact or unsupported sub-regime never yields an exemption,
a default rate, the current rule version or a confirmed result; and every dated
engine can select a prior regime from an explicit date (PFU 01/01/2026,
150-0 B ter 21/02/2026, holding tax 31/12/2026, e-invoicing 2026/2027).

Golden coverage added (P2): exit tax boundaries (800 k€, 50 %, 6/10 years,
2,57 M€ relief), IS boundaries (42 500 €, 10 M€ turnover, 763 000 € social
contribution), PER boundaries (PASS floors, 37 680 / 88 911 € caps, age-70
block).

Static fiscal-constant audit: no hardcoded rate or threshold in `components/`
or `app/` — the guard fails the suite if one is reintroduced.

## PF-01 → PF-01C4 — Fiscal reconciliation (COMPLETE, 7 of 7 P0 fixed)

Full report: `docs/agent/PF01_FISCAL_RECONCILIATION.md`

Engines audited: IR, CEHR, CDHR, PFU, IFI, plus-value immobilière, résidence
principale, DMTG, Dutreil, apport-cession 150-0 B ter, taxe holding 235 ter C,
démembrement, assurance-vie, IS, SCI, exit tax, PER.

P0 detected: 7 of 7 in the approved P0 register (REGLEMENTATION_AOUT_2026.md
§ 17) confirmed as genuinely present in the code.

P0 fixed (7 — all):
- TAX-P0-001 (Dutreil) — réduction de 50 % rattachée à tort à l'ancien art. 790 I
  et désactivée après le 21/02/2026. L'art. 790 CGI n'a pas été abrogé par la
  LF 2026. Sur le cas de référence, les droits passent de 78 195 € à 39 098 € :
  la V3 surévaluait les droits de 39 097 €.
- TAX-P0-007 (Dutreil) — régime non versionné : engagement individuel 4 ans avant
  le 21/02/2026 / 6 ans à compter, exclusions LF 2026 non rétroactives.
- TAX-P0-006 (plus-value immobilière, PF-01B) — `isMainResidence: boolean` seul
  déclenchait une exonération totale automatique (sous-estimation de l'impôt).
  Remplacé par `assessMainResidenceExemption` (`eligible` / `not-eligible` /
  `needs_review`) : seule une occupation confirmée au jour de la cession, ou une
  vacance avec diligences de vente et délai ≤ 12 mois (tolérance BOFiP), déclenche
  l'exonération. Toute situation insuffisamment documentée retombe sur
  l'imposition normale, jamais sur une exonération silencieuse.
- TAX-P0-002 (PFU, PF-01C1) — le taux agrégé de 31,4 % était la source primaire
  du calcul, sans catégorie de revenu ni date. Remplacé par un registre de
  profils par catégorie (`lib/tax/investment-income-profiles.ts`) conservant les
  composantes IR et prélèvements sociaux séparées, l'agrégat n'étant plus qu'une
  valeur dérivée d'affichage. Résolution par catégorie ET par date : pivot
  LFSS 2026 au 01/01/2026 (17,2 % → 18,6 %), sauf produits dérogatoires
  (assurance-vie, CEL/PEL/PEP historiques) maintenus à 17,2 %.
  Corollaire : le moteur PEA retenait 17,2 % par défaut alors que le PEA n'est
  pas dérogatoire — corrigé à 18,6 %, soit une sous-imposition de 1,4 point.
- TAX-P0-003 (apport-cession 150-0 B ter, PF-01C2) — le moteur ne recevait
  aucune date : 70 % / 36 mois / conservation 5 ans étaient en dur, donc le
  régime LF 2026 était rétro-appliqué aux cessions antérieures au 21/02/2026.
  Le régime est désormais résolu par la DATE DE CESSION des titres apportés
  (`disposalDate`, nouveau champ), au jour près :
  cessions 01/01/2019 → 20/02/2026 = 60 % / 2 ans / 12 mois ;
  cessions à compter du 21/02/2026 = 70 % / 3 ans / 5 ans.
  En l'absence de date, le moteur s'abstient (`undetermined`, `needs_review`) —
  le régime 2026 n'est jamais présumé. Vérifié en complément du référentiel sur
  legifrance.gouv.fr (versions consolidées de l'art. 150-0 B ter).
- TAX-P0-004 (taxe holding 235 ter C, PF-01C3) — l'assiette additionnait
  `luxuryAssetsValue + financialAssetsValue + realEstateLuxuryValue +
  cashAndReceivablesValue` puis appliquait 20 % : la trésorerie et les titres
  financiers étaient donc taxés par analogie. Remplacé par la LISTE FERMÉE du
  II A (`lib/tax/holding-tax-assets.ts`) : chasse, pêche, véhicules/yachts/
  aéronefs, bijoux et métaux précieux, chevaux, vins et alcools, logements à
  jouissance réservée. Champ temporel, assujettissement, assiette et
  liquidation sont désormais quatre étapes distinctes. Trésorerie et titres
  financiers alimentent le seuil de 5 M€ et la qualification des revenus
  passifs, jamais l'assiette. Affectation opérationnelle, exception
  musée/exposition, dettes des logements (capital restant dû / amortissement
  linéaire / un vingtième par an, dettes liées exclues sauf preuve) modélisées.
  Société étrangère : NOT_IMPLEMENTED, bascule en revue.
- TAX-P0-005 (facturation électronique, PF-01C4) — l'échéance était une chaîne
  statique (`"1er septembre 2026"`) : aucun statut passé/futur calculable,
  aucune distinction réception / émission / e-reporting, aucune catégorie
  d'entreprise. Remplacé par un registre de 9 jalons structurés et un résolveur
  `resolveEInvoicingTimeline({ companySize, asOfDate })`. `asOfDate` est
  explicite — le moteur n'appelle jamais l'horloge système, les tests sont
  déterministes. Jalons : 01/09/2026 réception toutes entreprises + émission et
  e-reporting GE/ETI ; 01/09/2027 émission et e-reporting PME/TPE/micro. Taille
  inconnue → `qualificationRequired`, jamais de présomption. Calendrier
  recontrôlé sur impots.gouv.fr et economie.gouv.fr.

Rule governance:
- `rule-dutreil-2026-v4` (DUTREIL-2026.08-V4) active, `rule-dutreil-2026-v3` archived.
  Evidence source `src-bofip-dmtg-reduction-790-2026` corrected (it asserted the
  abrogation). Rule diff rewritten as V3 → V4.
- `rule-plus-value-immobiliere-2026-v3` (PV-IMMO-2026.08-V3) active,
  `rule-plus-value-immobiliere-2026-v2` archived. New coverage limit
  `coverage-plus-value-main-residence`.
- `rule-pfu-arbitrage-2026-v2` (PFU-ARBITRAGE-2026.08-V2),
  `rule-ir-pfu-cdhr-2026-v3` (IR-PFU-CDHR-2026.08-V3) and
  `rule-pea-withdrawal-2026-v2` (PEA-2026.08-V2) active; predecessors archived.
- `rule-apport-cession-2019-v1` (APPORT-CESSION-2019.08-V1) and
  `rule-apport-cession-2026-v3` (APPORT-CESSION-2026.08-V3) active — one per
  regime, both selected by disposal date; `rule-apport-cession-pre-2019-v1`
  draft (holding period undocumented); `rule-apport-cession-2026-v2` archived.
- `rule-holding-tax-2026-v3` (HOLDING-TAX-2026.08-V3) active, effective
  2026-12-31; `rule-holding-tax-2026-v2` archived.
- `rule-e-invoicing-timeline-2026-v2` (E-INVOICING-2026.08-V2) active;
  `rule-e-invoicing-readiness-2026-v1` archived.

P0 confirmed but NOT fixed: **none**. All 7 entries of the approved P0 register
(REGLEMENTATION_AOUT_2026.md § 17) are fixed and covered by golden cases.

RECALCULATION CANDIDATE (PF-01C2): apport-cession runs produced before PF-01C2
were all liquidated under the 70 %/3-year/5-year regime regardless of the actual
disposal date. Files concerning a disposal before 21/02/2026 were assessed
against too high a threshold and too long a holding period. No automatic
migration was run and no historical result was rewritten.

RECALCULATION CANDIDATE (PF-01C3): holding-tax runs produced before PF-01C3 were
liquidated on an open base including cash and financial securities. Any file
with a value entered in those fields OVERSTATED the tax. No automatic migration
was run and no historical result was rewritten.

Two pre-existing golden cases locked in erroneous rules and were replaced (not
adjusted to pass): the art. 790 abrogation in PF-01, and the bare-boolean main
residence exemption in PF-01B. Both replacements are legally justified in the
reconciliation report.

## Worktree validation (PF-00D)

Canonical repository: C:\Users\Ludo\Documents\Patrimoine
Active worktree: C:\Users\Ludo\Documents\Patrimoine\.claude\worktrees\suspicious-mahavira-7950c5
Shared git-common-dir: C:/Users/Ludo/Documents/Patrimoine/.git — CONFIRMED same repository
Branch: claude/patrimoine-fiscal-context-e5b7df
HEAD (pre-commit): f8a1f49f8f126f239674342fd66f468ef47c81a8

## Global CLAUDE.md status

C:\Users\Ludo\CLAUDE.md exists and contains instructions specific to a different, unrelated project ("Finance Learning Hub"). Searched C:\Users\Ludo\Documents for a matching repository (top-level dirs, GitHub\, Codex\, and grep for "Finance Learning Hub" / "finance-learning-hub") — no candidate repository found. Per governance, the file was left untouched. Claude Code cannot permanently delete files outside the repository under any circumstance — final relocation/removal of this file is a manual action for the user.

## In progress

None.

## Tests

Unit: PASS — 23 files, 309 tests (183 PF-01 baseline → 191 PF-01 → 198 PF-01B →
210 PF-01C1 → 219 PF-01C2 → 234 PF-01C3 → 244 PF-01C4 → 279 PF-02 → 301 PF-02B1
→ +8 net in PF-02B2: +7 draft-rule governance invariants, +1 golden 1 M€
Dutreil reproduisant DUTREIL-2026-ARTICLE-790), 0 failing
TypeScript: PASS — `npx tsc --noEmit` exit 0
Lint: PASS — `npm run lint` exit 0
Build: PASS — `npm run build` exit 0
E2E: NOT RUN — Playwright harness starts a server, not reliably runnable in this
non-interactive environment. Must be run before production release.

## Open blockers

None. The P0 register is closed (7 of 7 fixed). The P1/P2 backlog, the
regulatory-review items and the recalculation candidates below remain open and
are tracked separately — closing PF-01 covers the P0 register, not that backlog.

## Regulatory verification required

- Holding animatrice: not modelled. Requires a faisceau-d'indices approach with
  `needs_review`, per REGLEMENTATION_AOUT_2026.md § 7.4 and
  Cass. com., 17 déc. 2025, n° 24-17.415.
- Holding tax, foreign company: FOREIGN HOLDING PATH NOT_IMPLEMENTED. Requires
  the French participation fraction, dismemberment and anti-avoidance clause
  (§ 9.6); the engine abstains rather than generalising the French computation.
- Holding tax doctrine is not stabilised: a legal review remains mandatory on
  every file until it is.
- E-invoicing: a deferral decree remains legally possible. No hypothetical date
  was written into the engine; detecting such a change is the source-watcher's
  job (out of PF-01 scope).
- DMTG rounding convention: **RESOLVED in PF-02B2**. Per-bracket rounding was
  not source-backed by any official methodology — legifrance.gouv.fr art. 1657
  does not apply to DMTG (impôts directs only), and BOFiP BOI-ENR-DG-30 § 100 +
  service-public.gouv.fr's own worked example (fiche F14205, 18 194,35 € →
  18 194 €, not 18 195 €) both confirm a single final rounding. Fixed in
  `rule-dmtg-bareme-2026-v2`; the 1 M€ Dutreil golden case now matches the
  reference exactly (14 097 €). Full arbitration in
  `docs/agent/PF02B_FISCAL_COMPLETENESS.md` § « DMTG — arrondi ». Recalculation
  candidate entry added (RECALCULATION_CANDIDATES.md § 5) — no historical
  result rewritten.
- Nine `draft` rules are referenced by engines producing calculation steps
  (verified empirically in PF-02B2, not by grep). All those runs carry
  `professionalValidationRequired` and `needs_review`, now protected by
  automated invariants (`tests/unit/pf02b2-draft-rule-governance.test.ts`).
  Promoting any of them to `active` remains a governance decision requiring
  per-rule review — PF-02B2 confirmed none currently clears the bar (source +
  effective date + golden coverage + no open factual/legal question), even
  the strongest candidate (assurance-vie 990 I/757 B, blocked by unmodelled
  dismembered beneficiary clauses and multi-contract allocation). Deliberately
  left open.

## Known technical debt

P1 (need legal interpretation — separate runs, out of PF-02B1 scope):
- IFI: quasi-usufruit and chained/successive dismemberment; professional-asset
  *eligibility* conditions (only the declared-flag pass-through is
  implemented, per PF-02B1); individual per-debt eligibility conditions for
  ordinary debt (existence at 1 January, effective charge, justification) are
  still a generic `needs_review`, not individually verified. Décote, exact
  barème, the 75 % global cap, démembrement general rule + the two documented
  art. 968 exceptions, in fine/no-term/related-party debts and the 60 % debt
  cap are now IMPLEMENTED (PF-02B1) — see `docs/agent/PF02B_FISCAL_COMPLETENESS.md`.
- Holding animatrice: not modelled (faisceau d'indices + `needs_review`).
- Holding tax: foreign-company path `NOT_IMPLEMENTED`.

P2 (structural, low risk):
- Golden boundaries missing for SCI IR/IS and CEHR/CDHR (exit tax, IS and PER
  boundaries were added in PF-02).
- Status of the nine `draft` rules referenced by engines (confirmed still
  `draft` in PF-02B2, each with a documented, specific reason).
- Possible extension of the static fiscal-constant audit to `lib/**`.

## Next recommended task

PF-02B3 — Harden holding animatrice qualification (faisceau d'indices,
Cass. com. 17 déc. 2025 n° 24-17.415, REGLEMENTATION_AOUT_2026.md § 7.4).
Not started in this run.

## Handoff notes

Agents MUST update this document at the end of every implementation task.
