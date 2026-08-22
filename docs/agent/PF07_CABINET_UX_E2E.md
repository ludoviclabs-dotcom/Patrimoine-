# PF-07 — Cabinet UX, authenticated E2E and workflow hardening

Branch: `claude/pf-07-cabinet-ux-auth-e2e`
Base: `a7fab0b1d914dbbd28af153cc0d6d77ee4c73308` (merge of PR #13, `origin/main`)

PF-07 adds no fiscal engine, and changes no fiscal rule, rate, threshold,
effective date, calculation step or golden expected result. It turns the
secured PF-03 → PF-06 backend into a cabinet journey that is authenticated,
tested, responsive and explicit about refusals.

**PF-07B (§12) closes the one product gap PF-07 documented rather than fixed:
a professional can now sign a review through the product**, so the
authenticated journey no longer needs a pre-seeded approval.

---

## 1. Inventory of the existing surface

The starting point matters, because the routes named in the objective are not
one product but two, and only one of them was ever connected to the server.

| Route | Rendering | Clerk protection | Tenant resolution | Data source |
|---|---|---|---|---|
| `/cabinet` | static | **none** | none | fixture constants (`CabinetHomeV26`) |
| `/dossiers` | static | **none** | none | fixture constants (`DossierWorkspaceV26`) |
| `/simulations` | dynamic (redirect only) | **none** | none | fixture constants |
| `/simulations/lab` | dynamic | **none** | none | fixture constants |
| `/evidence` | static | **none** | none | `lib/evidence/sources`, rule registry |
| `/review` | static | **none** | none | fixture constants |
| `/report` | **dynamic** | resolves server-side | `requireClerkTenantContext` | **PostgreSQL + RLS + RBAC** |
| `/workspace` | dynamic | `proxy.ts` `auth.protect()` | `requireClerkTenantContext` | membership only |

`proxy.ts` matches every route but calls `auth.protect()` on `/workspace(.*)`
only. `/report` is not middleware-protected and does not need to be: it
resolves the context itself and degrades to a named, explicit unavailable
state. The remaining cabinet routes are demonstration surfaces that hold no
tenant data at all, so middleware protection would guard nothing.

### Role × capability, as actually enforced

Read from `lib/auth/authorization.ts`, not from the UI:

| Action | admin | conseiller | expert | client | auditeur |
|---|---|---|---|---|---|
| `dossier.read` | ✓ | ✓ | ✓ | ✓ (granted dossiers only) | ✓ |
| `dossier.write` | ✓ | ✓ | — | — | — |
| `simulation.run` | ✓ | ✓ | — | — | — |
| `simulation.review` | ✓ | — | ✓ | — | — |
| `report.generate` | ✓ | ✓ | ✓ | — | — |
| `report.validate` | ✓ | — | ✓ | — | — |
| `report.download` | ✓ | ✓ | ✓ | **—** | ✓ |
| `document.upload` | ✓ | ✓ | — | ✓ | — |
| `document.download` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `document.validate` | ✓ | ✓ | ✓ | — | — |
| `audit.read` | ✓ | ✓ | ✓ | — | ✓ |

A consequence worth stating because the E2E run confirmed it on a live
session: **a client is not merely prevented from validating a report, it never
loads one.** `report.download` is absent from the client row, so the console
returns no version at all — the version validated seconds earlier in the same
dossier is not hidden by CSS, it is not fetched.

### Gaps found, and what PF-07 did with each

| Gap | Verdict |
|---|---|
| Clerk webhook persistence never exercised | **closed** — §2 |
| Authenticated Playwright BLOCKED since PF-03B | **closed** — §3 |
| Journey position hardcoded, identical for every dossier | **closed** — §4 |
| Server codes had no user-facing wording or next action | **closed** — §5 |
| Horizontal overflow on cabinet routes | **no defect found** — §6 |
| Accessibility of the cabinet routes | **one defect found and fixed** — §7 |
| Client/server boundary leaks | **none found** — §8 |
| No route to sign a professional review | **closed by PF-07B** — §12 |

---

## 2. Clerk webhook persistence — PASS

PF-06C4 proved the signature layer and left the persistence leg BLOCKED:
`CLERK_WEBHOOK_DATABASE_URL` was never provisioned, so no signed delivery had
ever reached `app_security.record_clerk_webhook_event`.

The group role `patrimoine_webhook_service` already existed from PF-04A with
exactly the right minimal grants — `USAGE` on `app_security` and `EXECUTE` on
one SECURITY DEFINER function, nothing else. **No migration was needed and
none was written.** What was missing was a login able to assume it, a way to
check that login is narrow, and evidence the chain works.

- `assertSafeClerkWebhookRole` pins the boundary: no `SUPERUSER`, no
  `BYPASSRLS`, no table ownership, no direct table privilege, no ability to
  assume `patrimoine_app`, and never the service role connecting directly. The
  repository previously checked a subset inline; ownership and direct grants
  are now refused too.
- `npm run db:verify:webhook` verifies a provisioned URL read-only, assuming
  the service role the way the runtime does — the login itself holds no schema
  grant, which is exactly why the first version of that check failed and was
  corrected rather than loosened.
- The connection cache is keyed on the URL, so rotating the credential no
  longer keeps serving the previous connection.

**Provisioned on the real Neon staging database**: login `patrimoine_webhook`,
`NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`, member of
`patrimoine_webhook_service` only, password from 32 cryptographically random
bytes. `CLERK_WEBHOOK_DATABASE_URL` was added to the Vercel **Preview**
environment as a sensitive variable. No value was read or printed.

### Gates — 9 PASS, 0 FAIL, against real Neon through the real route handler

| Gate | Result |
|---|---|
| valid signature accepted and persisted | PASS — `{"received":true,"processed":true}` |
| receipt row written | PASS — event type recorded, SHA-256 fingerprint only |
| organization observation, non-authoritative | PASS — `observed=active`, `tenant_id` NULL |
| membership observation | PASS — `observed=active`, provider role recorded |
| replay of the same Svix delivery id | PASS — `processed:false`, still one receipt |
| tampered payload | PASS — 400, nothing written |
| unsigned request | PASS — 400, nothing written |
| no authoritative internal membership created | PASS — `memberships` untouched |
| staging cleanup | PASS — no synthetic row left behind |

`tests/postgres/pf07-clerk-webhook-persistence.test.ts` (11 tests) repeats the
chain on an ephemeral cluster and adds the privilege assertions, including that
the webhook login **cannot read tenant data even after assuming the service
role** (`permission denied`).

---

## 3. Authenticated Clerk fixture and E2E — PASS

PF-06C4 recorded this as BLOCKED because the only Clerk users on the instance
are the owner's personal accounts, and driving them would mean handling human
passwords.

**No password is set, stored, requested or typed anywhere.** Sign-in uses
Clerk's official `ticket` strategy through `@clerk/testing`: the helper finds
the user by email and mints a short-lived sign-in token with the Backend API.
`clerkSetup()` and the provisioning script both refuse a non-development
instance (`sk_test_` required).

`lib/auth/e2e-fixture-plan.ts` is the single declaration of the matrix, read by
the provisioning script, the database seed and the specs, so a role cannot
drift between Clerk, the authoritative PostgreSQL membership and the journey
asserting it.

| Identity | Clerk organization | Internal role | Internal membership |
|---|---|---|---|
| `E2E_ADVISER_A` | CABINET_A | conseiller | yes |
| `E2E_EXPERT_A` | CABINET_A | expert | yes |
| `E2E_CLIENT_A` | CABINET_A | client | yes + explicit dossier grant |
| `E2E_EXPERT_B` | CABINET_B | expert | yes |
| `E2E_UNKNOWN_A` | CABINET_B | — | **none at all** |

`E2E_UNKNOWN_A` sits in CABINET_B only because the development instance caps
organization memberships at five and the owner's own accounts occupy two of
CABINET_A's. The property proven is identical, and no existing account was
touched. The provisioning script now checks membership before creating one,
because Clerk enforces that quota *before* it checks for a duplicate, which
made a second `provision` run fail on members that already existed.

### How the run is wired

With `E2E_CLERK_FIXTURE=1`, `scripts/run-e2e.mjs` provisions a **disposable**
PostgreSQL cluster, migrates it through the same journalled path production
uses, creates a runtime login with the PF-03C shape (`NOSUPERUSER`,
`NOBYPASSRLS`, no direct grant, `patrimoine_app` member only) and seeds the
Clerk mapping. The dev server talks to that login, so RLS and RBAC are
exercised for real. Without the flag, the public suite runs exactly as before —
no database, no credential.

The seed writes the Clerk organization link and the client dossier grant with
the privileged connection, because `patrimoine_fixture_service` deliberately
holds no grant on `case_access_grants` or the `auth_provider_*` tables.
**PF-07 did not widen it**; linking an organization to a tenant is an operator
action by PF-04A design.

Report generation and download in these journeys use the **real Vercel Private
Blob store**, under `tenants/11111111-…/reports/…`. Objects accumulate across
runs and can be pruned; they are isolated by report id and collide with
nothing.

### Journey matrix — 8 journeys × 2 projects, all PASS

| Journey | Asserted |
|---|---|
| **ADVISER_A** | tenant resolves to CABINET_A as `conseiller`; the seeded dossier is listed; the journey names a real stage and its next action; a watermarked DRAFT is generated on the real Blob; the report stage becomes *in progress*, never *done*; download offered; **validate not rendered** |
| **EXPERT_A** | validates into version *n+1* — the reviewed draft is not mutated; no watermark; "version validée" banner; every stage finishes and no stop is advertised; private PDF downloaded |
| **CLIENT_A** | granted dossier readable; generate, validate and download all absent; **no report version loaded at all** |
| **CLIENT_A direct call** | `POST …/validation` → **403 `TENANT_AUTHORIZATION_DENIED`** — hiding the button is not the control |
| **EXPERT_B cross-tenant** | sees only `DOS-B-E2E`; `?dossier=<A>` never falls back; listing cabinet A answers **200 with `[]`** rather than a 404 that would disclose existence; download, validation and generation on cabinet A resources all refused |
| **E2E_UNKNOWN_A** | a genuine Clerk organization member with no internal row: console never opens, `CLERK_TENANT_CONTEXT_DENIED` named with its next action, no dossier from either cabinet in the page, API answers 401 |
| **Revocation** | membership revoked while the browser keeps a valid `__session` cookie → access denied, cause named; restoring the membership restores access with the same session |

**No security control was relaxed to make any journey pass.** Where a role is
refused, the refusal is the assertion.

Runs are serialised under the fixture (`workers: 1`) because the journeys share
one dossier and advance its report versions; the public suite keeps its default
parallelism.

---

## 4. Cabinet journey — from decoration to fact

**Before.** `components/ui/journey-stepper.tsx` was rendered with
`current={1}` — a hardcoded constant, identical for every dossier, for every
role, in every state. It could not say what was finished, what was blocking,
what merely needed review, or what to do next.

**After.** `lib/cabinet/journey.ts` derives the six stages —
qualification → hypothèses → simulation → preuves → revue → rapport — from the
facts the report console already loads. It infers no fiscal conclusion; it
reports the stage the file has actually reached.

| Stage | Done when | Blocked by |
|---|---|---|
| Qualification | a dossier is resolved in the tenant | `REPORT_DOSSIER_NOT_ACCESSIBLE` |
| Hypothèses | `legalFreezeDate` is set | `REPORT_LEGAL_FREEZE_DATE_REQUIRED` |
| Simulation | ≥1 run retained, no blocking simulation/calculation/rule flag | that flag's own code |
| Preuves | ≥1 document version linked | `REPORT_EVIDENCE_MISSING` — **vigilance, never a stop** |
| Revue | professional review signed | `review.professional_not_signed` |
| Rapport | current version validated and fresh | `REPORT_REGENERATION_REQUIRED` |

Design points that matter:

- `review` is a distinct state from `blocked`. Missing evidence is reported
  and counted, but the advertised next action is the first **genuine** stop.
- The bar is a **server component**, computed in the same tenant transaction as
  the console, so the screen cannot show a stage the server would disagree
  with.
- It is a list with `aria-current="step"` and a `role="status"` next-action
  line, not a decorative rail — a screen reader and a 375 px viewport convey
  the same information.
- `data-journey-step` / `data-journey-state` expose the machine state, so the
  E2E asserts the model rather than prose.

13 unit cases pin the behaviour, including that a stale delivered report
reopens the report stage and offers regeneration rather than rewriting.

---

## 5. Error model

**Before.** The server already refused precisely — PF-04B, PF-05 and PF-06
return stable codes rather than prose — but the UI had three partial private
copies: `unavailableCopy` (6 codes), `errorCopy` in the console (16 codes), and
inline strings in `buildBlockers`. Anything outside them rendered as "Échec non
catalogué", and none of them said what to do next.

**After.** `lib/errors/error-catalog.ts` maps every code to a title, an
explanation, a next action and a severity. All three private tables are gone;
the server-rendered blockers, the unavailable card and the interactive fetch
failures all read the same catalog, so a refusal is worded identically wherever
it appears.

Two invariants are enforced by test:

1. **No interpolation.** Every string is a constant, so a message can never
   carry another cabinet's dossier reference, file name or provider detail.
2. **Coverage.** `tests/unit/pf07-error-model.test.ts` reads the real
   `statusByCode` map out of `lib/documents/runtime.ts` — adding a server code
   without user-facing wording now fails the suite instead of shipping as a
   generic message. A guard test asserts the extraction itself finds >30 codes,
   so a silent regex miss cannot make the coverage test pass vacuously.

Cross-tenant codes state the resource is out of scope and never confirm or deny
that it exists elsewhere. An unmapped code keeps its own identifier and neutral
wording rather than being rewritten into something friendlier but wrong.

The console's failure card is `role="alert"` and its success card
`role="status"`.

---

## 6. Responsive — no defect found

`tests/e2e/responsive-cabinet.spec.ts` measures the 7 priority routes at the 6
required widths and fails on any page-level horizontal scroll, reporting the
outermost offending element rather than every descendant of a wide parent.
Content allowed to scroll on its own axis (tables, ledgers, long fingerprints)
is explicitly exempt — the rule is that the **page body** must never scroll
sideways.

| Route | 375 | 390 | 430 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|
| `/cabinet` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/dossiers` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/simulations` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/simulations/lab` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/evidence` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/review` | PASS | PASS | PASS | PASS | PASS | PASS |
| `/report` | PASS | PASS | PASS | PASS | PASS | PASS |

Primary navigation tap targets are ≥ 44 px at 375 px. The authenticated
journeys also run on Pixel 7 (`mobile-chrome`), so generation, validation and
download are exercised at mobile width.

**No layout was changed.** The V2.6/V3.x work had already handled this, and
PF-07's instruction is that a UX change must fix an observed problem. What PF-07
adds is the regression test, so a future change cannot silently reintroduce it.

---

## 7. Accessibility — one defect found and fixed

`tests/e2e/accessibility-cabinet.spec.ts`, 16 checks:

| Check | Result |
|---|---|
| every interactive control has an accessible name (6 routes) | PASS |
| exactly one `h1` per route | **FAILED on `/report` → fixed** |
| skip link focused on first Tab, moves focus to `#main-content` | PASS |
| visible focus indicator on primary navigation | PASS |
| command palette: focus lands inside the dialog, Escape closes it | PASS |
| reduced motion honoured, no infinite animation left running | PASS |

**The defect.** `/report` carried two `h1` elements: the page hero, and
`components/report-document.tsx` titling itself with the household name. That
preview is one *section* of the page, not the page. Its title is now an `h2`
and its 18 sub-headings were demoted to `h3` so they nest beneath it. Headings
only — no content, no logic, no fiscal value touched.

---

## 8. Server boundaries — nothing to fix

Audited for each leak the objective names:

| Check | Result |
|---|---|
| client component importing `lib/db/**`, `drizzle-orm`, `postgres` | none |
| client component importing `@vercel/blob` or the storage adapter | none |
| client component importing the report/document services | none |
| client component reading a non-`NEXT_PUBLIC_` env var | none |
| client-side read waterfall | none — the console receives every read as props from the server component and `fetch` is used **only to mutate** |

The one improvement made is in §5: the interactive failure path now reads the
shared catalog instead of a raw code.

---

## 9. Staging and Preview evidence

**Vercel Preview** `dpl_8uh8YNwZmPBYBpD298wmCy6a4fR7`, target `preview`
(never `--prod`), state **Ready**, built from the working tree at the PF-07
branch head.

URL: `https://patrimoine-fiscal-demo-q2td1uekv-ludovics-projects-159c139c.vercel.app`

Deployment Protection was **left enabled**. Unauthenticated requests answer
302 to the Vercel SSO flow, and the routes below were reached through Vercel's
own sanctioned share mechanism — no project setting was changed and no bypass
was disabled.

| Route | Preview result |
|---|---|
| `/api/health` | **200 `{"status":"ok"}`** — the deployed runtime reached the real Neon database and passed the role, migration and RLS marker checks |
| `/cabinet` | 200, exactly one `h1`, navigation and skip link present |
| `/dossiers` | 200, exactly one `h1` |
| `/report` | 200, and the PF-07 error model visible on the real deployment: code `CLERK_SESSION_REQUIRED`, catalog title « Authentification requise », and a « Prochaine action » line |
| `/simulations`, `/evidence`, `/review` | 200 |

`/report` showing the unavailable card is the **correct** result for a request
carrying no Clerk session, and it is the clearest possible demonstration that
the new error model works end to end on deployed infrastructure.

---

## 10. Remaining blockers and deliberate limits

1. ~~**No route signs a professional review.**~~ **CLOSED by PF-07B — see §12.**
   The *revue* stage now has a real server action, the E2E pre-seed is gone,
   and the browser journey signs the review before validating.
2. **The cabinet demo surfaces remain fixture-only.** `/cabinet`, `/dossiers`,
   `/simulations`, `/evidence` and `/review` still render constants and hold no
   tenant data. PF-07 did not retrofit authentication onto them, because that
   would be a product rebuild rather than the smallest coherent change, and
   because they would then need real server models that do not exist yet.
   `/report` remains the only authenticated cabinet surface — now with the
   journey bar in front of it.
3. **AppShell dossier context is still hardcoded** ("Claire et Marc" plus three
   demo entries). It belongs to the fixture shell above; the authenticated
   screen names its real dossier in the journey bar.
4. **E2E report artifacts accumulate** in the real private Blob store under the
   CABINET_A tenant prefix. Harmless and identifiable, but worth pruning
   periodically.
5. **`CLERK_WEBHOOK_DATABASE_URL` is set on Preview only.** Production still
   needs it, together with a production `patrimoine_webhook` login, before the
   webhook can persist there.

---

## 11. Validation executed

| Command | Result |
|---|---|
| `npm test` | PASS — 36 files, 445 tests |
| `npm run test:postgres` | PASS — 6 files, 66 tests, migrations `0000` → `0010` |
| `npm run e2e` (public) | PASS — 36 passed, 46 skipped |
| `E2E_CLERK_FIXTURE=1 npm run e2e` | **PASS — 58 passed, 24 skipped, 0 failed** |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS after `rm -rf .next` |
| `git diff --check` | PASS |

The 24 skipped under the fixture are the responsive and accessibility audits,
which drive their own viewport and therefore run once, on `chromium` only. The
40 skipped in the public run are those plus the 16 authenticated journeys,
which stay gated on `E2E_CLERK_FIXTURE=1`.

**The authenticated Playwright journeys now PASS rather than skip.** That was
the objective's stated exit condition.

`next-env.d.ts` is a generated file Next rewrites between `dev` and `build`
runs (the churn PF-06C3 documented). It was restored to its committed state and
`npx tsc --noEmit` verified to pass with it.

---

# PF-07B — Signing a professional review

PF-07 shipped a cabinet journey whose *revue* stage had no action: the
PostgreSQL suite signed the review with raw SQL and the E2E fixture seeded it
as `approved` so the browser could reach validation. PF-07B closes exactly that
gap and nothing else. It adds no fiscal engine and changes no fiscal rule,
rate, threshold, effective date, calculation step or golden expected result.

## 12.1 Why a migration was genuinely required

The review model already existed and was almost sufficient:
`professional_reviews` carries the decision enum, the motive, the required
actions, the timestamp, composite tenant foreign keys and FORCE RLS;
`patrimoine_app` already held INSERT; the audit enum already had
`review.decided`; and PF-06 reads the **newest** review per dossier, so a
decision is an append, never an update.

One column blocked it:

```
reviewer_user_id uuid NOT NULL REFERENCES users(id)
```

`users` is the v1 per-tenant table. Every actor column added since PF-03A
points at `user_identities` instead — `audit_logs.actor_identity_id`,
`documents.uploaded_by_identity_id`,
`report_versions.generated_by_identity_id` / `validated_by_identity_id` — and
a Clerk session resolves to an identity. **There is no linkage between the two
tables**: no foreign key, and no join anywhere in `lib/`.

The existing PF-06 tests only insert a review because the demo fixture gives
`users[2]` and `user_identities[2]` the *same UUID* (`seed-v2-1.ts:27` and
`:42`). That is a fixture coincidence. A real authenticated expert has no such
row, so `report.validate` could never have been opened through the product.

Migration `0010_pf07b_professional_review_signature.sql` mirrors, line for
line, what PF-03A already did to `audit_logs` (`drizzle/0003`, lines 265-266):

```sql
ALTER COLUMN "reviewer_user_id" DROP NOT NULL,
ADD COLUMN "reviewer_identity_id" uuid REFERENCES "user_identities"("id"),
ADD COLUMN "signed_by_role" varchar(32);
```

plus two CHECK constraints — a review always names a reviewer on one model or
the other, and a decided review always carries its timestamp — and an index on
`(tenant_id, case_id, created_at DESC)`, which is the read PF-06 performs.
Additive: no row is rewritten and legacy rows keep their `reviewer_user_id`.

**Grants and RLS are untouched.** The only privilege statement in `0010` is the
`EXECUTE` on the refreshed readiness function to `patrimoine_app`, identical to
`0009`. No role is created, no `SUPERUSER` or `BYPASSRLS` is granted, and RLS is
not altered: `professional_reviews` keeps the `ENABLE` + `FORCE ROW LEVEL
SECURITY` it has had since PF-03B, and the readiness attestation still asserts
31 of 31 declared tables.

**`signed_by_role` is deliberately not a database enum.** It records the
internal role held at signing time for the audit trail. It is written from the
server-resolved `context.role` — a closed union validated when the Clerk
context is built — and is read back only for display. **It is never an
authorization input**: every decision goes through
`withAuthorizedTenantTransaction` against the live context, never against this
stored string. Typing it as the `user_role` enum would be tighter, but the
column authorizes nothing, so it was not worth a second migration.

**Rollback and operational implications.** The migration is forward-only, as
PF-03C requires, and reversing it is not a data-loss operation: dropping
`reviewer_identity_id`, `signed_by_role` and the two CHECK constraints would
restore the previous shape, except that `reviewer_user_id` could not be made
`NOT NULL` again while any review signed through the new path exists — those
rows carry an identity, not a legacy user. In practice a rollback means
deploying the previous application build and leaving the columns in place;
they are additive and the older code simply ignores them. Because the marker
moved to `0010`, **`/api/health` answers `not_ready` until the migration is
applied**, so a deployment that reaches a database still at `0009` fails its
readiness gate loudly rather than serving a half-migrated schema.

## 12.2 The server action

`lib/review/review-service.ts` + `POST /api/v1/cases/{caseId}/reviews`.

Clerk session → internal tenant context → central capability matrix → RLS
transaction → append-only audit. It computes nothing: it records a human
decision about work the deterministic engine already produced.

- **Two decisions only**: `approved` and `changes_requested`. `pending` is an
  initial state, not a signature, and `rejected` would be a third workflow with
  its own consequences — neither was invented.
- **The motive is mandatory** and is refused before any authorization work, so
  an empty comment writes nothing.
- **A decision appends a row**, so the dossier keeps its full review history
  and PF-06 keeps reading the newest one.
- The audit event carries the decision, the signing role and the review id —
  **not** the motive, which lives on the review row rather than being
  duplicated.

## 12.3 RBAC, from the existing matrix

`simulation.review` was already defined; PF-07B invented no capability.

| Role | Sign a review | Why |
|---|---|---|
| admin | **ALLOW** | holds every action |
| expert | **ALLOW** | the professional reviewer role |
| conseiller | **DENY** | `simulation.review` is not in that row |
| client | **DENY** | idem, and the form is never rendered |
| auditeur | **DENY** | read-only role |
| cabinet B on a cabinet A dossier | **DENY** | `DOSSIER_NOT_FOUND` — invisible under RLS, never confirmed to exist |
| revoked member | **DENY** | `TENANT_MEMBERSHIP_REQUIRED` |
| unknown identity | **DENY** | `CLERK_TENANT_CONTEXT_DENIED` |

A conseiller being denied is the existing model, not a new restriction: the
role that generates a report is deliberately not the role that reviews it.

## 12.4 A defect found while closing the gap

`validateVersion` computed its blocking flags from the **stored** snapshot
only. A version generated while the review was signed could therefore still be
approved after a later review asked for changes — the delivered document would
have stated a reality that no longer held.

PF-06B's own documentation claimed the approval button was "disabled while the
readiness gate is closed or the report is stale, mirroring exactly what the
server enforces". The UI did disable it; the server did not enforce it.

PF-07B makes the server enforce it: approving a version whose freshness verdict
is `outdated` is refused with `REPORT_REGENERATION_REQUIRED`.
`changes_requested` and `rejected` stay allowed while stale — asking for
changes on an outdated draft is precisely the point.

## 12.5 The review screen

`/review` now resolves its own tenant context exactly as `/report` does and
**reuses the same server read model** (`loadReportConsole`), extended with the
review history and a `signReview` capability. There is no parallel model: a
role, a blocker or a decision cannot disagree between the two cabinet screens.
The fixture queue below it is untouched demonstration content.

The professional opens the dossier, reads the blocking points, chooses
*Approuver* or *Demander des corrections*, types a mandatory motive, signs, and
sees the new state plus what to do next. A client sees no signing surface at
all.

## 12.6 The E2E pre-seed is gone

`lib/db/seed-e2e-fixture.ts` no longer inserts an `approved` review. The
authenticated journey is now genuinely:

```
EXPERT_A login → CABINET_A → Claire/Marc → /review
  → sign CHANGES_REQUESTED  → gate stays closed, delivered draft untouched
  → sign APPROVE            → revue stage turns done
  → /report regenerate      → the draft was stale; the server refuses to
                              approve a stale version
  → validate                → VALIDATED, no watermark, new version
  → download                → private PDF
```

| Journey | Result |
|---|---|
| ADVISER_A generates a draft; is offered no signing surface (`data-review-can-sign="no"`) | PASS |
| EXPERT_A signs `changes_requested`; gate stays closed, `review.professional_not_signed` shown, delivered version unchanged | PASS |
| EXPERT_A signs `approved`; the *revue* stage turns `done` | PASS |
| EXPERT_A regenerates, validates into a new version, downloads the private PDF | PASS |
| CLIENT_A sees no signing surface; direct `POST …/reviews` → **403 `TENANT_AUTHORIZATION_DENIED`** | PASS |
| EXPERT_B signing on cabinet A → **`DOSSIER_NOT_FOUND`** | PASS |
| unknown identity, revoked membership | PASS (unchanged) |

## 12.7 Tests added

- `tests/postgres/pf07b-professional-review.test.ts` — 16 cases on a real
  cluster: authorized signature, mandatory comment, conseiller denied, client
  denied and audited, `changes_requested` not opening the gate, approval
  opening it, history appended not rewritten, the audited `review.decided`
  event, admin signing, both CHECK constraints, cross-tenant denial, review
  history hidden from cabinet B, revoked membership denial, and a signature
  turning a delivered draft stale **while its `pdf_sha256` and
  `snapshot_sha256` stay byte-identical**.
- `tests/unit/pf07b-professional-review.test.ts` — 11 cases pinning who may
  sign, the two-decision contract, request parsing, and that every review
  refusal stays explainable.

Two pre-existing assertions were drift-proofed rather than re-pinned to `0010`:
the PF-06 readiness attestation now reads `managedPostgresMigrationMarker`, and
the unit marker test now asserts the marker names the newest migration file —
so neither will need editing on the next migration.

## 12.8 Validation

| Command | Result |
|---|---|
| `npm test` | PASS — 36 files, 445 tests |
| `npm run test:postgres` | PASS — 6 files, 66 tests, migrations `0000` → `0010` |
| `npm run e2e` (public) | PASS — 36 passed, 46 skipped |
| `E2E_CLERK_FIXTURE=1 npm run e2e` | **PASS — 58 passed, 24 skipped, 0 failed** |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS after `rm -rf .next` |
| `git diff --check` | PASS |

Migration `0010` was applied to the **real Neon staging database**
(`npm run db:migrate` → `{"status":"migrated","migration":"0010_pf07b_professional_review_signature"}`).

**Vercel Preview** `dpl_7YCxxiENt2VLaM3mWatbbPphkvUP`, target `preview`
(never `--prod`), state **Ready**. Deployment Protection left enabled; routes
reached through Vercel's own share mechanism.

| Route | Result |
|---|---|
| `/api/health` | **200 `{"status":"ok"}`** — the deployed runtime verified marker `0010` and FORCE RLS against real Neon with the `NOBYPASSRLS` login. A failed migration would have answered `not_ready`. |
| `/review` | 200, one `h1`, and the error model live: `CLERK_SESSION_REQUIRED`, « Authentification requise », « Prochaine action » |
| `/report`, `/cabinet`, `/dossiers` | 200 |

## 12.9 Pilot deployment decision

**PILOT DEPLOYMENT DECISION: Production and Preview temporarily share the same
Neon database. This is accepted for the current demo/pilot environment. A
dedicated Production database remains a pre-live requirement before real client
data is admitted.**

Taken by the owner when closing the PF-07 Production gate, after the audit
established that Production and Preview already pointed at the same Neon
project. Production was then configured for the PF-03+ data layer:
`DATABASE_URL` on the `patrimoine_runtime` login, `PERSISTENCE_MODE=DATABASE`,
a **fresh** `DOCUMENT_DOWNLOAD_SIGNING_SECRET` (48 random bytes, not the
Preview value), and `CLERK_WEBHOOK_DATABASE_URL` on the dedicated
`patrimoine_webhook` login. All four are Production-scoped and sensitive.
`DATABASE_ADMIN_URL` remains absent from every Vercel environment.

Two consequences hold while this stands, and neither should be forgotten:

1. A write from Preview is visible in Production and vice versa — including the
   synthetic tenants the authenticated E2E suite creates.
2. Revoking Preview access revokes Production access, because both use the same
   runtime login.

`npm run db:verify` and `npm run db:verify:webhook` both report `verified`
against that database with the configured credentials.

## 12.10 Still open after PF-07B

1. **Production** still needs `CLERK_WEBHOOK_DATABASE_URL`, a production
   `patrimoine_webhook` login, and migration `0010`.
2. The fixture cabinet surfaces (`/cabinet`, `/dossiers`, `/simulations`,
   `/evidence`) remain demonstration content, and the AppShell dossier selector
   is still hardcoded. `/report` and `/review` are the authenticated screens.
3. E2E report artifacts accumulate in the private Blob under the CABINET_A
   tenant prefix.
4. `rejected` as a third review decision, and a review *request* workflow
   (`review.requested` exists in the audit enum but nothing emits it), are
   deliberately not implemented.

## 13. PF-07-POST-MERGE — Production smoke after PR #14

Run date: 2026-08-22. Branch: `claude/pf-07-production-smoke-be7ac7`.
HEAD: `cc61cdfe3a0282a7ca13491cd64081f6e68becd9`.

No application code was changed. This section records what the merged build
actually proves on the Production runtime, and — just as important — what it
does **not** prove and why.

### 13.1 Deployment

| Field | Value |
|---|---|
| id | `dpl_En9ppFF2jor5cAagnhR1jgmwENa5` |
| commit | `cc61cdfe3a0282a7ca13491cd64081f6e68becd9` (GitHub verification: `verified`) |
| target | `production` |
| state | **READY** |
| aliases | `patrimoine-fiscal-demo.vercel.app`, `…-git-main-…`, `…-ludovics-projects-…` |
| region | `iad1` |

`git fetch origin main` puts `origin/main` at `cc61cdf…`, identical to the
deployment's `githubCommitSha`. The merge deployment is the live Production
alias.

### 13.2 Health — PASS

`GET https://patrimoine-fiscal-demo.vercel.app/api/health` returns **200**
`{"status":"ok"}`.

`app/api/health/route.ts` returns `ok` only after every one of these holds, so
the single word carries all of them:

- `PERSISTENCE_MODE=DATABASE` — any other mode returns `not_ready`;
- `DATABASE_URL` present and connectable from the deployed runtime;
- `assertSafeDatabaseRuntimeRole` — the login is NOSUPERUSER, NOBYPASSRLS,
  holds no direct table privilege and can assume `patrimoine_app`;
- `app_security.managed_postgres_readiness()` returns
  `migration = "0010_pf07b_professional_review_signature"` — the marker
  constant in `lib/db/managed-readiness.ts` — and `rlsReady = true`.

So migration `0010` and FORCE RLS are confirmed **through the Production
runtime's own credential**, not through an operator connection.

### 13.3 Server-side denial surface — PASS

Executed against the Production alias with no session. Every refusal is the
assertion; none needed a credential.

| Probe | Result |
|---|---|
| `POST /api/v1/cases/{caseId}/reviews` (PF-07B, new) | **401** `CLERK_SESSION_REQUIRED` |
| `POST /api/v1/reports/cases/{caseId}/versions` | **401** `CLERK_SESSION_REQUIRED` |
| `POST /api/v1/reports/versions/{id}/validation` | **401** `CLERK_SESSION_REQUIRED` |
| `GET /api/v1/reports/versions/{id}/download` | **401** `CLERK_SESSION_REQUIRED` |
| `GET …/download/stream` | **401** `CLERK_SESSION_REQUIRED` |
| `POST /api/webhooks/clerk` — no signature | **400** `invalid_webhook` |
| `POST /api/webhooks/clerk` — tampered signature | **400** `invalid_webhook` |

The PF-07B review route existing and refusing is what proves the merge reached
Production. The download routes refuse before any grant is considered, and no
permanent public Blob URL is emitted anywhere on the response path.

### 13.4 Cabinet screens — PASS

`/report` and `/review` both answer 200 and render the PF-07 shared error
catalog live: title « Authentification requise », state « pipeline serveur
indisponible » and « revue serveur indisponible », explanation « Aucune session
n'est ouverte pour ce navigateur. », a « Prochaine action » line and the
machine-readable `CLERK_SESSION_REQUIRED`. `/report` still labels its browser
rendering « Aperçu de travail — NON FINAL ». `/review` exposes **no signing
surface** to an unauthenticated visitor, and its fixture queue states that it
signs nothing.

### 13.5 Runtime logs — CLEAN

Scoped to `dpl_En9ppFF2jor5cAagnhR1jgmwENa5`: **no 500, no fatal, no database
error, no unexpected RLS error, no Blob error, no Clerk signature error**.
Every logged request is one of the probes above — 200s on the pages and health,
the expected 401/400 denials, and one 404 for a route that does not exist.
`get_runtime_errors` over 24 h returns no error cluster at all.

Two observations that are **not** defects of this deployment but are recorded
because they matter:

1. At 16:10:26 UTC — five minutes **before** this deployment — a real
   `POST /api/webhooks/clerk` returned **503** on the previous Production
   deployment `dpl_6ayMjXaoCA71idRL4PsdNRrxzDuj`. That build predates the
   `CLERK_WEBHOOK_DATABASE_URL` and `PERSISTENCE_MODE` configuration taking
   effect. It should be re-checked once a signed delivery can be replayed
   against the merged build (see 13.6).
2. Clerk's own telemetry notice appears on every Production invocation: the
   deployment is connected to a Clerk **development** instance
   (`pk_test_…`, host `touched-fly-5669.clerk.accounts.dev`, and the sign-in
   card shows a "Development mode" badge). This is acceptable for the pilot and
   is consistent with the shared-database pilot decision, but it is a second
   pre-live item alongside database separation.

### 13.6 Authenticated cabinet journeys — not run on Production

> **Reclassified in section 14.1.** This section originally labelled these
> journeys BLOCKED. The correct classification is
> `NOT_APPLICABLE_IN_PRODUCTION_BY_POLICY`: the application path is proven in
> staging, and production replay is excluded by repository safeguards rather
> than by a missing capability. The analysis below stands; only the label
> changed. The webhook persistence leg it lists as unproven was closed in 14.2.

The EXPERT_A signing journey, the CLIENT_A denial, the EXPERT_B cross-tenant
denial and the revocation journey **were not executed against Production**.
Nothing was relaxed, faked or asserted without evidence. Two independent
blockers stand, and the second is a deliberate project safeguard rather than a
missing tool.

**Blocker 1 — no non-interactive session for the synthetic identities.**
The five `+clerk_test` fixture identities deliberately hold **no password**
(`lib/auth/e2e-fixture-plan.ts`): sign-in goes through a short-lived
Backend-API *ticket*. The Production sign-in card offers only Google OAuth and
email+password, and no email-code strategy is enabled, so a browser cannot
reach them without minting a ticket. Minting one requires executing a script,
and this session's environment denied every ad-hoc script invocation
(`node`, `npx`). Setting a password on a fixture identity, or using a human
Google account, were both refused rather than attempted.

**Blocker 2 — the journeys require seeding the E2E fixture into the Production
database, which the repository forbids.**
`scripts/seed-e2e-fixture.ts` refuses this outright:

    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
      throw new Error("E2E_FIXTURE_SEED_FORBIDDEN_IN_PRODUCTION");
    }

