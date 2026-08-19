# PATRIMOINE FISCAL — CURRENT STATE

Last updated: 2026-08-20

## Git state

Branch: codex/pf-03b-postgres-tenant-isolation
HEAD before PF-03B: 7135daf954e27b3b77db96ec3d4b2be97b886b1a
HEAD before PF-03A: ef64ae7fb64cccca32c8d0af9c21652cc2aa0f88
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
HEAD before PF-02B3: e04fbd78b3d2191410b0c3a6687524f634cb4a70
git diff --check: PASS (exit 0, no whitespace/conflict-marker errors)

## Current milestone

MVP cabinet-ready — Q1 2027

## Current priority

PF-04A — Clerk Organizations integration. PF-03C has implemented the managed
PostgreSQL deployment gate tooling; provider/staging execution evidence remains
an operational follow-up before production data is admitted.

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
- **PF-03A COMPLETE — PostgreSQL tenant data foundation established with
  Drizzle migrations, repositories and explicit FIXTURE/DATABASE modes.**
- **PF-03B COMPLETE — PostgreSQL RLS, two-tenant isolation, audit hardening and
  idempotent Claire/Marc fixture migration are enforced and tested.**
- **PF-03 COMPLETE — data foundation + tenant isolation.**
- **PF-03C IMPLEMENTED — managed PostgreSQL migration/verification/smoke,
  backup/restore procedure and non-sensitive health readiness gate.**

## PF-03C — Managed PostgreSQL operational readiness (IMPLEMENTED)

Branch: `main`

HEAD before PF-03C: `e7571a71bdc2bb7e4d22ed863613a81b107a5b83`

PF-03C adds no fiscal calculation, fiscal rule, credential or provider lock-in.
It adds the operational contracts required to deploy the existing Drizzle/RLS
foundation to a managed PostgreSQL service:

- `DATABASE_URL` is runtime-only; `drizzle.config.ts` and all migration work
  use only the distinct `DATABASE_ADMIN_URL`.
- `npm run db:migrate` applies the journalled migrations and verifies the
  migration count, controlled group roles and forced RLS without automatic
  rollback; failures report a non-sensitive machine-readable code.
- `npm run db:verify` verifies the administrative schema/catalog path and the
  runtime login's `NOSUPERUSER`/`NOBYPASSRLS` membership in
  `patrimoine_app`. Repository transactions now reject an unsafe runtime login
  before it can assume that group role.
- `npm run db:smoke` is an explicit staging-only, RLS-scoped synthetic audit
  read/write. It cannot run in production.
- `npm run db:backup` and `npm run db:restore:verify` provide a `pg_dump` /
  `pg_restore` procedure with migration, row-count and RLS sanity checks; the
  restore command cannot run in production and does not create/drop databases.
- `GET /api/health` returns only `ok` or `not_ready` after runtime database,
  role and PF-03C migration/RLS-marker checks; it exposes no secret or tenant
  detail.

Files changed for PF-03C:

- `.env.example`, `drizzle.config.ts`, `package.json`;
- `drizzle/0005_pf03c_managed_postgresql_operational_readiness.sql`,
  `drizzle/meta/_journal.json`;
- `lib/db/managed-readiness.ts`, `lib/db/tenant-transaction.ts`;
- `scripts/managed-postgres-readiness.ts`, `scripts/managed-postgres-backup.ts`;
- `app/api/health/route.ts`;
- `tests/unit/pf03c-managed-postgres-readiness.test.ts`;
- `docs/agent/PF03_DATA_FOUNDATION.md`, `docs/agent/CURRENT_STATE.md`.

Validation executed: `npm test` PASS; focused PF-03C unit test PASS (3/3);
`npm run test:postgres` PASS (1 file, 12 tests, fresh native PostgreSQL 18.4
with migrations `0000` through `0005`); `npx tsc --noEmit` PASS; `npm run lint`
PASS; `npm run build` PASS outside the sandbox after Turbopack required access
to the Windows parent directory; `git diff --check` PASS.

PRODUCTION_VERIFICATION_PENDING: no managed PostgreSQL provider, staging
credential or safe staging database was available. No migration, seed, backup,
restore or smoke command was run against a shared/provider database. The
provider-native backup and the documented temporary-database restore must be
performed and evidenced before production data is accepted.

## PF-03B — PostgreSQL RLS and tenant isolation (COMPLETE)

Full report: `docs/agent/PF03_DATA_FOUNDATION.md`

