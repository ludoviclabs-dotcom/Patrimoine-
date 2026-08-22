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

## 12.9 Still open after PF-07B

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