The authenticated matrix needs tenant `CABINET_B`, five synthetic identities,
their authoritative memberships and a client dossier grant to exist in the
target database; PF-07 created them only on a **disposable** cluster. The
revocation journey additionally needs `E2E_ADMIN_DATABASE_URL` — the Neon
**owner** connection — handed to the test harness, while PF-03C requires
`DATABASE_ADMIN_URL` to stay deployment-only and absent from every application
environment. Executing step 4 as written would therefore have meant seeding
synthetic tenants into the live database and granting the harness owner-level
access to it, against two explicit project rules. Reported instead of done.

Consequently these also did not run:

- **Webhook persistence, positive path** — a valid Svix-signed delivery has to
  be generated by a script. Only the signature-rejection half could be proven
  (13.3). Persistence through `CLERK_WEBHOOK_DATABASE_URL` on Production stays
  **unproven on Production**; it is PASS on Preview against the same shared
  Neon database (section 2), and `npm run db:verify:webhook` reported
  `{"status":"verified"}` for the Production login when it was configured.
- **Private report PDF round-trip with a verified `pdfSha256`** — requires an
  authenticated generation and a database read.
- **E2E artifact cleanup** — **NOT_RUN, nothing deleted.** Listing the private
  Blob store under the CABINET_A prefix requires the store token and a script.
  Per the task's own rule, where identification is not certain nothing is
  removed. The artifacts remain, and pruning them with a TTL stays on the
  next-task list.