PF-03B continues from PF-03A commit
`7135daf954e27b3b77db96ec3d4b2be97b886b1a`. Migration
`drizzle/0004_pf03b_postgres_rls_tenant_isolation.sql` creates controlled
`NOBYPASSRLS` application/fixture-service roles, membership-backed deny-by-
default policies, `ENABLE` + `FORCE ROW LEVEL SECURITY` on every tenant-owned
table, special global/tenant rule-version policies, remaining composite tenant
FKs and database triggers for audit actor and rule-version tenant linkage.

All PostgreSQL repository access now uses the shared transaction boundary in
`lib/db/tenant-transaction.ts`: a fixed application role, transaction-local
tenant/identity/role settings, an active non-revoked membership check and one
atomic operation. The tenant resource repository scopes dossier, document,
simulation and audit access and records sensitive dossier/document operations
with actor, tenant, action, resource, timestamp, correlation and sanitized
metadata. Dossier deletion remains a soft delete.

`npm run db:seed:demo` provisions only stable synthetic Claire/Marc fixture
rows through the separate fixture-service role. It is idempotent, guarded by
explicit allow flags, requires the deployment-only `DATABASE_ADMIN_URL` and
never runs at application startup or as part of a structural migration.

`npm run test:postgres` provisions a native ephemeral PostgreSQL 18.4 cluster,
applies migrations `0000` through `0004`, creates CABINET_A and CABINET_B and
executes reciprocal repository/direct-ID attacks. The suite proves that A/B
cannot read/update/delete the other dossier, read the other document metadata,
simulation or audit, and that missing/mismatched context is denied. It also
checks forced-RLS catalog flags, non-bypass roles, FK boundaries, rule-version
linkage, rollback, audit fields, idempotent seed and simulation trace pinning.

No fiscal engine, rate, threshold, legal condition, rule activation, fixture
expected amount or golden expected result changed.

Files changed for PF-03B:

- `.env.example`, `package.json`, `package-lock.json`;
- `drizzle/0004_pf03b_postgres_rls_tenant_isolation.sql`,
  `drizzle/meta/_journal.json`;
- `lib/db/schema.ts`, `lib/db/seed-v2-1.ts`, `lib/db/seed-demo.ts`,
  `lib/db/tenant-transaction.ts`;
- `lib/repositories/postgres-data-foundation.ts`,
  `lib/repositories/tenant-resource-repository.ts`;
- `scripts/run-postgres-tests.mjs`, `scripts/seed-demo-postgres.ts`;
- `tests/postgres/pf03b-tenant-isolation.test.ts`,
  `tests/unit/pf03b-tenant-isolation.test.ts`;
- `docs/agent/PF03_DATA_FOUNDATION.md`, `docs/agent/CURRENT_STATE.md`.

## PF-03A — PostgreSQL production data foundation (COMPLETE)

Full report: `docs/agent/PF03_DATA_FOUNDATION.md`

PF-03A started from clean `main` after PF-02B merge. It preserves Drizzle and
does not introduce Prisma. Migration
`drizzle/0003_pf03a_postgresql_data_foundation.sql` plus the Drizzle migration
journal establish cabinet, provider-neutral identity, membership, tenant-owned
dossier/asset/document relationships, rule metadata, simulation snapshots,
calculation/evidence links, explicit simulation-rule pinning and audit identity
metadata.

Tenant-owned relationships now carry explicit `tenant_id` and composite foreign
keys. The application repository accepts a branded internal tenant context and
never a `tenantId` in the persistence command. The Postgres adapter validates an
active membership, dossier ownership, rule/evidence existence and writes the
run, steps, rule links and audit event in one transaction.

Runtime selection is explicit (`PERSISTENCE_MODE=FIXTURE|DATABASE`), with no
implicit database switch when `DATABASE_URL` happens to exist. Production data
access fails closed without an explicit mode. Claire and Marc remain operational
in fixture mode and are covered by the PF-03A persistence regression test.

No fiscal engine, rate, threshold, legal condition, rule activation or golden
expected result changed.

Files changed for PF-03A:

- `.env.example`, `drizzle.config.ts`, `package.json`;
- `drizzle/0003_pf03a_postgresql_data_foundation.sql`,
  `drizzle/meta/_journal.json`;
- `lib/db/client.ts`, `lib/db/schema.ts`, `lib/db/seed-v2-1.ts`;
- `lib/persistence/mode.ts`, `lib/tenancy/tenant-context.ts`;
- `lib/repositories/data-foundation-contract.ts`,
  `lib/repositories/fixture-data-foundation.ts`,
  `lib/repositories/postgres-data-foundation.ts`,
  `lib/repositories/pilot-readiness.ts`;
