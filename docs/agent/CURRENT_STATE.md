# PATRIMOINE FISCAL — CURRENT STATE

Last updated: 2026-08-22

## Git state

Branch: claude/pf-07-production-smoke-be7ac7
HEAD: cc61cdfe3a0282a7ca13491cd64081f6e68becd9 (merge of PR #14 into `main`)
origin/main: cc61cdfe3a0282a7ca13491cd64081f6e68becd9 — verified identical
Previous branch: claude/pf-07-cabinet-ux-auth-e2e
HEAD before PF-07B: 08b689c3782e15f8c145e80a79c93771d0f5ea5f
HEAD before PF-07: a7fab0b1d914dbbd28af153cc0d6d77ee4c73308 (merge of PR #13)
Previous branch: claude/private-document-storage-evidence-c569fd
HEAD before PF-06C4: 110e3c63c62525e0d09e646e200f833ac5397876
HEAD before PF-06C3: 7d0e4e6adcfb8c2612db62abdb0ce9d744964381
HEAD before PF-06C2: 029cc2bc90a6630bffb14aa15bb417bc3277a8fa
HEAD before PF-06C: 5096994c41449469eb6cc7441505932ea6c93bbd
HEAD before PF-06B: b3c1690f7eb1fcfb001f0fe6b2ba03aab09077d1
HEAD before PF-06: d9c3827f5f2bd2c6bfb0153d968517bdefdb5234
HEAD before PF-05: ccb5359dd296b9c189321844693d2c8aeec090e1
HEAD before PF-04A: 13d819165fbd3db1e1e2bbb0f3fe14cdb33402e0
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

PF-07 + PF-07B — **COMPLETE / VERIFIED_PRODUCTION**. PR
[#14](https://github.com/ludoviclabs-dotcom/Patrimoine-/pull/14) is **MERGED**
into `main` (merge commit `cc61cdf`), the merge deployment is live on
Production, and every non-destructive Production gate is closed.

### PF-07 final state — 2026-08-22

Detail: `docs/agent/PF07_CABINET_UX_E2E.md` sections 13 and 14.

| Evidence | Status |
|---|---|
| Production deployment `dpl_En9ppFF2jor5cAagnhR1jgmwENa5` READY | **PASS** |
| `/api/health` | **PASS** |
| migration `0010` marker | **PASS** |
| runtime FORCE RLS + safe runtime role | **PASS** |
| Production environment configuration | **PASS** |
| authenticated E2E, **staging** — 58 passed / 24 skipped / 0 failed | **PASS** |
| Production unauthenticated security | **PASS** |
| Production webhook persistence, idempotency, tamper refusal | **PASS** |
| Production runtime logs | **PASS** |
| Production destructive fixture journeys | `NOT_APPLICABLE_IN_PRODUCTION_BY_POLICY` |

**Reclassification.** The authenticated cabinet journeys are **not** a blocked
or failing gate. The application path is proven in staging against real Clerk
sessions, FORCE RLS, a `NOBYPASSRLS` login and the real Blob store. Replaying
them on Production is excluded **by policy**, because it would require seeding
the E2E fixture into the Production database
(`E2E_FIXTURE_SEED_FORBIDDEN_IN_PRODUCTION`), handing the harness the Neon
**owner** connection (PF-03C forbids it), driving synthetic membership
revocation on Production, or giving a fixture identity a password. The
safeguards that exclude it are themselves part of what PF-07 delivers. Nothing
was bypassed or weakened.

**Production webhook persistence — PASS, gate closed.**
`npm run db:verify:webhook` against the Production credential returns
`{"status":"verified","role":"patrimoine_webhook_service"}`. A synthetic
Svix-signed `organization.updated` delivery to the real Production endpoint
returned **200 `{"received":true,"processed":true}`**; a byte-identical replay
returned **200 `{"received":true,"processed":false}`** (idempotent — the
receipt insert hit `ON CONFLICT DO NOTHING` and the function returned before
rewriting any observation); a tampered body with the same signature returned
**400 `invalid_webhook`**, refused before any persistence code runs. `processed:
true` can only come from the transaction committing on
`CLERK_WEBHOOK_DATABASE_URL` through `patrimoine_webhook_service`, since the
route answers 503 when it throws. No secret value was read or printed. The
event named a **fresh synthetic organization**, so the delivery was
insert-only and mutated nothing existing; it is unmapped, so it authorizes
nothing. `record_clerk_webhook_event` never writes `memberships`,
`tenant_memberships` or `tenants`, so **no internal authoritative membership
was created**.

The **503** of 16:10:26 UTC is **historical**: it belongs to the previous
deployment `dpl_6ayMjXao…`, five minutes before the PF-07 deployment existed,
on the build predating the webhook configuration. The current deployment shows
**zero 5xx over a 6-hour window** and zero error/fatal/warning entries.

### PF-07-POST-MERGE production smoke — 2026-08-22

Full detail: `docs/agent/PF07_CABINET_UX_E2E.md` section 13.

| Deployment | Value |
|---|---|
| id | `dpl_En9ppFF2jor5cAagnhR1jgmwENa5` |
| commit | `cc61cdfe3a0282a7ca13491cd64081f6e68becd9` (GitHub `verified`) |
| target / state | `production` / **READY** |
| alias | `patrimoine-fiscal-demo.vercel.app` |

**PASS on the Production runtime:**

- **Health.** `/api/health` returns `{"status":"ok"}`, which the route emits
  only when `PERSISTENCE_MODE=DATABASE`, `DATABASE_URL` connects, the runtime
  login is NOSUPERUSER/NOBYPASSRLS with no direct table grant, the readiness
  marker is `0010_pf07b_professional_review_signature` and `rlsReady` is true.
  Migration `0010` and FORCE RLS are therefore confirmed through Production's
  own credential.
- **Denial surface.** Sessionless calls to the PF-07B review route, report
  generation, report validation and both private download routes all return
  **401 `CLERK_SESSION_REQUIRED`**. The review route answering at all is what
  proves the merge reached Production.
- **Webhook signature layer.** Unsigned and tampered deliveries both return
  **400 `invalid_webhook`**.
- **Cabinet screens.** `/report` and `/review` render the PF-07 shared error
  catalog live, with the machine-readable code; `/review` offers an
  unauthenticated visitor no signing surface.
- **Runtime logs CLEAN.** No 500, fatal, database, RLS, Blob or Clerk signature
  error on the deployment; `get_runtime_errors` finds no cluster over 24 h.

**The authenticated fixture journeys did not run on Production, and must not.**
EXPERT_A signing, CLIENT_A denial, EXPERT_B cross-tenant and revocation are
classified `NOT_APPLICABLE_IN_PRODUCTION_BY_POLICY` — see the reclassification
above. Their application path is proven in staging (58 passed, 24 skipped, 0
failed). Nothing was faked to make them appear green, and nothing was bypassed
to run them.

**Closed after this section was first written** (PF-07-FINAL-CLOSE, section 14
of the PF-07 report):

- **Production webhook persistence — PASS.** Signed delivery accepted and
  persisted, replay idempotent, tampered and unsigned refused.

**Still open, and deliberately not blocking:**

- the private PDF round-trip with a verified `pdfSha256` on Production, which
  needs an authenticated generation and therefore falls under the same policy
  exclusion as the journeys above;
- **E2E Blob artifact cleanup — `FOLLOW_UP`, NOT_RUN, nothing deleted**:
  identification is not certain from outside the store, and the rule is to
  remove nothing when uncertain.

The **503** of 16:10:26 UTC is **historical** — previous deployment
`dpl_6ayMjXao…`, five minutes before this one, on the build predating the
Production webhook configuration. The signed replay in section 14 returns
**200** on the current deployment, and that deployment shows **zero 5xx over a
6-hour window**.

Production is configured for the PF-03+ data layer against the shared pilot
database (see « Pilot deployment decision » below), and is wired to a Clerk
**development** instance — a second pre-live item alongside database
separation.

**PF-07B closes the last product gap PF-07 documented**: a professional can now
sign a review through the product. The authenticated journey signs the review
before validating, so the E2E pre-seeded `approved` review is gone.

The two follow-ups PF-06C4 left open are closed:

- **Clerk webhook persistence: PASS.** A dedicated `patrimoine_webhook` login
  is provisioned on the real Neon staging database and
  `CLERK_WEBHOOK_DATABASE_URL` is set on Vercel Preview. 9 gates PASS, 0 FAIL
  against real Neon through the real route handler.
- **Authenticated Playwright: PASS.** 8 journeys on 2 browser projects, with
  real Clerk sessions, FORCE RLS and the real capability matrix.
  `E2E_CLERK_FIXTURE=1 npm run e2e` gives **58 passed, 24 skipped, 0 failed** —
  previously 12 passed with the authenticated journeys skipped.

Full report: `docs/agent/PF07_CABINET_UX_E2E.md`

Vercel Preview `dpl_7YCxxiENt2VLaM3mWatbbPphkvUP` (target `preview`, never
`--prod`) is Ready; `/api/health` answers `{"status":"ok"}` from the deployed
runtime against real Neon — which also confirms migration `0010` landed — and
`/review` shows the error model live. Deployment Protection was left enabled.

## Publication and Production readiness (PF-07-PUBLISH)

**PR [#14](https://github.com/ludoviclabs-dotcom/Patrimoine-/pull/14) — MERGED**
on 2026-08-22, merge commit `cc61cdfe3a0282a7ca13491cd64081f6e68becd9`. The
record below describes the PR as it stood immediately before the merge —
base `main`, head `claude/pf-07-cabinet-ux-auth-e2e`, draft, `MERGEABLE`,
merge state `CLEAN`, 46 changed files, no review thread open. The branch was
pushed normally; nothing was forced, rebased or squashed.

CI: `quality` **pass**, `Vercel` **pass**, `Vercel Preview Comments` **pass**.
The PR's own Vercel Preview answers `{"status":"ok"}` on `/api/health`, and
`/review`, `/report`, `/cabinet` and `/dossiers` all return 200.

### Production database — migration 0010 PASS

Verified without reading or printing any credential, by comparing SHA-256
digests of the identifying fields between the Production and Preview
environments:

| Field | Production vs Preview |
|---|---|
| `POSTGRES_NEON_PROJECT_ID` | **SAME** |
| `POSTGRES_PGHOST` | **SAME** |
| `POSTGRES_PGHOST_UNPOOLED` | **SAME** |
| `POSTGRES_PGDATABASE` | **SAME** |
| `POSTGRES_DATABASE_URL_UNPOOLED` | **SAME** |

**Production and Preview target the same Neon database**, so migration `0010`
— applied during PF-07B — is already present for Production's target. Verified
directly on it: readiness attestation
`{"rlsReady":true,"migration":"0010_pf07b_professional_review_signature"}`,
11 applied migrations for 11 migration files, FORCE RLS on every sampled
tenant table, both new CHECK constraints present, and `reviewer_user_id` now
nullable alongside `reviewer_identity_id` and `signed_by_role`.

Roles on that database: `patrimoine_runtime` and `patrimoine_webhook` are both
`LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`; `patrimoine_app`,
`patrimoine_fixture_service` and `patrimoine_webhook_service` are `NOLOGIN`
group roles. `DATABASE_ADMIN_URL` is absent from every application environment,
as PF-03C requires.

### Production webhook — PASS

`CLERK_WEBHOOK_DATABASE_URL` is now configured on Production with the dedicated
`patrimoine_webhook` login. Re-verified immediately before configuring it:
`LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOINHERIT`, owns **0** tables, holds
**0** direct table grants, is a member of `patrimoine_webhook_service` and
**not** of `patrimoine_app` or `patrimoine_fixture_service`.
`npm run db:verify:webhook` reports `{"status":"verified"}`.

### PILOT DEPLOYMENT DECISION

**Production and Preview temporarily share the same Neon database.** This is
accepted for the current demo/pilot environment, on the owner's explicit
decision. **A dedicated Production database remains a pre-live requirement
before real client data is admitted.**

This is recorded here, in `docs/agent/PF07_CABINET_UX_E2E.md` and in the
next-task list so it cannot become silent debt. Two consequences follow while
it stands, and both are real:

1. A write made from Preview is visible in Production and vice versa. The
   authenticated E2E suite writes to this database — synthetic tenants only,
   but into the same rows Production reads.
2. Revoking Preview access means revoking Production access, because both use
   the same `patrimoine_runtime` login.

### Production environment, now configured

| Variable | Production | Note |
|---|---|---|
| `DATABASE_URL` | CONFIGURED | `patrimoine_runtime`, sensitive, Production-scoped |
| `PERSISTENCE_MODE` | CONFIGURED | `DATABASE` |
| `DOCUMENT_DOWNLOAD_SIGNING_SECRET` | CONFIGURED | fresh 48 random bytes, **not** the Preview value, sensitive |
| `CLERK_WEBHOOK_DATABASE_URL` | CONFIGURED | `patrimoine_webhook`, sensitive |
| `BLOB_READ_WRITE_TOKEN` | CONFIGURED | pre-existing |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | CONFIGURED | pre-existing |
| `CLERK_SECRET_KEY` | CONFIGURED | pre-existing |
| `CLERK_WEBHOOK_SIGNING_SECRET` | CONFIGURED | pre-existing |
| `DATABASE_ADMIN_URL` | **ABSENT** | deployment-only, as PF-03C requires |

The four new variables are scoped to **Production only**; they do not leak into
Preview or Development. No value was read or printed.

**The `patrimoine_runtime` password was rotated** to obtain a usable connection
string, because the Preview `DATABASE_URL` is stored as a sensitive variable
and is therefore write-only. The rotation set the password only — Neon's owner
is not a superuser and may not restate `SUPERUSER`/`BYPASSRLS`, which is itself
the guarantee that the rotation could not widen the role. The attributes and
group membership were asserted unchanged afterwards, and the Preview variable
was updated to the same new credential so neither environment is left holding a
dead one. Any previously exported copy of the old value no longer works.

`PERSISTENCE_MODE=DATABASE` becomes effective on the next Production
deployment, which should be the one produced by merging PF-07. The old `main`
was **not** redeployed to apply it early.

### Pre-merge database gate — PASS

Run against the shared database with the rotated runtime credential:

- `npm run db:verify` → `{"status":"verified","migration":"0010_pf07b_professional_review_signature"}`.
  That single command covers the migration count matching the file count, the
  controlled group roles being `NOLOGIN`/non-super/non-bypass, FORCE RLS on
  every declared table, and `assertSafeDatabaseRuntimeRole` on the runtime
  login.
- `npm run db:verify:webhook` → `{"status":"verified","role":"patrimoine_webhook_service"}`.

Migration `0010` was **not** re-applied: it was already present.

## Completed

- **PF-07B COMPLETE / VERIFIED_STAGING — professional review signing: server
  action, `/review` screen, migration `0010`, and the authenticated
  review-to-validation journey with no pre-seeded approval.**
- **PF-07 COMPLETE / VERIFIED_STAGING — Clerk webhook persistence, authenticated
  Clerk E2E fixture and journeys, fact-derived cabinet journey, shared error
  catalog, responsive and accessibility regression suites.**
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
- **PF-04A IMPLEMENTED / VERIFIED_LOCALLY — Clerk sign-in/sign-up, protected
  server-resolved workspace, signed idempotent organization webhook and a
  provider-neutral PostgreSQL mapping boundary.**
- **PF-04 COMPLETE (PF-04A + PF-04B) — authenticated tenant context, central
  RBAC, client dossier grants, RLS resource restriction and revocation tests.**
- **PF-05 COMPLETE / VERIFIED_STAGING — private versioned document storage,
  server-side MIME/size/name validation, SHA-256, short-lived signed download
  grants, quarantine workflow and simulation evidence linkage. Proven against
  the real Vercel Private Blob store and real Neon PostgreSQL in PF-06C4.**
- **PF-06 COMPLETE (PF-06 + PF-06B) / VERIFIED_STAGING — immutable report
  snapshots, reproducible server-side @react-pdf/renderer output, watermark
  policy, expert-only validation appended as a new version, private PDF
  storage, audited downloads, and the cabinet report screen wired onto the
  server pipeline with staleness detection and explicit error states. Proven
  against real providers in PF-06C4.**

## PF-07B — Professional review signing (COMPLETE / VERIFIED_STAGING)

Branch: `claude/pf-07-cabinet-ux-auth-e2e`

HEAD before PF-07B: `08b689c3782e15f8c145e80a79c93771d0f5ea5f`

Full report: `docs/agent/PF07_CABINET_UX_E2E.md` section 12

PF-07B adds no fiscal engine, and changes no fiscal rule, rate, threshold,
effective date, calculation step or golden expected result. It closes the one
gap PF-07 documented rather than fixed, and nothing else.

**Why a migration was required, and why it is safe.** The review model already
existed and was almost sufficient: `professional_reviews` carries the decision
enum, the motive, required actions, timestamp, composite tenant FKs and FORCE
RLS; `patrimoine_app` already held INSERT; `review.decided` already existed in
the audit enum; PF-06 reads the newest review, so a decision is an append.
One column blocked it — `reviewer_user_id uuid NOT NULL REFERENCES users(id)`,
pointing at the v1 per-tenant table. Every actor column added since PF-03A
points at `user_identities`, a Clerk session resolves to an identity, and
**there is no linkage between the two tables**. The existing PF-06 tests only
insert a review because the demo fixture gives `users[2]` and
`user_identities[2]` the same UUID — a fixture coincidence a real authenticated
expert cannot rely on. Migration
`0010_pf07b_professional_review_signature.sql` mirrors line for line what
PF-03A already did to `audit_logs`: `DROP NOT NULL` on the legacy column, add
`reviewer_identity_id`, add `signed_by_role`, plus two CHECK constraints (a
review always names a reviewer; a decided review always carries its timestamp)
and the index matching PF-06's read. Additive: no row rewritten, legacy rows
keep their `reviewer_user_id`. **The migration was approved before it was
written**, per the task's STOP instruction.

**The server action.** `lib/review/review-service.ts` and
`POST /api/v1/cases/{caseId}/reviews`: Clerk session → tenant context →
central capability matrix → RLS transaction → append-only audit. Two decisions
only (`approved`, `changes_requested`); `pending` is a state, not a signature,
and `rejected` would be a third workflow — neither was invented. The motive is
mandatory and refused before any authorization work. A decision appends a row,
so the review history is preserved. The audit event carries the decision, the
signing role and the review id, never the motive.

**RBAC, from the existing matrix, nothing invented.** `simulation.review` is
held by admin and expert. Conseiller, client and auditeur are denied — the role
that generates a report is deliberately not the role that reviews it. Cabinet B
on a cabinet A dossier gets `DOSSIER_NOT_FOUND` (invisible under RLS, never
confirmed to exist); a revoked member gets `TENANT_MEMBERSHIP_REQUIRED`; an
unknown identity gets `CLERK_TENANT_CONTEXT_DENIED`.

**A defect found while closing the gap.** `validateVersion` computed its
blocking flags from the *stored* snapshot only, so a version generated while
the review was signed could still be approved after a later review asked for
changes. PF-06B's documentation claimed the server enforced staleness; the UI
disabled the button but the server did not. Approving an `outdated` version is
now refused with `REPORT_REGENERATION_REQUIRED`; `changes_requested` and
`rejected` stay allowed while stale, which is the point of asking for changes.

**The review screen.** `/review` resolves its own tenant context exactly as
`/report` does and **reuses the same server read model**, extended with the
review history and a `signReview` capability — no parallel model, so a role, a
blocker or a decision cannot disagree between the two cabinet screens. The
fixture queue below is untouched. A client sees no signing surface.

**The E2E pre-seed is gone.** `lib/db/seed-e2e-fixture.ts` no longer inserts an
`approved` review. The journey is now: sign `changes_requested` → gate stays
closed and the delivered draft is untouched → sign `approved` → the *revue*
stage turns done → regenerate (the draft went stale) → validate → download.

Files changed for PF-07B:

- `drizzle/0010_pf07b_professional_review_signature.sql`, migration journal;
- `lib/db/schema.ts`, `lib/db/managed-readiness.ts`, `lib/db/seed-e2e-fixture.ts`;
- `lib/review/review-service.ts` (new),
  `app/api/v1/cases/[caseId]/reviews/route.ts` (new);
- `lib/report/report-service.ts` (staleness guard),
  `lib/report/report-console.ts` (review history + `signReview` capability),
  `lib/documents/runtime.ts`, `lib/errors/error-catalog.ts`;
- `components/review/server-review-console.tsx` (new), `app/review/page.tsx`;
- `tests/postgres/pf07b-professional-review.test.ts` (new),
  `tests/unit/pf07b-professional-review.test.ts` (new),
  `tests/e2e/authenticated-cabinet.spec.ts`,
  `tests/postgres/pf06-server-report.test.ts`,
  `tests/postgres/pf06b-report-console.test.ts`,
  `tests/unit/pf06-server-report.test.ts`,
  `tests/unit/pf07-cabinet-journey.test.ts`;
- `docs/agent/PF07_CABINET_UX_E2E.md`, `docs/agent/CURRENT_STATE.md`.

Two pre-existing assertions were drift-proofed rather than re-pinned to `0010`:
the PF-06 readiness attestation now reads `managedPostgresMigrationMarker`, and
the unit marker test asserts the marker names the newest migration file.

Validation executed: `npm test` PASS (36 files, 445 tests); `npm run
test:postgres` PASS (6 files, 66 tests, migrations `0000` to `0010`); `npm run
e2e` PASS (36 passed, 46 skipped); `E2E_CLERK_FIXTURE=1 npm run e2e` **PASS (58
passed, 24 skipped, 0 failed)**; `npx tsc --noEmit` PASS; `npm run lint` PASS;
`npm run build` PASS after `rm -rf .next`; `git diff --check` PASS.

Migration `0010` applied to the real Neon staging database. Vercel Preview
`dpl_7YCxxiENt2VLaM3mWatbbPphkvUP`, target `preview`, Ready; `/api/health`
returns `{"status":"ok"}`, which is what proves the migration landed on the
runtime login's view of the database. `/review`, `/report`, `/cabinet` and
`/dossiers` all answer 200.

Not pushed. No PR opened.

## PF-07 — Cabinet UX, authenticated E2E and workflow hardening (COMPLETE / VERIFIED_STAGING)

Branch: `claude/pf-07-cabinet-ux-auth-e2e`

HEAD before PF-07: `a7fab0b1d914dbbd28af153cc0d6d77ee4c73308`

Full report: `docs/agent/PF07_CABINET_UX_E2E.md`

PF-07 adds no fiscal engine, and changes no fiscal rule, rate, threshold,
effective date, calculation step or golden expected result. **No migration was
written**: the roles and functions PF-07 needed already existed from PF-04A.

**Inventory finding that shaped the work.** The routes named in the objective
are two products, not one. `/cabinet`, `/dossiers`, `/simulations`,
`/simulations/lab`, `/evidence` and `/review` are unauthenticated fixture
surfaces holding no tenant data; `/report` is the only cabinet screen wired to
PostgreSQL, RLS and RBAC. `proxy.ts` protects `/workspace(.*)` only, which is
correct: `/report` resolves its own context and degrades to a named unavailable
state, and the demo routes have nothing to guard.

**Clerk webhook persistence — PASS.** `patrimoine_webhook_service` already had
exactly the right minimal grants, so nothing was widened and no migration was
added. What was missing was a login able to assume it, a check that the login
is narrow, and evidence. `assertSafeClerkWebhookRole` now refuses superuser,
BYPASSRLS, table ownership, direct table privileges, the ability to assume
`patrimoine_app`, and the service role connecting directly.
`npm run db:verify:webhook` verifies a provisioned URL read-only. A dedicated
`patrimoine_webhook` login was created on real Neon and
`CLERK_WEBHOOK_DATABASE_URL` added to Vercel Preview as a sensitive variable;
no value was read or printed. 9 gates PASS / 0 FAIL against real Neon: valid
signature persisted, observations recorded as non-authoritative, replay
idempotent, tampered and unsigned denied with nothing written, no internal
membership created, synthetic rows cleaned up.

**Authenticated Clerk fixture — PASS, no password anywhere.** Sign-in uses the
official Clerk `ticket` strategy via `@clerk/testing`: the helper mints a
short-lived Backend-API sign-in token. Five synthetic `+clerk_test` identities
were provisioned on the development instance (the script refuses anything
else). `lib/auth/e2e-fixture-plan.ts` is the single declaration read by the
provisioning script, the seed and the specs. With `E2E_CLERK_FIXTURE=1` the
runner provisions a disposable PostgreSQL cluster, migrates it through the
journalled path, creates a PF-03C-shaped runtime login and seeds the Clerk
mapping; without the flag the public suite runs unchanged with no credential.

**Authenticated journeys — 8 journeys on 2 projects, all PASS.** Adviser
generates a watermarked DRAFT on the real Blob; expert validates into version
n+1 without mutating the draft and downloads the private PDF; client reads the
granted dossier, is offered no cabinet action, **loads no report version at
all**, and is refused `TENANT_AUTHORIZATION_DENIED` on a direct
`report.validate` call; cabinet B gets an empty listing rather than a
disclosing 404 and is refused on every cabinet A resource by id; a Clerk
organization member with no internal row is denied `CLERK_TENANT_CONTEXT_DENIED`
by both the page and the API; a revoked membership denies access while the
browser still holds a valid Clerk session cookie. No security control was
relaxed to make any of them pass.

**Cabinet journey — decoration replaced by fact.** The previous stepper was
rendered with a hardcoded `current={1}`, identical for every dossier.
`lib/cabinet/journey.ts` derives the six stages from the facts the report
console already loads, keeps `review` distinct from `blocked` so a vigilance
point is never presented as a stop, and advertises the first genuine stop as
the next action. It is a server component computed in the same tenant
transaction as the console.

**Error model — one catalog.** Three partial private copy tables were replaced
by `lib/errors/error-catalog.ts`, covering every code in the API status map
with a title, explanation, next action and severity. A test reads that map
directly, so a new server code without user-facing wording fails the suite.
Every string is a constant, so no message can carry data from another cabinet,
and cross-tenant refusals never confirm existence.

**Responsive — no defect found.** 7 routes at 6 widths (375/390/430/768/1024/
1440) plus tap targets: all PASS with no layout change. The audit is now a
regression test.

**Accessibility — one defect found and fixed.** `/report` carried two `h1`
elements because the browser preview titled itself as the page; it is one
section of that page, so its title became an `h2` and its 18 sub-headings were
demoted to `h3`. Headings only. The other 15 checks passed already.

**Server boundaries — nothing to fix.** No client component imports the
database, the Blob SDK or the storage adapter; none reads a server secret; the
console fetches only to mutate, so there is no client-side read waterfall.

Deliberately left open, documented rather than papered over: PF-06 exposes no
route to **sign a professional review**, so the *revue* stage has no server
action. The PostgreSQL suite signs it with SQL and the E2E fixture seeds it as
`approved` so the browser journey can reach validation. That is the one real
hole in the Qualification-to-Rapport chain and the natural first PF-08 item.
The fixture cabinet surfaces and the hardcoded AppShell dossier context are
also unchanged, on purpose.

Files changed for PF-07:

- `lib/db/managed-readiness.ts`, `lib/auth/clerk-webhook-repository.ts`,
  `scripts/managed-postgres-readiness.ts`, `scripts/run-postgres-tests.mjs`,
  `package.json`, `package-lock.json`, `vitest.config.ts`;
- `lib/auth/e2e-fixture-plan.ts`, `lib/db/seed-e2e-fixture.ts`,
  `scripts/e2e-clerk-fixture.ts`, `scripts/seed-e2e-fixture.ts`,
  `scripts/run-e2e.mjs`, `playwright.config.ts`, `tests/e2e/global-setup.ts`,
  `tests/e2e/support/clerk-fixture.ts`;
- `lib/cabinet/journey.ts`, `components/cabinet/cabinet-journey-bar.tsx`,
  `lib/errors/error-catalog.ts`, `lib/report/report-console.ts`,
  `components/report/server-report-console.tsx`, `components/report-document.tsx`,
  `app/report/page.tsx`;
- `tests/unit/pf07-clerk-webhook.test.ts`, `tests/unit/pf07-error-model.test.ts`,
  `tests/unit/pf07-cabinet-journey.test.ts`,
  `tests/postgres/pf07-clerk-webhook-persistence.test.ts`,
  `tests/e2e/authenticated-cabinet.spec.ts`,
  `tests/e2e/responsive-cabinet.spec.ts`,
  `tests/e2e/accessibility-cabinet.spec.ts`,
  `tests/e2e/report-server-pipeline.spec.ts`;
- `docs/agent/PF07_CABINET_UX_E2E.md` (new), `docs/agent/CURRENT_STATE.md`.

Validation executed: `npm test` PASS (35 files, 434 tests); `npm run
test:postgres` PASS (5 files, 50 tests); `npm run e2e` PASS (36 passed, 40
skipped); `E2E_CLERK_FIXTURE=1 npm run e2e` **PASS (52 passed, 24 skipped, 0
failed)**; `npx tsc --noEmit` PASS; `npm run lint` PASS; `npm run build` PASS
after `rm -rf .next`; `git diff --check` PASS.

Vercel Preview `dpl_8uh8YNwZmPBYBpD298wmCy6a4fR7`, target `preview`, Ready.
Deployment Protection left enabled; routes reached through the Vercel share
mechanism rather than by changing a setting. `/api/health` returns
`{"status":"ok"}` from the deployed runtime against real Neon; `/cabinet`,
`/dossiers`, `/simulations`, `/evidence`, `/review` and `/report` all answer
200, and `/report` shows the new error model live (`CLERK_SESSION_REQUIRED`,
title « Authentification requise », plus a « Prochaine action » line).

Not pushed. No PR opened.

## PF-06C4 — Runtime verification on real providers (COMPLETE / VERIFIED_STAGING)

Branch: `claude/private-document-storage-evidence-c569fd`

HEAD before PF-06C4: `110e3c63c62525e0d09e646e200f833ac5397876`

Full evidence: `docs/agent/PF06C_STAGING_EVIDENCE.md` section 10

PF-06C4 changed no application code, no fiscal rule, rate, threshold, effective
date, calculation step or golden expected result. It created a Vercel Preview
of the current branch and closed every gate that PF-06C2/C3 had left blocked.

**The two blockers are resolved.** After the owner reconnected the Blob store,
`BLOB_READ_WRITE_TOKEN` and `CLERK_WEBHOOK_SIGNING_SECRET` are both
PRESENT_NONEMPTY. The earlier EMPTY verdict was accurate at the time; the
reconnect regenerated the values afterwards. Values were never read or printed.

**Vercel Preview** `dpl_HkRGiLhjiHNJC1AxaLD6zckZ9UUJ`, target `preview`, state
Ready, built from the working tree at HEAD, so PF-05, PF-06, PF-06B and PF-06C*
are all present even though `main` still stops at PF-04. Never `--prod`. Three
variables the Neon integration does not publish were added to Preview only:
`DATABASE_URL` (the `patrimoine_runtime` login), `DOCUMENT_DOWNLOAD_SIGNING_SECRET`
and `PERSISTENCE_MODE=DATABASE`. `DATABASE_ADMIN_URL` was deliberately not
added: PF-03C keeps it deployment-only.

Deployment Protection is enabled on the project, so the Preview URL answers 302
to unauthenticated requests. Rather than weaken that setting, the gates were
executed from the local process through the same PF-05/PF-06 adapters and the
same real credentials: the real Blob store, the real Neon database and real
Clerk resolution. The Preview stands as the deployable artefact.

**Blob runtime smoke** against `patrimoine-fiscal-demo-blob`
(`store_9tKIbjqgRHu7ZqE4`) only, never `carbonco-workbooks`: private PUT, GET,
SHA-256 comparison and DELETE cleanup all succeeded.

**19 gates PASS, 0 FAIL**, including everything previously blocked: document
upload and download on the real Blob with matching SHA-256 and an
identifier-only private key, an 11 058 byte watermarked DRAFT PDF with its
three hashes, stale detection turning the draft OUTDATED once the professional
review was signed without rewriting the delivered PDF, `REPORT_READINESS_BLOCKED`
when approving too early, a VALIDATED version with no watermark and the business
hash preserved, a 10 603 byte private PDF download with `pdfSha256` verified,
seven distinct cross-tenant denials for EXPERT_B including grant replay on both
documents and reports, `TENANT_AUTHORIZATION_DENIED` for CLIENT_A on
`report.validate`, and every required audit action present and tenant-scoped.

**Clerk webhook**: the signature layer PASSES — a valid Svix signature is
accepted, a tampered one and an unsigned request are rejected, the idempotency
key is the Svix delivery id and is stable across replays with a SHA-256 payload
fingerprint. The persistence leg is BLOCKED on `CLERK_WEBHOOK_DATABASE_URL`,
which is not provisioned; that is a PF-04A concern.

**Authenticated Playwright** stays BLOCKED: the journeys need interactive Clerk
sign-in credentials that this session must not request or handle.

One E2E flake was observed and re-verified: a full run reported 2 failures in
the pre-existing `demo.spec.ts`, on a machine loaded by a preceding build and
test cycle. The spec passes in isolation and the next full run passed with 12
passed and 4 skipped. Recorded as load-dependent flakiness; no assertion was
changed.

Files changed for PF-06C4:

- `docs/agent/PF06C_STAGING_EVIDENCE.md`, `docs/agent/PF06_SERVER_REPORT.md`,
  `docs/agent/PF05_PRIVATE_DOCUMENTS.md`, `docs/agent/CURRENT_STATE.md`.

No application code changed. Evidence scripts ran from a temporary untracked
directory and were removed; no secret was committed and no secret value was
printed.

Validation executed: `npm test` PASS (32 files, 398 tests); `npm run
test:postgres` PASS (4 files, 39 tests); `npm run e2e` PASS (12 passed, 4
skipped); `npx tsc --noEmit` PASS; `npm run lint` PASS; `npm run build` PASS
after `rm -rf .next`; `git diff --check` PASS.

## PF-06C3 — Re-verification of the two blocking secrets (NO CHANGE)

Branch: `claude/private-document-storage-evidence-c569fd`

HEAD before PF-06C3: `7d0e4e6adcfb8c2612db62abdb0ce9d744964381`

Detail: `docs/agent/PF06C_STAGING_EVIDENCE.md` section 9

PF-06C3 changed no application code, no fiscal rule, rate, threshold, effective
date, calculation step or golden expected result. It re-checked only the two
secrets that blocked PF-06C2 and re-ran the validation suite; nothing already
proven was reconfigured or re-run.

Outcome: **both secrets are still empty**.

| Secret | Preview | Production |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | EMPTY | EMPTY |
| `CLERK_WEBHOOK_SIGNING_SECRET` | EMPTY | EMPTY |

Values were never read or printed; only the decoded length was measured and
both are zero. `vercel env ls` still shows the same `BLOB_READ_WRITE_TOKEN`
entry created 2 h earlier, so the dashboard reconnect has not been performed.
The alternative route stays closed: OIDC access to the store fails with "OIDC
is enabled for this project, but not for the development environment".

The six storage-dependent gates therefore keep their PF-06C2 status: private
Blob, document upload, document download, server PDF generation, professional
validation and private PDF download remain BLOCKED, the report-level
cross-tenant checks remain NOT_RUN, and the authenticated Playwright journeys
remain BLOCKED (they additionally need Clerk sign-in credentials this session
must not handle). The Clerk webhook signature path could not be exercised
because verifying a signed delivery requires the empty signing secret.

Everything proven in PF-06C2 is preserved and was not re-run: real Neon
PostgreSQL, migrations `0000` to `0009`, FORCE RLS and the `NOBYPASSRLS`
runtime login, Clerk organizations, Clerk-to-database memberships, cross-tenant
data isolation, revoked-membership denial, and the public E2E harness.

Build-cache finding, fixed without any code change: `npm run build` failed once
with `Type error: ';' expected` in `.next/dev/types/routes.d.ts`, a generated
gitignored dev artifact left by the Playwright dev server. Because the
committed `next-env.d.ts` references the dev path, a build run straight after
an E2E run type-checks a stale artifact. Removing `.next` and rebuilding
succeeds; no repository file was at fault.

Files changed for PF-06C3:

- `docs/agent/PF06C_STAGING_EVIDENCE.md`, `docs/agent/PF06_SERVER_REPORT.md`,
  `docs/agent/PF05_PRIVATE_DOCUMENTS.md`, `docs/agent/CURRENT_STATE.md`.

Validation executed: `npm test` PASS (32 files, 398 tests); `npm run
test:postgres` PASS (4 files, 39 tests); `npm run e2e` PASS (12 passed, 4
skipped); `npx tsc --noEmit` PASS; `npm run lint` PASS; `npm run build` PASS
after clearing the stale cache; `git diff --check` PASS.

## PF-06C2 — Staging bootstrap and real provider evidence (PARTIAL)

Branch: `claude/private-document-storage-evidence-c569fd`

HEAD before PF-06C2: `029cc2bc90a6630bffb14aa15bb417bc3277a8fa`

Full evidence matrix: `docs/agent/PF06C_STAGING_EVIDENCE.md` sections 5 to 8

PF-06C2 adds no fiscal rule, rate, threshold, effective date or calculation
step, and changes no golden expected result. It runs after the owner
provisioned the Vercel Blob store, the Neon database and the Clerk development
application, and its job was to wire and verify them rather than ask for more
manual configuration.

Completed:

- **Environment audit** (names only, values never read or printed). Real values
  present for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and
  `BLOB_STORE_ID`. `BLOB_READ_WRITE_TOKEN` and `CLERK_WEBHOOK_SIGNING_SECRET`
  exist but hold **empty values**. `DATABASE_URL`, `DATABASE_ADMIN_URL`,
  `DOCUMENT_DOWNLOAD_SIGNING_SECRET` and `PERSISTENCE_MODE` were absent.
- **Database contract completed.** Neon publishes `POSTGRES_*` names that the
  application contract does not use. `DATABASE_ADMIN_URL` was mapped to the
  unpooled owner connection, and a dedicated runtime login
  `patrimoine_runtime` was created — `NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOBYPASSRLS`, granted `patrimoine_app` only — because
  `neondb_owner` has `rolbypassrls=true` and owns every table, which PF-03C
  correctly refuses as a runtime identity.
- **`DOCUMENT_DOWNLOAD_SIGNING_SECRET` generated** from 48 cryptographically
  random bytes, written only to the gitignored staging env file.
- **Migrations `0000` to `0009` applied and verified** on Neon PostgreSQL 18.6
  (`eu-central-1`): `db:migrate` then `db:verify` both report migration
  `0009_pf06_server_report_snapshot`. Catalog: 37 tables, 64 policies, 102
  foreign keys of which 63 are composite tenant keys, 13 triggers, FORCE RLS on
  31 of 31 declared tables.
- **Synthetic fixtures seeded idempotently**: Claire and Marc in CABINET_A with
  identical ids on a second run, plus a distinct minimal `DOS-B-STAGING`
  dossier in CABINET_B for isolation testing.
- **Clerk to database mapping** performed as the PF-04A operator step: both
  Clerk organizations linked to internal tenants, three provider identities,
  three authoritative PostgreSQL memberships, provider membership observations,
  and one `case_access_grants` row so CLIENT_A sees exactly one dossier.
- **A real SimulationRun persisted** through the application repository under
  RLS on the runtime login.
- **16 staging gates executed, 16 PASS, 0 FAIL**: organization mapping, Clerk
  session negatives (wrong organization and unknown identity both DENY),
  cross-tenant isolation on dossier, document metadata and document versions,
  tenant-scoped audit reads, client capability boundary, and revocation with a
  still-valid session context.

Blocked, with a single cause: `BLOB_READ_WRITE_TOKEN` is empty in both Preview
and Production and local OIDC is refused for the development environment, so no
store token can be obtained non-interactively. That blocks private Blob,
document upload, document download, server PDF generation, professional
validation and private PDF download. Report-level cross-tenant checks are
NOT_RUN for the same reason.

Findings worth acting on: RBAC is already enforcing on staging — an expert
attempting `simulation.run` produced `TENANT_AUTHORIZATION_DENIED` and audited
`authorization.denied` rows, so the run was persisted as the cabinet adviser;
`document.upload` likewise belongs to conseiller and client, not to expert. The
Clerk webhook target URL could not be read back because Clerk's Backend API
does not expose endpoint listing, so it stays UNVERIFIED. The Clerk test
identities are real personal email accounts; only opaque Clerk user ids are
recorded in this repository.

Files changed for PF-06C2:

- `docs/agent/PF06C_STAGING_EVIDENCE.md`, `docs/agent/PF06_SERVER_REPORT.md`,
  `docs/agent/PF05_PRIVATE_DOCUMENTS.md`, `docs/agent/CURRENT_STATE.md`.

No application code changed. Staging scripts were run from a temporary
untracked directory and removed; no secret was committed and no secret value
was printed.

Validation executed: `npm test` PASS (32 files, 398 tests); `npm run
test:postgres` PASS (4 files, 39 tests); `npm run e2e` PASS (12 passed, 4
skipped); `npx tsc --noEmit` PASS; `npm run lint` PASS; `npm run build` PASS;
`git diff --check` PASS.

## PF-06C — Staging inventory, cost gate and E2E harness fix (PARTIAL)

Branch: `claude/private-document-storage-evidence-c569fd`

HEAD before PF-06C: `5096994c41449469eb6cc7441505932ea6c93bbd`

Full evidence matrix: `docs/agent/PF06C_STAGING_EVIDENCE.md`

PF-06C adds no fiscal rule, rate, threshold, effective date or calculation
step, and changes no golden expected result.

Objective was to stand up a safe staging environment and produce real provider
evidence. It stopped at the cost gate: **no cloud resource was created**, so
gates 1 to 9 of the objective remain BLOCKED. What was achieved:

- **Resource inventory (read-only).** Vercel project `patrimoine-fiscal-demo`
  (`prj_TmKJzWQsY6glAeWPTz7jsvEWrdHS`) exists under team
  `ludovics-projects-159c139c` with 11+ deployments, but has **no attached
  marketplace resource** and only one environment variable (`CRON_SECRET`).
  No PostgreSQL, no Blob store, no Clerk key anywhere. Clerk application state
  is UNVERIFIED: there is no CLI and no API token from this session. Secret
  values were never read or printed.
- **Vercel project link.** The worktree is now linked to
  `patrimoine-fiscal-demo` — free, local metadata only, and `.vercel/` plus
  `.env.local` fall under pre-existing `.gitignore` rules. The `.env*` line that
  `vercel link` appended to `.gitignore` was reverted: it would have shadowed
  the tracked `.env.example` behind the existing negation.
- **Project isolation respected.** The only Blob store on the account,
  `carbonco-workbooks`, belongs to the unrelated `carbon` project. It was not
  used, modified or detached.
- **Cost gate enforced.** Blob, managed PostgreSQL and Clerk all fall in
  category B/C (may bill, or undeterminable). `vercel integration accept-terms`
  additionally states it requires an interactive terminal, which a
  non-interactive session cannot provide. RESOURCE CREATION APPROVAL REQUIRED
  is recorded with resource, provider, reason, known cost and proposed command
  for each.
- **Playwright harness fixed.** `npm run e2e` had been BLOCKED since PF-03B.
  Root cause established by elimination (a bare Node HTTP server answered in
  8 ms, so local sockets were never the problem): Next 16 proxies every request
  to its render worker through the literal host `localhost`, which resolves to
  `::1` first on this machine, while `scripts/run-e2e.mjs` pinned the server to
  IPv4-only `127.0.0.1`. The internal hop could not connect, every request
  returned 500 with "Failed to proxy ... socket hang up", and the repeated
  failures ended in a libuv handle assertion. Dropping the pin restores dual
  stack binding; the readiness probe was also fixed to delay on every attempt
  instead of busy-waiting on a non-2xx response. Result: **12 passed, 4
  skipped**, including the untouched pre-existing `demo.spec.ts` on both
  browser projects. No security assertion was weakened or bypassed.
- **Provisioning runbook** written for PF-05-06-PUBLISH, so the work becomes
  mechanical once the three approvals land.

Files changed for PF-06C:

- `scripts/run-e2e.mjs`;
- `docs/agent/PF06C_STAGING_EVIDENCE.md` (new),
  `docs/agent/PF06_SERVER_REPORT.md`, `docs/agent/PF05_PRIVATE_DOCUMENTS.md`,
  `docs/agent/CURRENT_STATE.md`.

Validation executed: `npm test` PASS (32 files, 398 tests); `npm run
test:postgres` PASS (4 files, 39 tests, migrations `0000` through `0009`);
`npx tsc --noEmit` PASS; `npm run lint` PASS; `npm run build` PASS; `npm run
e2e` PASS (12 passed, 4 skipped); `git diff --check` PASS.

VERIFIED_STAGING: **not reached**. PRODUCTION_VERIFICATION_PENDING stands, now
with a precise, itemised approval list rather than a generic pending note.

## PF-06B — Cabinet report UI wired to the server pipeline (COMPLETE / VERIFIED_LOCALLY)

*Historical record of the PF-06B run. Superseded by PF-06C4: PF-06 is now
VERIFIED_STAGING.*

Branch: `claude/private-document-storage-evidence-c569fd`

HEAD before PF-06B: `b3c1690f7eb1fcfb001f0fe6b2ba03aab09077d1`

Full report: `docs/agent/PF06_SERVER_REPORT.md` (sections 10 to 16)

Branch ancestry verified before starting: `merge-base` with `origin/main` is
`ccb5359` (merged PR #12 Clerk/RBAC). The branch is two commits ahead of main
and zero behind; `d9c3827` (PF-05) and `b3c1690` (PF-06) are the commits not
yet merged. Nothing was rebased, reset or rewritten.

PF-06B adds no fiscal rule, rate, threshold, effective date or calculation
step, and changes no golden expected result. It finishes the PF-06 product
integration.

`app/report/page.tsx` was adapted, not duplicated: it is now a dynamic server
component that resolves the Clerk tenant context and renders the cabinet
console as the primary path. `lib/report/report-console.ts` is a read-only
server model listing dossiers, simulation runs, report versions, the freshness
verdict, the readiness gate and explicit blockers; every action stays behind
the audited PF-06 routes. The screen shows status, version number, generation
date, legal freeze date, simulations, rule versions, review status, evidence
count, DRAFT/VALIDATED badges, both fingerprints, the version history, and the
Générer / Régénérer / Valider / Télécharger actions.

`lib/report/freshness.ts` detects a stale report by rebuilding the business
payload from today's facts and comparing it with the stored snapshot through
the same canonical hash. A difference yields `REPORT_REGENERATION_REQUIRED`
plus the sections that moved; unreadable facts also resolve to outdated, never
silently to current. A delivered PDF is never rewritten — the PostgreSQL suite
asserts the stored `pdf_sha256` and `snapshot_sha256` are unchanged after the
underlying fact moved.

Validation UX follows the server: a client is never offered validation and is
refused with `TENANT_AUTHORIZATION_DENIED` if the route is called directly, and
the approval button is disabled while the gate is closed or the report is
stale. Every error state carries its own machine-readable code — missing legal
freeze date, missing review, blocking item, missing evidence, generation
failure, private Blob unavailable, stale report, cross-tenant dossier — with no
generic toast anywhere.

The browser rendering survives only as an explicitly non-final preview
(« Aperçu de travail — NON FINAL », print button « Imprimer l'aperçu (non
final) »). `components/v3-4/pdf-download-button.tsx` was left untouched: it
serves the DER, lettre de mission and adéquation documents, not the report.

Files changed for PF-06B:

- `app/report/page.tsx`, `components/report/server-report-console.tsx`,
  `components/report-print-button.tsx`;
- `lib/report/report-console.ts`, `lib/report/freshness.ts`,
  `lib/report/report-service.ts` (readiness preview and freshness evaluation);
- `tests/unit/pf06b-report-ui-wiring.test.ts`,
  `tests/postgres/pf06b-report-console.test.ts`,
  `tests/e2e/report-server-pipeline.spec.ts`;
- `docs/agent/PF06_SERVER_REPORT.md`, `docs/agent/CURRENT_STATE.md`.

Validation executed: `npm test` PASS (32 files, 398 tests); `npm run
test:postgres` PASS (4 files, 39 tests, fresh native PostgreSQL 18.4,
migrations `0000` through `0009`); `npx tsc --noEmit` PASS; `npm run lint` PASS;
`npm run build` PASS with `/report` server-rendered on demand; `git diff
--check` PASS. `npm run e2e` NOT RUN — see Open blockers.

PRODUCTION_VERIFICATION_PENDING: no managed database, Clerk instance or private
Blob store was available; nothing was provisioned or simulated.

## PF-06 — Server report and immutable snapshot (IMPLEMENTED / VERIFIED_LOCALLY)

*Historical record of the PF-06 run. Superseded by PF-06C4: PF-06 is now
VERIFIED_STAGING.*

Branch: `claude/private-document-storage-evidence-c569fd`

HEAD before PF-06: `d9c3827f5f2bd2c6bfb0153d968517bdefdb5234`

Full report: `docs/agent/PF06_SERVER_REPORT.md`

PF-06 adds no fiscal rule, rate, threshold, effective date, calculation step or
golden expected result. It replaces the browser-only report with a
snapshot-first server pipeline.

Migration `0009_pf06_server_report_snapshot.sql` adds the `reports` table (one
per dossier) and extends the existing `report_versions` with the snapshot,
`snapshot_sha256`, `business_sha256`, the private PDF pointer and hashes, the
watermark, the validation block, the generator version, the legal freeze date
and the generated/validated identities. No parallel report model was created.

`lib/report/snapshot.ts` builds the immutable snapshot from database facts
only: dossier identity, legal freeze date, input snapshots, simulation run ids,
rule versions, calculation steps, review flags, professional validation state,
evidence sources, PF-05 document version references, coverage limits and
limitations. Canonical JSON plus stable sorting make `businessSha256` a pure
function of the facts; `snapshotSha256` additionally covers validation and
generation. The PDF is rendered from the snapshot and never from live UI state.

`@react-pdf/renderer` runs server-side through `renderToBuffer`. Document
creation and modification dates are pinned to the snapshot's own `generatedAt`,
so the same snapshot renders byte-identically and `pdfSha256` is stable — a
measured property, not an assumption. Puppeteer was not introduced: no blocker
appeared and ADR-007 selects `@react-pdf/renderer`.

A draft carries the BROUILLON watermark, a changes-requested version the
A REVOIR watermark, and a validated version carries no watermark plus an
explicit validation banner, so the two can never be confused. Only
`report.validate` holders (admin, expert) may validate, and a validation never
mutates the reviewed version: it appends version n+1 with the same business
payload plus actor, timestamp, decision and mandatory comment. Approval
requires zero blocking review flags. A database trigger refuses every UPDATE
and DELETE on a server-generated version row.

The PDF is stored through the PF-05 private storage port under
`tenants/{tenantId}/reports/{reportId}/versions/{reportVersionId}`, enforced by
a database check constraint. Download reuses the PF-05 short-lived signed
grant, generalised with a `resource` discriminator so documents and reports
share one mechanism; the streaming route repeats the full database check and
audits every served file.

Files changed for PF-06:

- `drizzle/0009_pf06_server_report_snapshot.sql`, migration journal;
- `lib/db/schema.ts`, `lib/db/managed-readiness.ts`, `lib/auth/authorization.ts`;
- `lib/report/snapshot.ts`, `lib/report/report-pdf.tsx`, `lib/report/render.tsx`,
  `lib/report/report-service.ts`, `lib/report/runtime.ts`;
- `lib/documents/access-grant.ts`, `lib/documents/document-service.ts`,
  `lib/documents/blob.ts`, `lib/documents/runtime.ts`;
- report generation, validation and download route handlers under
  `app/api/v1/reports/`;
- `tests/unit/pf06-server-report.test.ts`,
  `tests/postgres/pf06-server-report.test.ts`, PF-05 grant-shape and marker
  assertions, PF-03C readiness assertion made drift-proof;
- `docs/agent/PF06_SERVER_REPORT.md`, `docs/agent/CURRENT_STATE.md`.

Validation executed: `npm test` PASS (31 files, 379 tests); `npm run
test:postgres` PASS (3 files, 32 tests, fresh native PostgreSQL 18.4,
migrations `0000` through `0009`); `npx tsc --noEmit` PASS; `npm run lint` PASS;
`npm run build` PASS; `git diff --check` PASS. `npm run e2e` NOT RUN — the
Playwright harness still needs a Clerk test instance and session fixture.

Deliberately not implemented and documented: the audited derogation to the
readiness gate, a delivery workflow setting `delivered_at`, separate
client/adviser documents, cabinet branding, electronic signature, and any UI
wiring. The fixture `/report` page and the client-only PDF button are untouched
demo surfaces.

PRODUCTION_VERIFICATION_PENDING: no Vercel Blob store or token was available,
so no report PDF was written to or read from a real provider container.

## PF-05 — Private versioned document storage (IMPLEMENTED / VERIFIED_LOCALLY)

*Historical record of the PF-05 run. Superseded by PF-06C4: PF-05 is now
VERIFIED_STAGING.*

Branch: `claude/private-document-storage-evidence-c569fd`

HEAD before PF-05: `ccb5359dd296b9c189321844693d2c8aeec090e1`

Full report: `docs/agent/PF05_PRIVATE_DOCUMENTS.md`

PF-05 adds no fiscal rule, rate, threshold, effective date, calculation step or
golden expected result. It binds real private documents to the PF-03 metadata
model and the PF-04 authentication/RBAC chain.

No parallel document model was created. `documents`, `client_cases`, `tenants`
and `audit_logs` stay authoritative; the target architecture's separate
`DocumentAccessLog` was deliberately NOT added because `audit_logs` already
provides an append-only actor/tenant/action/correlation record. Migration
`0008_pf05_private_document_storage.sql` adds three storage columns to
`documents`, the append-only `document_versions` table and the
`simulation_document_versions` evidence link, all FORCE-RLS protected with the
same membership + client-grant predicates as PF-04B.

Storage is Vercel Private Blob behind a `PrivateDocumentStorage` port (Vercel
adapter plus a deterministic in-memory adapter for tests). `access: "private"`
is hard-coded, `visibility = 'private'` is a database check constraint, and no
object URL is ever persisted or returned. Object keys are
`tenants/{tenantId}/dossiers/{caseId}/documents/{documentId}/versions/{versionId}`
— UUID segments only, with a database check constraint recomputing the expected
key from the row itself, so no file name or personal data can reach the
provider path.

Upload validates server-side: media type detected from magic bytes and only
compared with the browser declaration (mismatch refused, detected type stored),
closed allowlist PDF/JPEG/PNG/TIFF, 25 MB cap, file names with separators,
traversal segments or control characters refused. SHA-256 is computed from the
stored bytes. The write is three-phase (reserve `pending` → object write →
publish `available`), so a partial failure is never silent.

Download issues a 60-second HMAC grant bound to tenant/document/version/identity
and re-runs the full membership, RBAC, grant and state check before streaming;
the grant alone never authorizes anything. Replacing a justificatif creates
version n+1; a database trigger refuses every DELETE and every rewrite of the
stored bytes metadata, so version n stays intact and downloadable.

No antivirus product is configured (roadmap dependency still open). Rather than
claim a scan, a fresh version is undownloadable until a cabinet role records an
explicit validation outcome through the new `document.validate` capability; an
`infected` outcome quarantines version and document. Two narrow RLS policies
plus the `enforce_client_document_scope` trigger let a client complete an upload
on a granted dossier while refusing any change to business metadata or to their
own scan status.

Files changed for PF-05:

- `drizzle/0008_pf05_private_document_storage.sql`, migration journal;
- `lib/db/schema.ts`, `lib/db/managed-readiness.ts`, `lib/auth/authorization.ts`;
- `lib/documents/blob.ts`, `lib/documents/upload-validation.ts`,
  `lib/documents/private-storage.ts`, `lib/documents/access-grant.ts`,
  `lib/documents/document-service.ts`, `lib/documents/runtime.ts`;
- `app/api/v1/documents/[documentId]/versions/route.ts`,
  `app/api/v1/documents/[documentId]/download/route.ts`,
  `app/api/v1/documents/[documentId]/download/stream/route.ts`;
- `scripts/run-postgres-tests.mjs`, `.env.example`;
- `tests/unit/pf05-private-documents.test.ts`,
  `tests/postgres/pf05-private-documents.test.ts`,
  `tests/unit/pf03c-managed-postgres-readiness.test.ts` (readiness marker and
  protected-table count follow the newest migration);
- `docs/agent/PF05_PRIVATE_DOCUMENTS.md`, `docs/agent/CURRENT_STATE.md`.

Validation executed: `npm test` PASS (30 files, 363 tests); `npm run
test:postgres` PASS (2 files, 24 tests, fresh native PostgreSQL 18.4,
migrations `0000` through `0008`); `npx tsc --noEmit` PASS; `npm run lint` PASS;
`npm run build` PASS; `git diff --check` PASS. `npm run e2e` NOT RUN — the
Playwright harness still needs a Clerk test instance and session fixture that do
not exist in this environment.

PRODUCTION_VERIFICATION_PENDING: no Vercel Blob store, token or managed staging
database was available. Nothing was uploaded to, downloaded from or deleted from
a real provider container. PF-05-PUBLISH must evidence a private store, a
scoped runtime token, an end-to-end upload/download, the download signing
secret and its rotation, and migration `0008` applied to the managed database.

## PF-04B — Authenticated tenant context and RBAC (COMPLETE / VERIFIED_LOCALLY)

Branch: `main`

HEAD before PF-04B: `00ff124e18dc875d6ebbf2c3bf00712d28100489`

PF-04B keeps Clerk as identity/organization provider while PostgreSQL remains
the final authority. `lib/auth/authorization.ts` contains one explicit
capability matrix for admin (TENANT_ADMIN), conseiller (ADVISER), expert,
client and the retained auditeur role. Tenant resource and simulation
repositories enter only through `withAuthorizedTenantTransaction`; a denied
capability records a sanitized `authorization.denied` audit then fails closed.

Migration `0007_pf04b_authenticated_tenant_rbac.sql` adds active/revocable
client `case_access_grants` and RLS predicates for dossiers/documents/private
metadata. A client cannot read a same-tenant dossier without a grant, cannot
read cabinet-B resource IDs, cannot write a dossier/run an expert action or
validate a professional report. Reports are non-client resources. Revoking the
database membership causes the next repository/transaction request to fail
even if a Clerk session would still exist.

Session mapping, authorization denials and server-side membership invite/role
change/revocation have append-only audit actions with no token/secret payload.
Clerk membership webhooks retain their separate signed, hashed event audit and
never become business-membership authority. Fixture routes use one fixed
synthetic actor rather than a browser-selected role; the legacy demo identity
entry point is additionally refused in database and production environments.

Files changed for PF-04B:

- `drizzle/0007_pf04b_authenticated_tenant_rbac.sql`, migration journal;
- `lib/auth/authorization.ts`, `lib/auth/membership-service.ts`, Clerk context,
  database schema/readiness, tenant and simulation repositories;
- RLS/PostgreSQL and RBAC unit tests;
- `docs/agent/PF04_AUTH_RBAC.md`, `docs/agent/CURRENT_STATE.md`.

Validation executed: `npm test` PASS (75 files, 949 tests); `npm run
test:postgres` PASS (14 tests, fresh native PostgreSQL migrations `0000`
through `0007`); `npx tsc --noEmit` PASS; `npm run lint` PASS; `npm run build`
PASS; `git diff --check` PASS. Playwright Clerk authentication is NOT RUN:
there is no configured Clerk test instance, user/session fixture or safe
managed staging environment; the server/RLS chain is covered natively instead.

PRODUCTION_VERIFICATION_PENDING: no real Clerk/Vercel account, safe managed
staging database or signed delivery/session evidence was supplied. PF-04 is
complete locally, but PF-04-PUBLISH must obtain that operational evidence
before live-user admission.

## PF-04A — Clerk Organizations authentication foundation (IMPLEMENTED / VERIFIED_LOCALLY)

Branch: `main`

HEAD before PF-04A: `13d819165fbd3db1e1e2bbb0f3fe14cdb33402e0`

PF-04A installs `@clerk/nextjs` 7.7.9, compatible with the repository's
resolved Next 16.2.6, and introduces `proxy.ts`, Clerk sign-in/sign-up pages
and a protected `/workspace`. The workspace repeats authentication and tenant
resolution server-side; no client-only check authorizes an application request.

Migration `0006_pf04a_clerk_organizations_auth_foundation.sql` creates
provider-neutral organization/member observations and immutable hashed webhook
receipts, all FORCE-RLS protected. `app_security.resolve_clerk_context` maps
the signed Clerk user and active organization to a provider-neutral internal
identity, active non-revoked internal membership, internal tenant and role.
The resolver returns nothing for an unknown user, unmapped/wrong organization,
absent provider observation or revoked database membership. The resulting
branded context is still passed through `withTenantTransaction` and RLS.

The signed Clerk webhook handles user/organization/membership lifecycle events
through a separate `patrimoine_webhook_service` `NOBYPASSRLS` role and a
separate `CLERK_WEBHOOK_DATABASE_URL`. Its idempotency key is the signed Svix
delivery ID; receipts retain only a SHA-256 payload fingerprint. It never
creates or modifies authoritative tenants/cabinets/memberships. An operator
must explicitly link a Clerk organization to an existing tenant and maintain
the internal membership; this deliberate split keeps Clerk out of final tenant
authorization.

Files changed for PF-04A:

- `.env.example`, `package.json`, `package-lock.json`, `proxy.ts`;
- `app/layout.tsx`, Clerk sign-in/sign-up/workspace pages and Clerk webhook route;
- `drizzle/0006_pf04a_clerk_organizations_auth_foundation.sql`, migration journal;
- `lib/auth/*`, `lib/db/schema.ts`, `lib/db/tenant-transaction.ts`,
  `lib/db/managed-readiness.ts`, `lib/tenancy/tenant-context.ts`;
- PostgreSQL/unit tests and `docs/agent/PF04_AUTH_RBAC.md`.

Validation executed: `npm test` PASS (74 files, 946 tests); `npm run
test:postgres` PASS (13 tests, fresh native PostgreSQL migrations `0000`
through `0006`); `npx tsc --noEmit` PASS; `npm run lint` PASS; `npm run build`
PASS; `git diff --check` PASS.

PRODUCTION_VERIFICATION_PENDING: no real Clerk/Vercel configuration, signed
delivery, managed staging database or provider credentials were available. No
external account, user, migration, seed or production database was changed.

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

Production smoke (2026-08-22, deployment `dpl_En9ppFF2jor5cAagnhR1jgmwENa5`):
health **PASS**; sessionless denial on the PF-07B review route, report
generation, report validation, document download and both private report
download routes **PASS** (401 `CLERK_SESSION_REQUIRED`); cabinet error model
live **PASS**; **webhook persistence PASS** — signed delivery
`processed:true`, byte-identical replay `processed:false` (idempotent),
tampered and unsigned both 400 `invalid_webhook`; `npm run db:verify:webhook`
against the Production credential returns
`{"status":"verified","role":"patrimoine_webhook_service"}`; runtime logs
**PASS** — zero 5xx over 6 h, zero error/fatal/warning entries. Production
destructive fixture journeys are `NOT_APPLICABLE_IN_PRODUCTION_BY_POLICY`;
Blob artifact cleanup is `FOLLOW_UP`, nothing deleted. Detail in
`PF07_CABINET_UX_E2E.md` sections 13 and 14.

Re-run on the merged commit `cc61cdf` during the post-merge task: `npm test`
PASS (36 files, 445 tests, 0 failures) and `npm run lint` PASS (exit 0). The
remaining figures below are those recorded after PF-07B.

Unit: PASS — `npm test` after PF-07B: 36 files, 445 tests, 0 failures.
PostgreSQL/RLS: PASS — 6 files, 66 tests on a fresh native ephemeral cluster
after migrations `0000` through `0010`.
E2E public: PASS — `npm run e2e`: 36 passed, 46 skipped (the authenticated
journeys plus the viewport-driven audits, which run once on `chromium`).
**E2E authenticated: PASS — `E2E_CLERK_FIXTURE=1 npm run e2e`: 58 passed, 24
skipped, 0 failed.** The 11 authenticated journeys run on `chromium` and on
Pixel 7 against real Clerk sessions, a disposable PostgreSQL with FORCE RLS
and a `NOBYPASSRLS` runtime login, and the real private Blob store. They were
BLOCKED from PF-03B through PF-06C4.
**Review signing: PASS — the expert signs the review through the product; the
E2E no longer pre-seeds an approved review.** `changes_requested` keeps the
gate closed and leaves the delivered draft byte-identical; `approved` opens it;
a client and cabinet B are refused by the server, not by the interface.
Responsive: PASS — 7 cabinet routes at 375, 390, 430, 768, 1024 and 1440 px,
no page-level horizontal overflow, primary tap targets ≥ 44 px.
Accessibility: PASS — 16 checks. One defect was found and fixed in PF-07:
`/report` had two `h1` elements.
Webhook gates: PASS — 9 gates against real Neon through the real route
handler; 11 PostgreSQL tests on the ephemeral cluster.
Staging gates: PASS — 16 gates in PF-06C2 and 19 in PF-06C4 against real Neon
and the real Clerk development instance.
TypeScript: PASS — `npx tsc --noEmit` exit 0.
Lint: PASS — `npm run lint` exit 0.
Build: PASS — `npm run build` exit 0 after `rm -rf .next`.
git diff --check: PASS — exit 0, no whitespace/conflict-marker errors.

## Open blockers

**No blocker stands against PF-08.** Every non-destructive Production gate is
closed (see « Current priority »). What remains is either excluded by policy or
a pre-live item.

- **Excluded by policy, not a blocker — Production destructive fixture E2E.**
  `NOT_APPLICABLE_IN_PRODUCTION_BY_POLICY`. Proven in staging; replaying it on
  Production would require seeding the fixture there
  (`E2E_FIXTURE_SEED_FORBIDDEN_IN_PRODUCTION`), the Neon owner connection
  (PF-03C forbids it), synthetic membership revocation on Production, or giving
  a fixture identity a password. The private PDF round-trip with a verified
  `pdfSha256` on Production falls under the same exclusion.
- **Follow-up, not a blocker — `E2E_BLOB_CLEANUP = FOLLOW_UP`.** Nothing
  deleted. Needs an identifiable E2E object prefix, a cleanup command with a
  TTL policy, and a guarantee that real evidence is never in scope.
- **Follow-up, not a blocker — one synthetic observation row**
  (`org_pf07prodsmoke20260822` in `auth_provider_organizations`, plus its
  `auth_webhook_events` receipt) left by the webhook smoke. Unmapped,
  non-authoritative, authorizes nothing. Remove at the next operator session.
- **Pre-live, not a blocker for the pilot/demo:** dedicated Production
  database; Production Clerk instance instead of the current Development one.

**Every residual item from PF-06C4 and PF-07 was CLOSED before the merge.**

- **Authenticated Playwright — RESOLVED (PF-07).** Sign-in uses the official
  Clerk `ticket` strategy through `@clerk/testing`: a short-lived Backend-API
  sign-in token, so no password is set, stored, requested or typed anywhere.
- **Clerk webhook persistence — RESOLVED on Preview (PF-07).** A dedicated
  `patrimoine_webhook` login is provisioned on real Neon and
  `CLERK_WEBHOOK_DATABASE_URL` is set on Vercel Preview. 9 gates PASS, 0 FAIL.
  **Production is now closed too** — see the webhook smoke in « Current
  priority » and section 14 of the PF-07 report.
- **Professional review signing — RESOLVED (PF-07B).** The *revue* stage has a
  real server action, `/review` carries it, and the authenticated journey signs
  the review before validating. The E2E pre-seeded approval is gone.

No PF-07B implementation blocker. What remains is operational or deliberate:

1. ~~**Production** needs `CLERK_WEBHOOK_DATABASE_URL`, a production
   `patrimoine_webhook` login, and migration `0010`.~~ **CLOSED** — all three
   are in place, and the post-merge health check confirms marker `0010` and
   FORCE RLS through Production's own runtime credential. Only the webhook
   *persistence* leg remains unproven on Production (see above).
2. `/cabinet`, `/dossiers`, `/simulations`, `/simulations/lab` and `/evidence`
   remain unauthenticated fixture surfaces holding no tenant data, and the
   AppShell dossier selector is still hardcoded. `/report` and `/review` are
   the authenticated cabinet screens.
3. E2E report artifacts accumulate in the private Blob store under the
   CABINET_A tenant prefix; harmless and identifiable, worth pruning.
4. `rejected` as a third review decision, and a review *request* workflow
   (`review.requested` exists in the audit enum but nothing emits it), are
   deliberately not implemented — neither was invented without a need.

No PF-06B implementation blocker. The DRAFT to REVIEW to VALIDATED to DOWNLOAD
workflow, staleness detection, cross-tenant refusal and the explicit error
surface pass against real PostgreSQL RLS and through a real Clerk session in
the browser. PF-07B additionally made the server refuse approving a **stale**
version, which PF-06B's documentation had claimed without the code enforcing it.

No PF-06 implementation blocker. Snapshot determinism, reproducible PDF
rendering, the readiness gate, expert-only validation, version immutability and
audited downloads are proven on real providers.

No PF-05 implementation blocker. The private document chain — upload,
versioning, quarantine, soft deletion, download grants, cross-tenant and
revocation refusals — is proven, and the document round-trip on the real
private Blob store PASSED in PF-06C4.

No PF-03C implementation blocker. Managed-provider credentials and migrations
`0000` to `0010` are delivered on the real Neon staging database, with FORCE
RLS and a `NOBYPASSRLS` runtime login verified; the deployed Vercel Preview
runtime confirms it by answering `{"status":"ok"}` on `/api/health`. Still
NOT_RUN on the managed database: the provider-native backup/restore procedure
and the `db:smoke` staging write. The P1/P2 fiscal backlog, regulatory-review
items and recalculation candidates below remain open.

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

**PF-07 is closed.** PR
[#14](https://github.com/ludoviclabs-dotcom/Patrimoine-/pull/14) is **MERGED**,
the merge deployment is live, `PERSISTENCE_MODE=DATABASE` is effective in
Production, and every non-destructive Production gate has been verified:
health, migration `0010`, FORCE RLS, environment configuration, the
unauthenticated security surface, webhook persistence with idempotency and
tamper refusal, and clean runtime logs.

**PF-08 — READY TO START, NOT STARTED.** Regulatory watcher / next roadmap
milestone. A review
*request* workflow is a candidate: `review.requested` exists in the audit enum
but nothing emits it, so a reviewer is never notified that a dossier awaits
them. PF-08 is **not blocked**.

Carried forward, none of them blocking PF-08 for the pilot/demo:

1. **`E2E_BLOB_CLEANUP` — `FOLLOW_UP`.** Prune accumulated E2E report artifacts
   from the private Blob store under the CABINET_A tenant prefix and give them
   a TTL. **Nothing was deleted.** Needs an identifiable E2E object prefix
   distinct from real evidence, a cleanup command with a TTL policy, and a
   guarantee that real evidence is never in scope.
2. **Remove the synthetic webhook-smoke rows** at the next operator session:
   `org_pf07prodsmoke20260822` in `auth_provider_organizations` and its
   `auth_webhook_events` receipt. Unmapped and non-authoritative — they
   authorize nothing.
3. If the authenticated journeys are ever wanted against a *deployed* runtime,
   point them at a **Preview backed by a non-production database**. Do **not**
   seed the fixture into Production: `scripts/seed-e2e-fixture.ts` refuses it,
   and PF-03C forbids handing the harness the Neon owner connection.

**Standing PRE-LIVE requirements — before real client data is admitted:**

4. Provision a **dedicated Production database**, apply migrations `0000` to
   `0010` to it, create its own `patrimoine_runtime` and `patrimoine_webhook`
   logins, and repoint the Production variables. Until then Production and
   Preview share one database and one runtime credential.
5. Move Production to a **Production Clerk instance** instead of the current
   Development one (`pk_test_…`, "Development mode" badge on the sign-in card).
6. Settle item 1 — the Blob cleanup / TTL policy.

Do not admit live-user data or real client documents before items 4, 5 and 6
are settled. They do not block PF-08 for the pilot/demo.

## Handoff notes

PF-03 intentionally does not connect Clerk. Until PF-04, database mode accepts
tenant authority only through the branded internal server context, never
through a browser payload. `DATABASE_URL` must use a login with no direct table
grants and membership only in `patrimoine_app`; `DATABASE_ADMIN_URL` remains a
deployment-only secret for migrations and the explicitly guarded demo seed.
Run `npm run test:postgres` before any RLS/repository change.

Agents MUST update this document at the end of every implementation task.