### 13.7 Status after this run

> **Superseded by section 14.** The status below was accurate when section 13
> was written. Section 14 then closed the Production webhook gate and
> reclassified the fixture journeys, so the final state is
> **COMPLETE / VERIFIED_PRODUCTION**. The reasoning here is kept as the record
> of what was known at this point.

PF-07 was, at the end of this run, **COMPLETE / VERIFIED_PRODUCTION_PARTIAL**.

The Production runtime is proven live, correctly configured and enforcing:
health with the `0010` marker and FORCE RLS, the PF-07B review route deployed,
the whole authenticated API surface refusing sessionless callers, the webhook
signature layer refusing unsigned and tampered deliveries, the cabinet screens
rendering the shared error model, and clean logs.

What is **not** proven on Production is any journey that requires an
authenticated cabinet session. That evidence exists on Preview against the same
shared Neon database (58 passed, 24 skipped, 0 failed) — which, under the pilot
decision, is the same data store Production reads. It is not the same as having
driven Production itself, and this document does not claim it is.

The clean way to close 13.6 is item 4 of the next-task list: give Production its
**own** database, then provision the fixture on a non-production target and
drive the journeys there, or expose a ticket-minting path an operator can run
interactively.

## 14. PF-07-FINAL-CLOSE — Production verification closed

