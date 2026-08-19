# PATRIMOINE FISCAL — CURRENT STATE

Last updated: 2026-08-20

## Git state

Branch: codex/pf-03b-postgres-tenant-isolation
HEAD before PF-03B: 7135daf954e27b3b77db96ec3d4b2be97b886b1a
HEAD before PF-03A: ef64ae7fb64cccca32c8d0af9c21652cc2aa0f88
HEAD before PF-01: afe1a79713eeb16935993d04d10d9f263569d1a6
HEAD before PF-01B: a1a6d0cb2bb0ec7993aa99dd408b0838a126d3d8
HEAD before PF-01C1: 8531cc900f6bf5eaccbdaa28949cba8f6c15a13c
HEAD before PF-01C2: b1263b2053ebcd5616fdaac1dc2c3c114b566a9a
HEAD before PF-01C3: 7c7597a7805f01170c6319232cbaee6e5c7cd7a4
HEAD before PF-01C4: b8cb7050d4aeceed6c16e2d2bc09597d472a9149
HEAD before PF-02: b3b2dade33d1fad80286c5ff98edf130e703d935
git diff --check: PASS (exit 0, no whitespace/conflict-marker errors)

## Current milestone

MVP cabinet-ready — Q1 2027

## Current priority

PF-03-PUBLISH — publish the committed PF-03 branch and exercise the migration,
credentials, backup/restore and smoke checks on the selected managed PostgreSQL
environment. Clerk authenticated mapping remains PF-04 scope.

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

Unit: PASS — 70 files, 895 tests, 0 failing. The total includes duplicate suites
discovered under existing `.claude/worktrees`; root PF-03B adds 1 file / 5 tests.
PostgreSQL/RLS: PASS — 1 file, 12 tests, 0 failing on a fresh native ephemeral
PostgreSQL 18.4 cluster after migrations `0000` through `0004`.
TypeScript: PASS — `npx tsc --noEmit` exit 0
Lint: PASS — `npm run lint` exit 0
Build: PASS — `npm run build` exit 0
PostgreSQL fresh migration + synthetic seed: PASS — executed automatically by
`npm run test:postgres`; no shared or user database was touched.
git diff --check: PASS — exit 0, no whitespace/conflict-marker errors.
E2E: NOT RUN — Playwright harness starts a server, not reliably runnable in this
non-interactive environment. PF-03B changes repository/database boundaries, not
an authenticated browser flow; E2E remains required before production release.

## Open blockers

No PF-03 implementation blocker. The fresh native PostgreSQL migration/RLS
exercise passes locally. Provider-specific staging credentials, migration,
backup/restore and smoke verification remain PF-03-PUBLISH deployment gates;
no managed database was supplied or mutated in this task. Clerk mapping remains
PF-04. The P1/P2 fiscal backlog, regulatory-review items and recalculation
candidates below remain open.

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
- DMTG rounding convention: **[BLOCKED — ROUNDING POLICY LEGAL REVIEW
  REQUIRED]**. The repository rounds per bracket (reproducing the official
  service-public example, 50 000 € → 8 195 €) while the reference rounds once on
  an exact base. 1 € divergence on the 1 M€ Dutreil golden case (repo 14 098 €
  vs reference 14 097 €). Both conventions are source-backed. The golden
  expected was NOT changed to hide the gap; the repository convention stands
  until a fiscal reviewer arbitrates. Policy documented in
  `docs/agent/PF02_GOLDEN_COVERAGE.md` § 7.
- Nine `draft` rules are referenced by engines producing calculation steps.
  All those runs carry `professionalValidationRequired` and `needs_review`.
  Promoting them to `active` is a governance decision requiring per-rule review,
  not a technical fix — deliberately left open (PF02 report § 1).

## Known technical debt

P1 (need legal interpretation — separate runs, out of PF-02 scope):
- IFI V0: décote complète, plafonnement, démembrement, in-fine and family debts.
- Holding animatrice: not modelled (faisceau d'indices + `needs_review`).
- Holding tax: foreign-company path `NOT_IMPLEMENTED`.

P2 (structural, low risk):
- Golden boundaries missing for SCI IR/IS and CEHR/CDHR (exit tax, IS and PER
  boundaries were added in PF-02).
- DMTG rounding arbitration (blocked on legal review).
- Status of the nine `draft` rules referenced by engines.
- Possible extension of the static fiscal-constant audit to `lib/**`.

## Next recommended task

PF-03-PUBLISH — publish the PF-03 branch without code changes, provision the
managed PostgreSQL login-role memberships, apply migrations, run the guarded
synthetic seed only in an approved demo environment, and document backup/restore
plus staging smoke evidence.

## Handoff notes

PF-03 intentionally does not connect Clerk. Until PF-04, database mode accepts
tenant authority only through the branded internal server context, never
through a browser payload. `DATABASE_URL` must use a login with no direct table
grants and membership only in `patrimoine_app`; `DATABASE_ADMIN_URL` remains a
deployment-only secret for migrations and the explicitly guarded demo seed.
Run `npm run test:postgres` before any RLS/repository change.

Agents MUST update this document at the end of every implementation task.
