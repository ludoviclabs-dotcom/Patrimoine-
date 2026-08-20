# PF-06C — Staging infrastructure and real provider evidence

Branch: `claude/private-document-storage-evidence-c569fd`
HEAD before PF-06C: `5096994c41449469eb6cc7441505932ea6c93bbd`
Local commits not yet pushed: `d9c3827` (PF-05), `b3c1690` (PF-06),
`5096994` (PF-06B).

This run inventoried the real provider surface, linked the repository to the
correct Vercel project, fixed the Playwright harness, and stopped at the cost
gate before creating any cloud resource. **No provider round-trip was
performed and none was simulated.**

No fiscal engine, rule, rate, threshold, effective date or golden expected
result was touched.

---

## 1. Resource inventory (read-only)

Secret *values* were never read or printed. Only presence is reported.

### A. Vercel

| Item | Status | Detail |
|---|---|---|
| Account | PRESENT | `ludoviclabs-7443` |
| Team | PRESENT | `ludovic's projects` — `ludovics-projects-159c139c` |
| Project `patrimoine-fiscal-demo` | PRESENT | `prj_TmKJzWQsY6glAeWPTz7jsvEWrdHS`, Next.js preset, Node 24.x, created 86 days ago |
| Local `.vercel` link | PRESENT (created this run) | Linked to `patrimoine-fiscal-demo`; `.vercel/` and `.env.local` are covered by pre-existing `.gitignore` rules |
| Deployments | PRESENT | 11+ deployments, production alias live |
| Attached marketplace resources | MISSING | `vercel integration ls` → "No resources found" |
| Blob store for this project | MISSING | see §2 |
| Environment variables | PRESENT (1) | only `CRON_SECRET` (Production). `DATABASE_URL`, `DATABASE_ADMIN_URL`, `BLOB_READ_WRITE_TOKEN`, `DOCUMENT_DOWNLOAD_SIGNING_SECRET` and every Clerk key are **MISSING** on the project |

### B. PostgreSQL

| Item | Status |
|---|---|
| Provider attached to the project | MISSING |
| `DATABASE_URL` (project or local) | MISSING |
| `DATABASE_ADMIN_URL` | MISSING |
| `CLERK_WEBHOOK_DATABASE_URL` | MISSING |
| Dedicated preview/staging database | MISSING |

No `.env`, `.env.local` or `.env.staging` carrying database credentials exists
in this worktree or in the canonical repository (checked by file existence and
key names only).

### C. Clerk

| Item | Status |
|---|---|
| Clerk application for Patrimoine Fiscal | UNVERIFIED — no CLI, no API token, no dashboard access from this session |
| Test/development instance | UNVERIFIED |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | MISSING |
| `CLERK_SECRET_KEY` | MISSING |
| `CLERK_WEBHOOK_SIGNING_SECRET` | MISSING |
| Organizations enabled | UNVERIFIED |

Clerk has no CLI. Determining whether an application exists, and creating one,
requires an interactive browser login to the Clerk dashboard.

---

## 2. Project isolation

The only Blob store on the account is **`carbonco-workbooks`**
(`store_bAc4W7EcGNgzWC7b`, region `cdg1`, attached to the unrelated project
`carbon`). Per the isolation rule it was **not used, not modified and not
detached**; nothing was written to it and no token for it was requested.

No Blob store exists for Patrimoine Fiscal.

---

## 3. Cost / resource creation gate

| Resource | Category | Verdict |
|---|---|---|
| Vercel Blob store `patrimoine-fiscal-private` | **B/C** — Blob is a metered product (storage, transfer, operations). The CLI exposes no plan tier or remaining allowance, and `vercel blob create-store --help` states no cost implication | **STOP — approval required** |
| Managed PostgreSQL (Neon / Supabase / Prisma / AWS …) | **B/C** — every marketplace product attaches a billable plan; additionally `vercel integration accept-terms` states it *"Requires an interactive terminal and human confirmation"*, which this session cannot provide | **STOP — approval required, plus an interactive terminal** |
| Clerk application / test instance | **C** — no CLI and no API token; creation requires an interactive dashboard login | **BLOCKED — human action required** |

Category A (clearly free and included) could not be confirmed for any of them,
so nothing was created.

### RESOURCE CREATION APPROVAL REQUIRED

**1. Vercel Private Blob store**
- Provider: Vercel
- Reason: Blob is metered; the account plan tier and remaining free allowance
  cannot be read from the CLI, so additional billing cannot be excluded
- Known cost: unknown from this session — Vercel Blob bills storage, data
  transfer and operations beyond the plan allowance