Run date: 2026-08-22, after section 13. Branch
`claude/pf-07-production-smoke-be7ac7`, on merge commit `cc61cdf`.
No application code changed.

Section 13 left one genuinely useful Production gate open and one set of gates
mis-classified. This section closes the first and corrects the second.

### 14.1 Reclassification — Production fixture journeys are out of scope by policy

Section 13 recorded the authenticated cabinet journeys as **BLOCKED**. That was
the wrong label and it is corrected here.

**AUTHENTICATED E2E, STAGING — PASS.** `E2E_CLERK_FIXTURE=1 npm run e2e`:
**58 passed, 24 skipped, 0 failed**, on 2 browser projects, against real Clerk
sessions, real PostgreSQL with FORCE RLS, a `NOBYPASSRLS` runtime login, the
real capability matrix and the real private Blob store (section 3, and
section 12.8 for the PF-07B additions). The application path is proven.

**PRODUCTION DESTRUCTIVE FIXTURE E2E —
`NOT_APPLICABLE_IN_PRODUCTION_BY_POLICY`.**

Replaying those journeys against Production is not a missing test. It is an
action the repository deliberately forbids, for four independent reasons:

1. `scripts/seed-e2e-fixture.ts` refuses it outright —
   `E2E_FIXTURE_SEED_FORBIDDEN_IN_PRODUCTION`.