- `lib/services/simulation-persistence.ts`, `lib/audit/repository.ts`;
- `tests/unit/pf03a-data-foundation.test.ts`;
- `docs/agent/PF03_DATA_FOUNDATION.md`, `docs/agent/CURRENT_STATE.md`.
- PR #9 merged into `main` (bootstrap session confirmed HEAD, PF-00/01/02
  state, and P1 inventory from a fresh worktree; no files modified in that run).
- **PF-02B1 COMPLETE — IFI démembrement art. 968, dettes in fine/sans
  terme/liées, plafond dettes 60 %, actifs professionnels déclarés.**
- **PF-02B2 COMPLETE — arrondi DMTG corrigé (arrondi par tranche → arrondi
  final unique, BOI-ENR-DG-30) ; gouvernance des règles draft renforcée par
  des invariants automatisés.**
- **PF-02B3 COMPLETE — qualification holding animatrice (CGI art. 787 B) :
  faisceau de faits structurés, jamais un score, jamais une décision
  automatique favorable.**

## PF-02B3 — Holding animatrice qualification (COMPLETE)

Full report: `docs/agent/PF02B_FISCAL_COMPLETENESS.md` (section « Holding
animatrice »).

Prior audit confirmed the gap was real: zero occurrences of "holding
animatrice", `isHoldingCompany`, or equivalent qualification logic anywhere
in `lib/`/`components/`/`app/` — `simulateDutreilV2` took `eligibleOperatingValue`
as an already-qualified input, with no check on whether the transmitted
entity was itself a genuine animating holding.

New module `lib/tax/holding-animatrice.ts`, `assessHoldingAnimatrice(facts)`,
sourced directly (no secondary authority) from: **CGI art. 787 B, al. 1-2**
(Légifrance LEGIARTI000047623071, consolidated since LF 2024 — the four
cumulative criteria: activité principale, participation active, contrôle,
filiales opérationnelles, plus an optional supporting fact, prestations
internes, per "le cas échéant") and **Cass. com., 17 décembre 2025,
n° 24-17.415** (Légifrance JURITEXT000053196991, published, appeal rejected
— § 10: operational character assessed at the taxable event date, not the
declaration date; § 13: burden of proof on the taxpayer; the holding in that
case, MCFG, was found not animatrice because its subsidiaries were rental
SCIs, not operational).

Strict cumulative logic, no score: any core criterion explicitly `false` →
`NOT_QUALIFIED`; any core criterion `undefined` → `NEEDS_REVIEW`; all four
`true` but no contemporaneous evidence gathered → `NEEDS_REVIEW`; all four
`true` and evidenced but no professional validation confirmed →
`NEEDS_REVIEW`; only when all four are established, evidenced, and
professionally validated → `QUALIFIED`. `operationalAssetRatio` is captured
but deliberately never enters any decision branch, so it can never become an
automatic safe harbor (REGLEMENTATION_AOUT_2026.md § 7.4 and § 12.3).

Additive integration into `simulateDutreilV2` via a new optional
`holdingAnimatrice?: { isHoldingCompany: boolean; facts?: HoldingAnimatriceFacts }`
parameter — absent or `isHoldingCompany: false` leaves every existing run
byte-for-byte unchanged (verified: the 2 M€ reference case still resolves to
78 194 €/39 097 €, per PF-02B2). When engaged, only `QUALIFIED` grants the
75 % exemption and the art. 790 50 % reduction; `NOT_QUALIFIED` and
`NEEDS_REVIEW` both deny the exemption outright (`exemptValue = 0`) — the
same "never presume a favorable outcome" pattern as TAX-P0-006 (main
residence). Quantitative Dutreil conditions (collective/management
commitments, 4/6-year individual commitment, LF 2026 exclusions)
untouched. `rule-holding-animatrice-2026-v1` active (ruleSet `dutreil`,
`effectiveFrom: 2024-01-01`), coexisting with `rule-dutreil-2026-v4` under a
declared `MULTI_ACTIVE_RULESETS` justification. 14 new golden cases
(`tests/unit/pf02b3-holding-animatrice.test.ts`) covering qualified,
passive, mixed-activity, incomplete-data, declarative/evidence
contradiction, no-evidence, and all three Dutreil-integration outcomes.

Note: this is a new *capability*, not a retroactive check — a Dutreil run
that doesn't pass `holdingAnimatrice` (including every run produced before
this task) keeps behaving exactly as before, unaffected. The parameter must
be explicitly engaged, same pattern as PF-02B1's IFI fields and PF-01B's
`mainResidenceQualification`.

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