- Proposed action: `vercel blob create-store patrimoine-fiscal-private --access private --region cdg1 --environment preview --environment development`
  (region `cdg1` matches the existing EU store; `--environment production` is
  deliberately excluded from a staging run)

**2. Managed PostgreSQL (staging)**
- Provider: Vercel Marketplace (Neon or Supabase — the project has never had
  one attached, so no provider is "already retained"; the choice is the
  owner's)
- Reason: marketplace installation attaches a plan that may bill, and the
  terms acceptance step explicitly requires an interactive terminal
- Known cost: provider free tiers exist but cannot be confirmed for this
  account from here
- Proposed action: install the chosen integration interactively, create a
  **staging-only** database, then set `DATABASE_URL` (runtime login, member of
  `patrimoine_app`, `NOSUPERUSER NOBYPASSRLS`, no direct table grants) and
  `DATABASE_ADMIN_URL` (deployment-only) as Preview/Development environment
  variables

**3. Clerk test instance**
- Provider: Clerk
- Reason: no programmatic access; dashboard login required
- Known cost: Clerk development instances are normally free, but the account
  state cannot be verified from here
- Proposed action: owner creates or confirms a development instance with
  Organizations enabled, then sets the three Clerk keys as Preview/Development
  environment variables

Nothing above was executed.

---

## 4. Playwright harness — root cause found and fixed

This was the one blocker that was determinable without any credential, and it
is now resolved.

**Symptom** (since PF-03B): `npm run e2e` printed *"Next.js dev server did not
become ready"*, then a flood of `Failed to proxy http://localhost:PORT/ Error:
socket hang up { code: 'ECONNRESET' }`, ending in
`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c,
line 76`.

**Diagnosis**, step by step:

| Test | Result |
|---|---|
| Bare Node `http` server on `127.0.0.1` + curl | **200 in 8 ms** — local sockets are fine, the sandbox is not the cause |
| `next dev --hostname 127.0.0.1` → `/report` | 500 after 30 s, "Failed to proxy" |
| `next dev --hostname 127.0.0.1` with syntactically valid dummy Clerk keys | 500 — not a missing-credential crash |
| `next start --hostname 127.0.0.1` (production build) | 500, and `EADDRINUSE` on **connect** |
| `next start` with the **default** bind (dual stack) | **200 on both `localhost` and `127.0.0.1`** |

**Root cause.** Next.js 16 proxies every request to its render worker through
the literal host `localhost`. On this Windows host `localhost` resolves to
`::1` first. `scripts/run-e2e.mjs` started the server with
`--hostname 127.0.0.1`, binding IPv4 only, so the internal hop could never
connect: every request returned 500, and the repeated failed proxy attempts
ended in the libuv handle assertion. It is an environment incompatibility in
the harness, not a defect in the application and not a Playwright or Node bug.

**Fix** (`scripts/run-e2e.mjs`, no security assertion touched):
1. dropped the IPv4-only `--hostname 127.0.0.1` pin so Next binds the default
   dual stack and its internal proxy hop resolves;
2. the readiness probe now treats *any* HTTP response as "listening" (`next
   dev` legitimately answers non-2xx while compiling on demand) and delays
   between every attempt — previously the delay sat inside the `catch` only,
   so a non-2xx response spun the loop into a busy-wait that flooded the
   server.

**Result:** `npm run e2e` → **12 passed, 4 skipped**, including the untouched
pre-existing `demo.spec.ts` on both `chromium` and `mobile-chrome`. The 4
skipped are the authenticated journeys, still gated on `E2E_CLERK_FIXTURE=1`.

Environment for the record: Node **v24.14.0**, Playwright **1.60.0**, Next
**16.2.6** (Turbopack), Windows 10.0.19045.7663.

---

## 5. Production evidence matrix

| Gate | Status | Evidence |
|---|---|---|
| Managed Postgres | BLOCKED | No provider attached to `patrimoine-fiscal-demo`; `DATABASE_URL`/`DATABASE_ADMIN_URL` MISSING; marketplace install requires an interactive terminal and an unresolved cost approval |
| Migrations 0000-0009 | BLOCKED | No managed database to apply them to. Applied and verified locally on an ephemeral PostgreSQL 18.4 cluster by `npm run test:postgres` (4 files, 39 tests) — that is local, not staging |
| Runtime NOBYPASSRLS | BLOCKED | No managed runtime login exists. `assertSafeDatabaseRuntimeRole` and the role checks are exercised locally by the PostgreSQL suite |
| Clerk real session | BLOCKED | No Clerk keys; instance existence UNVERIFIED; no CLI or API access from this session |
| Organization mapping | BLOCKED | Depends on a Clerk instance and a managed database |
| Revocation | BLOCKED | Depends on a real Clerk session plus a managed database. Covered locally: `tests/postgres/pf05-private-documents.test.ts` and `pf03b-tenant-isolation.test.ts` prove the next request fails with `TENANT_MEMBERSHIP_REQUIRED` after the DB membership is revoked |
| Private Blob | BLOCKED | No store for this project; creating one is gated on cost approval. `carbonco-workbooks` deliberately untouched |
| Document upload | BLOCKED | Requires the Blob store and the managed database |
| Document download | BLOCKED | Requires the Blob store and the managed database |
| Server PDF generation | BLOCKED | Requires the managed database. Verified locally, including byte-reproducible rendering (`tests/unit/pf06-server-report.test.ts`) |
| Professional validation | BLOCKED | Requires a real Clerk EXPERT session. Verified locally end to end (`tests/postgres/pf06b-report-console.test.ts`) |
| Private PDF download | BLOCKED | Requires the Blob store and the managed database |
| Cross tenant denial | BLOCKED | Requires two real Clerk organizations. Verified locally against real PostgreSQL RLS in three suites, including a forged-but-correctly-signed grant resolving nothing |
| Audit trail | BLOCKED | Requires the managed database. Verified locally: all four report audit actions and the document actions are asserted |
| Playwright | PASS (public surface) / NOT_RUN (authenticated) | `npm run e2e` → 12 passed, 4 skipped. The harness blocker is fixed; the 4 skipped authenticated journeys stay gated on `E2E_CLERK_FIXTURE=1` |

No status above is a PASS that was not actually observed.

---

## 6. Provisioning runbook (for PF-05-06-PUBLISH)

Once the three approvals land, the sequence is mechanical:

```bash
# 1. Private Blob store, dedicated to this project, EU region, staging targets
vercel blob create-store patrimoine-fiscal-private \
  --access private --region cdg1 \
  --environment preview --environment development

# 2. Managed PostgreSQL: install the chosen integration interactively, create a
#    staging-only database, then register both logins as Preview/Development
vercel env add DATABASE_URL preview            # runtime login, patrimoine_app member
vercel env add DATABASE_ADMIN_URL preview      # deployment-only
vercel env add DOCUMENT_DOWNLOAD_SIGNING_SECRET preview   # >= 32 chars

# 3. Clerk development instance with Organizations enabled
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY preview
vercel env add CLERK_SECRET_KEY preview
vercel env add CLERK_WEBHOOK_SIGNING_SECRET preview
vercel env add PERSISTENCE_MODE preview        # value: DATABASE

# 4. Schema and verification (PF-03C process)
vercel env pull .env.staging.local             # gitignored
npm run db:migrate                             # migrations 0000 -> 0009
npm run db:verify                              # NOSUPERUSER / NOBYPASSRLS / patrimoine_app
npm run db:smoke                               # staging only, refuses production

# 5. Synthetic fixtures — Claire & Marc in CABINET_A, a separate dossier in CABINET_B
ALLOW_DEMO_FIXTURE_SEED=true npm run db:seed:demo

# 6. Authenticated journeys
E2E_CLERK_FIXTURE=1 npm run e2e
```

Synthetic identities to create in the Clerk test instance — no real personal
data: `EXPERT_A`, `CLIENT_A` in `CABINET_A`; `EXPERT_B` in `CABINET_B`. Each
Clerk organization must then be linked by an operator to its internal tenant,
and the internal membership created in PostgreSQL: Clerk never becomes the
tenant authority by itself (PF-04A).

`BLOB_READ_WRITE_TOKEN` is never committed; it exists only as a provider
environment variable. `.env*` files other than `.env.example` are gitignored.

---

## 7. Status vocabulary

| Level | Meaning | Where PF-05/06 stands |
|---|---|---|
| IMPLEMENTED | Code exists | PF-05, PF-06, PF-06B |
| VERIFIED_LOCALLY | Proven against an ephemeral PostgreSQL cluster and in-memory storage | PF-05, PF-06, PF-06B |
| VERIFIED_STAGING | Proven against real managed provider resources | **not reached** |
| PRODUCTION_VERIFICATION_PENDING | Real provider evidence still owed | PF-05, PF-06, PF-06B |

**Ready for PF-05-06-PUBLISH: NO** — the three provider approvals in §3 must
land first.