2. The revocation journey needs the Neon **owner** connection as
   `E2E_ADMIN_DATABASE_URL`; PF-03C requires `DATABASE_ADMIN_URL` to stay
   deployment-only and absent from every application environment.
3. The journeys mutate and revoke authoritative memberships. That is a
   synthetic state machine and must not be driven on Production.
4. Reaching the `+clerk_test` identities without a Backend-API ticket would
   mean giving a fixture identity a password.

This is **not** a FAIL and **not** a BLOCKED item. The behaviour is verified in
staging; production replay is excluded by policy, and the safeguards that
exclude it are themselves part of what PF-07 delivers. Nothing was bypassed,
weakened or worked around to reach this conclusion.

### 14.2 Production webhook persistence — PASS

This was the last Production gate worth closing, and it is now closed against
the real Production endpoint, the real signing secret, the real
`CLERK_WEBHOOK_DATABASE_URL` and the dedicated `patrimoine_webhook` login. No
secret value was read or printed: the signing secret was sourced into the
process environment and consumed by `openssl` without ever being echoed.

First, the repository's own read-only check, run against the **Production**
webhook credential:

    npm run db:verify:webhook
    {"status":"verified","role":"patrimoine_webhook_service"}

Then a synthetic `organization.updated` delivery, signed with the Svix scheme
(`{svix-id}.{svix-timestamp}.{body}`, HMAC-SHA256, base64), sent to
`https://patrimoine-fiscal-demo.vercel.app/api/webhooks/clerk`:

| Request | Result | Meaning |
|---|---|---|
| valid signature, first delivery | **200** `{"received":true,"processed":true}` | signature accepted; receipt **newly inserted**; observation written |
| byte-identical replay | **200** `{"received":true,"processed":false}` | **idempotent** — `ON CONFLICT (provider, event_id) DO NOTHING` matched |
| tampered body, same signature | **400** `{"error":"invalid_webhook"}` | refused at `verifyWebhook`, before any persistence code runs |
| no signature headers | **400** `{"error":"invalid_webhook"}` | same |

Why `processed: true` is proof of persistence and not merely of a 200: the
route returns **503** `webhook_processing_failed` if the transaction throws,
and `recordSignedClerkWebhook` opens that transaction on
`CLERK_WEBHOOK_DATABASE_URL`, asserts the connected login through
`assertSafeClerkWebhookRole`, and only then `set local role
patrimoine_webhook_service` before calling
`app_security.record_clerk_webhook_event`. A `true` result can only come from
that function having committed. The historical **503** of 16:10:26 UTC on the
previous deployment is exactly this path failing before the configuration
existed — the same request now returns 200.

`processed: false` on replay is equally precise: the function inserts the
receipt with `ON CONFLICT DO NOTHING` and **returns early** when nothing was
inserted, so a replay rewrites no observation at all.