Unit: PASS — `npm test` completed with 0 failures after PF-03C. The suite
includes duplicate suites discovered under existing `.claude/worktrees`.
PostgreSQL/RLS: PASS — 1 file, 12 tests, 0 failing on a fresh native ephemeral
PostgreSQL 18.4 cluster after migrations `0000` through `0005`.
TypeScript: PASS — `npx tsc --noEmit` exit 0
Lint: PASS — `npm run lint` exit 0
Build: PASS — `npm run build` exit 0
PostgreSQL fresh migration + synthetic seed: PASS — `npm run test:postgres`
executed migrations `0000` through `0005`, then passed 12 tests; no shared or
user database was touched.
git diff --check: PASS — exit 0, no whitespace/conflict-marker errors.
E2E: NOT RUN — Playwright harness starts a server, not reliably runnable in this
non-interactive environment. PF-03B changes repository/database boundaries, not
an authenticated browser flow; E2E remains required before production release.

## Open blockers

No PF-03C implementation blocker. The fresh native PostgreSQL migration/RLS
exercise passes locally. Managed-provider staging credentials, migration,
backup/restore and smoke evidence remain PRODUCTION_VERIFICATION_PENDING; no
managed database was supplied or mutated in this task. Clerk mapping remains
PF-04A. The P1/P2 fiscal backlog, regulatory-review items and recalculation
candidates below remain open.

## Regulatory verification required

- Holding animatrice qualification: **RESOLVED in PF-02B3**. Modelled as a
  structured fact-based assessment (`assessHoldingAnimatrice`), sourced
  directly from CGI art. 787 B, al. 1-2 (Légifrance LEGIARTI000047623071,
  consolidated since LF 2024) and Cass. com., 17 décembre 2025, n° 24-17.415
  (Légifrance JURITEXT000053196991, verified primary source, not a secondary
  summary). Strict cumulative logic, never a score; `QUALIFIED` requires all
  four statutory criteria established, evidenced, and professionally
  validated — anything less denies the Dutreil exemption outright rather
  than presuming it. Full detail in
  `docs/agent/PF02B_FISCAL_COMPLETENESS.md` § « Holding animatrice ». Complex
  chained-holding structures remain out of scope and safely resolve to
  `NEEDS_REVIEW` (see Known technical debt below) — not a regression, a
  documented, deliberate limitation.
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

P1 (need legal interpretation — separate runs, only remaining item is
holding tax foreign-company):
- IFI: quasi-usufruit and chained/successive dismemberment; professional-asset
  *eligibility* conditions (only the declared-flag pass-through is
  implemented, per PF-02B1); individual per-debt eligibility conditions for
  ordinary debt (existence at 1 January, effective charge, justification) are
  still a generic `needs_review`, not individually verified. Décote, exact
  barème, the 75 % global cap, démembrement general rule + the two documented
  art. 968 exceptions, in fine/no-term/related-party debts and the 60 % debt
  cap are now IMPLEMENTED (PF-02B1) — see `docs/agent/PF02B_FISCAL_COMPLETENESS.md`.
- Holding animatrice: **now modelled** (PF-02B3) for the single-holding case;
  complex chained-holding structures, quasi-usufruit on transmitted shares,
  and animation shared across several holdings remain out of scope and
  safely resolve to `NEEDS_REVIEW` via missing core facts — not a silent gap.
- Holding tax: foreign-company path `NOT_IMPLEMENTED`.

P2 (structural, low risk):
- Golden boundaries missing for SCI IR/IS and CEHR/CDHR (exit tax, IS and PER
  boundaries were added in PF-02).
- Status of the nine `draft` rules referenced by engines (confirmed still
  `draft` in PF-02B2, each with a documented, specific reason).
- Possible extension of the static fiscal-constant audit to `lib/**`.
- `holdingAnimatrice` is opt-in on `simulateDutreilV2`: no existing UI/demo
  caller currently supplies it, so no live dossier benefits from the new
  check yet. Wiring a UI qualification form is a product task, not a fiscal
  gap — the deterministic engine and its safeguards are ready.

## Next recommended task

PF-04A — Clerk Organizations integration. Before admitting production data,
an operator must still execute and retain evidence for the PF-03C managed
provider migration, runtime credential verification, staging smoke and
temporary-database restore procedure.

## Handoff notes

PF-03 intentionally does not connect Clerk. Until PF-04, database mode accepts
tenant authority only through the branded internal server context, never
through a browser payload. `DATABASE_URL` must use a login with no direct table
grants and membership only in `patrimoine_app`; `DATABASE_ADMIN_URL` remains a
deployment-only secret for migrations and the explicitly guarded demo seed.
Run `npm run test:postgres` before any RLS/repository change.

Agents MUST update this document at the end of every implementation task.