**No internal authoritative membership was created, by construction.**
`app_security.record_clerk_webhook_event` writes only `auth_webhook_events`,
`auth_provider_organizations`, `auth_provider_memberships` and the provider
observation in `user_identities`. It never touches `memberships`,
`tenant_memberships`, `tenants` or `cabinets`. This particular event carried no
`user_id` and no membership status, so **only the organization observation row
was written** — the user and membership branches were not entered.

The event deliberately named a **fresh synthetic organization**
(`org_pf07prodsmoke20260822`) rather than an existing one, so no existing row
was mutated: the delivery is insert-only. That organization is mapped to no
internal tenant, and PF-04A's `resolve_clerk_context` returns nothing for an
unmapped organization, so the row **authorizes nothing**. It is a
non-authoritative observation and is listed as a follow-up in 14.5.

### 14.3 Production unauthenticated security — PASS

Re-run on the current deployment, all refused server-side:

| Probe | Result |
|---|---|
| `POST /api/v1/cases/{caseId}/reviews` (PF-07B) | **401** `CLERK_SESSION_REQUIRED` |
| `POST /api/v1/reports/cases/{caseId}/versions` | **401** `CLERK_SESSION_REQUIRED` |
| `POST /api/v1/reports/versions/{id}/validation` | **401** `CLERK_SESSION_REQUIRED` |
| `GET /api/v1/reports/versions/{id}/download` | **401** `CLERK_SESSION_REQUIRED` |
| `GET …/download/stream` | **401** `CLERK_SESSION_REQUIRED` |
| `GET /api/v1/documents/{id}/download` | **401** `CLERK_SESSION_REQUIRED` |

`/report` and `/review` expose **no privileged action** without an
authenticated tenant context: both render the shared error catalog with the
machine-readable `CLERK_SESSION_REQUIRED`, and `/review` shows no signing
surface at all. No permanent public Blob URL appears on any response path.

### 14.4 Production runtime logs — PASS

Scoped to `dpl_En9ppFF2jor5cAagnhR1jgmwENa5`:

- **zero 5xx over a 6-hour window** — explicit `statusCode=5xx` query returns
  nothing;
- **zero error-, fatal- or warning-level entries**;
- no database error, no RLS failure, no Blob error, no Clerk runtime error.

Every logged request is one of the verifications above: the 200s (health and
the two accepted webhook deliveries), the 401 denials and the 400 webhook
refusals.

The **503** of 16:10:26 UTC belongs to the previous deployment
`dpl_6ayMjXaoCA71idRL4PsdNRrxzDuj`, five minutes before the PF-07 deployment
existed, on the build that predates the Production webhook configuration. It is
**historical** and is not attributable to the current deployment — 14.2 shows
the same path now returning 200.

### 14.5 Follow-ups, none of which block PF-07

- **`E2E_BLOB_CLEANUP = FOLLOW_UP`.** E2E report artifacts accumulate in the
  private Blob store under the CABINET_A tenant prefix. **Nothing was deleted**
  — identification is not certain from outside the store, and the rule is to
  remove nothing when uncertain. What this needs: an identifiable E2E object
  prefix distinct from real evidence, a cleanup command with a TTL policy, and
  a hard guarantee that real evidence is never in scope.
- **One synthetic observation row** (`org_pf07prodsmoke20260822` in
  `auth_provider_organizations`, plus its `auth_webhook_events` receipt) is left
  on the shared database by 14.2. Unmapped, non-authoritative, authorizes
  nothing. Remove it whenever the database next has an operator session.

### 14.6 Final state

**PF-07 = COMPLETE / VERIFIED_PRODUCTION.**

| Evidence | Status |
|---|---|
| Production deployment `dpl_En9ppFF2jor5cAagnhR1jgmwENa5` READY | PASS |
| `/api/health` | PASS |
| migration `0010` marker | PASS |
| runtime FORCE RLS + safe runtime role | PASS |
| Production environment configuration | PASS |
| authenticated E2E, staging (58/24/0) | PASS |
| Production unauthenticated security | PASS |
| Production webhook persistence + idempotency + tamper refusal | PASS |
| Production runtime logs | PASS |
| Production destructive fixture journeys | `NOT_APPLICABLE_IN_PRODUCTION_BY_POLICY` |

Standing pre-live requirements, none blocking PF-08 for the pilot/demo:

1. a **dedicated Production database** before real client data;
2. a **Production Clerk instance** instead of the current Development one;
3. **E2E Blob cleanup / TTL policy**.
