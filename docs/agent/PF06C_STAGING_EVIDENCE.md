# PF-06C — Staging infrastructure and real provider evidence

Branch: `claude/private-document-storage-evidence-c569fd`
HEAD before PF-06C: `5096994c41449469eb6cc7441505932ea6c93bbd`
Local commits not yet pushed: `d9c3827` (PF-05), `b3c1690` (PF-06),
`5096994` (PF-06B).

**PF-06C** inventoried the real provider surface, linked the repository to the
correct Vercel project, fixed the Playwright harness, and stopped at the cost
gate before creating any cloud resource.

**PF-06C2** (HEAD `029cc2bc90a6630bffb14aa15bb417bc3277a8fa`) ran after the
owner provisioned the resources manually. Sections 1 to 3 below record the
PF-06C inventory as it stood then and are kept for history; **sections 5 to 8
are the current state**. Nothing in either run was simulated.

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

Updated by **PF-06C2** against the resources the owner provisioned. Statuses
reflect what was actually observed on the real staging environment.

| Gate | Status | Evidence |
|---|---|---|
| Managed Postgres | **PASS** | Neon `PostgreSQL 18.6`, database `neondb`, endpoint `ep-wild-moon-b2av1y2v` in `eu-central-1`. Connected and queried from the repository code |
| Migrations 0000-0009 | **PASS** | `npm run db:migrate` → `{"status":"migrated","migration":"0009_pf06_server_report_snapshot"}`. Catalog after: 37 tables, 64 policies, 102 foreign keys (63 composite tenant FKs), 13 triggers |
| Runtime NOBYPASSRLS | **PASS** | `npm run db:verify` → `{"status":"verified","migration":"0009_pf06_server_report_snapshot"}`. Dedicated login `patrimoine_runtime`: `rolsuper=false`, `rolbypassrls=false`, `rolinherit=false`, no direct table privileges, member of `patrimoine_app` only (not of the fixture or webhook service roles). FORCE RLS on 31/31 declared tables |
| Clerk real session | **PASS** | Live Clerk **development** instance. `app_security.resolve_clerk_context` resolves EXPERT_A, CLIENT_A and EXPERT_B; EXPERT_A presented against CABINET_B → DENY; unknown Clerk identity → DENY |
| Organization mapping | **PASS** | CABINET_A `org_3IB8wUXZ…` → tenant `11111111…`; CABINET_B `org_3IB8yTlv…` → tenant `b0000000…`. Resolved roles: EXPERT_A=expert, CLIENT_A=client, EXPERT_B=expert |
| Revocation | **PASS** | With the internal context still held: revoking the DB membership makes the Clerk resolver return nothing, and dossier read, document metadata read and document version listing all fail with `TENANT_MEMBERSHIP_REQUIRED`. Membership restored afterwards |
| Private Blob | **BLOCKED** | Store `patrimoine-fiscal-demo-blob` (`store_9tKIbjqgRHu7ZqE4`, `cdg1`, dedicated to this project) exists and is attached, but `BLOB_READ_WRITE_TOKEN` holds an **empty value** in both Preview and Production. Local OIDC is refused: *"OIDC is enabled for this project, but not for the development environment"*. A store token cannot be minted non-interactively |
| Document upload | **BLOCKED** | Same cause. The upload path reached the storage boundary and failed at `BLOB_READ_WRITE_TOKEN_REQUIRED`, which is the adapter refusing to proceed without a token — not a defect |
| Document download | **BLOCKED** | Same cause |
| Server PDF generation | **BLOCKED** | Same cause: generation stores the rendered PDF as a private object before the version row is written |
| Professional validation | **BLOCKED** | Depends on an existing report version |
| Private PDF download | **BLOCKED** | Depends on an existing report version |
| Cross tenant denial | **PASS** (data layer) / **NOT_RUN** (report objects) | On real Neon: EXPERT_B is filtered by RLS from dossier A, document A metadata and document A versions, and sees only `DOS-B-STAGING`; CLIENT_A reads the explicitly granted dossier but `TENANT_AUTHORIZATION_DENIED` on write. Report-level cross-tenant checks could not run because no report version could be created |
| Audit trail | **PASS** (partial scope) | Audit rows are written and tenant-scoped on real staging: `case.created=1`, `simulation.run=1`, `authorization.denied=3`, and EXPERT_A sees 5 rows all belonging to tenant A. The `document.*` and `report.*` audit actions were NOT_RUN because their operations are blocked |
| Authenticated Playwright | **NOT_RUN** | The harness itself works (`npm run e2e` → 12 passed, 4 skipped). The authenticated journeys stay gated on `E2E_CLERK_FIXTURE=1`: they need interactive Clerk sign-in credentials for EXPERT_A / CLIENT_A / EXPERT_B, which are human account passwords this session must not request or handle, plus the blocked Blob path |

No status above is a PASS that was not actually observed.

---

## 6. What PF-06C2 completed

The owner provisioned the resources; this run wired and verified them.

1. **Vercel link** confirmed on `patrimoine-fiscal-demo`.
2. **Environment audit** (names only, values never read or printed):
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `BLOB_STORE_ID`
   PRESENT with real values; `BLOB_READ_WRITE_TOKEN` and
   `CLERK_WEBHOOK_SIGNING_SECRET` PRESENT but **empty**; `DATABASE_URL`,
   `DATABASE_ADMIN_URL`, `DOCUMENT_DOWNLOAD_SIGNING_SECRET` and
   `PERSISTENCE_MODE` MISSING entirely.
3. **Database contract completed.** Neon exposes `POSTGRES_*` names, which the
   application contract does not use. `DATABASE_ADMIN_URL` was mapped to the
   unpooled Neon owner connection, and a **dedicated runtime login
   `patrimoine_runtime`** was created (`NOSUPERUSER NOCREATEDB NOCREATEROLE
   NOINHERIT NOBYPASSRLS`, granted `patrimoine_app` only) because
   `neondb_owner` has `rolbypassrls=true` and owns every table — PF-03C refuses
   it as a runtime identity, correctly.
4. **`DOCUMENT_DOWNLOAD_SIGNING_SECRET` generated** cryptographically (48
   random bytes) and written only to the gitignored staging env file. It was
   not pushed to Vercel in this run because the deployment cannot be exercised
   until the Blob token exists; adding it is part of the same follow-up.
5. **Migrations applied and verified** on the staging database.
6. **Synthetic fixtures** seeded idempotently: Claire & Marc in CABINET_A (same
   ids on a second run), plus a distinct minimal `DOS-B-STAGING` dossier in
   CABINET_B for isolation testing.
7. **Clerk to database mapping** performed as the PF-04A operator step: both
   Clerk organizations linked to their internal tenants, three provider
   identities created, three authoritative PostgreSQL memberships, provider
   membership observations, and a `case_access_grants` row so CLIENT_A can see
   exactly one dossier.
8. **A real SimulationRun persisted** through the application repository under
   RLS on the runtime login (`fcaba4da-df81-4bb5-9d53-6e12ba94091d`).
9. **16 staging gates executed, 16 PASS, 0 FAIL** (`Organization mapping`,
   `Clerk real session`, `Cross tenant denial`, `Audit trail`, `Revocation`).

### Findings worth acting on

- **`BLOB_READ_WRITE_TOKEN` is empty** in Preview and Production. This is the
  single blocker for six gates.
- **`CLERK_WEBHOOK_SIGNING_SECRET` is empty** too. It does not block the
  PF-05/PF-06 gates — PF-04A deliberately makes the webhook non-authoritative
  and the operator mapping above replaces it — but the signed webhook route
  cannot verify a delivery until it is set. The webhook target URL could not be
  read back: Clerk's Backend API does not expose endpoint listing on
  `/webhooks/svix*` (405/404), so it stays UNVERIFIED.
- **RBAC is already enforcing on staging.** Attempting `simulation.run` as an
  expert produced `TENANT_AUTHORIZATION_DENIED` and three audited
  `authorization.denied` rows. `simulation.run` is a conseiller/admin
  capability; the run was therefore persisted as the cabinet adviser. Likewise
  `document.upload` belongs to conseiller and client, not to expert, so an
  EXPERT_A upload is refused by design.
- **Clerk test identities are real personal email accounts.** For a staging
  instance that is acceptable, but synthetic addresses would be preferable
  before any wider use. Only opaque Clerk user ids are recorded in this
  repository.

---

## 7. Remaining work for PF-05-06-PUBLISH

One owner action unblocks everything else:

> Vercel Dashboard → Storage → `patrimoine-fiscal-demo-blob` → Projects →
> disconnect and reconnect `patrimoine-fiscal-demo`, so Vercel injects a real
> `BLOB_READ_WRITE_TOKEN` in place of the empty placeholder.
> While there, set a real `CLERK_WEBHOOK_SIGNING_SECRET` from the Clerk webhook
> endpoint's signing secret.

Then the six blocked gates can be replayed. The staging environment file
`.env.staging.local` (gitignored) already carries `DATABASE_URL`,
`DATABASE_ADMIN_URL`, `PERSISTENCE_MODE=DATABASE` and the generated
`DOCUMENT_DOWNLOAD_SIGNING_SECRET`; only the Blob token has to arrive:

```bash
vercel env pull --environment=preview .env.staging.local
```

The round-trip itself is: upload a small synthetic PDF as the cabinet adviser,
record the scan outcome and download it as EXPERT_A, generate a DRAFT report
from the persisted SimulationRun, sign the professional review, confirm the
draft turns OUTDATED, regenerate, validate as EXPERT_A, download the VALIDATED
PDF and assert the `document.*` and `report.*` audit actions — with EXPERT_B
denied on every A resource. The temporary scripts used in PF-06C2 were removed
from the worktree once their results were recorded.

The authenticated Playwright journeys additionally need Clerk test-user sign-in
credentials handled by the owner, not by this session.

---

## 8. Status vocabulary

| Level | Meaning | Where PF-05/06 stands after PF-06C2 |
|---|---|---|
| IMPLEMENTED | Code exists | PF-05, PF-06, PF-06B |
| VERIFIED_LOCALLY | Proven against an ephemeral cluster and in-memory storage | PF-05, PF-06, PF-06B |
| VERIFIED_STAGING | Proven against real managed provider resources | **partial** — database, Clerk mapping, tenant isolation and revocation are proven on real staging; private object storage and the report round-trip are not |
| PRODUCTION_VERIFICATION_PENDING | Real provider evidence still owed | private Blob, document upload/download, server PDF generation, professional validation, private PDF download, authenticated E2E |

**Ready for PF-05-06-PUBLISH: NO** — six gates remain blocked on the empty
`BLOB_READ_WRITE_TOKEN`.

---

## 9. PF-06C3 — re-verification of the two blocking secrets

Run after PF-06C2 (`7d0e4e6adcfb8c2612db62abdb0ce9d744964381`) to check whether
the dashboard reconnect had landed. Only the two blockers were re-checked;
nothing already proven was re-run or reconfigured.

| Secret | Preview | Production | Verdict |
|---|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | EMPTY | EMPTY | still blocking |
| `CLERK_WEBHOOK_SIGNING_SECRET` | EMPTY | EMPTY | still blocking |

Values were never read or printed; only the decoded length was measured, and
both are zero-length.

Corroborating evidence that the reconnect has not happened: `vercel env ls`
still reports the `BLOB_READ_WRITE_TOKEN` entry as created **2 h ago**, the
same entry observed during PF-06C2 — a dashboard reconnect would have replaced
it with a fresh entry carrying a real value.

A second route was retried and is still closed: authenticating to the store
with the local OIDC token fails with *"Vercel Blob: OIDC is enabled for this
project, but not for the 'development' environment."* There is therefore no way
to reach `patrimoine-fiscal-demo-blob` from this session.

Consequently the following gates keep their PF-06C2 status, unchanged and not
upgraded: private Blob, document upload, document download, server PDF
generation, professional validation, private PDF download, report-level
cross-tenant denial (NOT_RUN), and the authenticated Playwright journeys
(BLOCKED — they additionally need Clerk sign-in credentials that this session
must not request or handle).

The Clerk webhook signature path could not be exercised either: verifying a
signed delivery requires the signing secret, which is empty.

### Build-cache finding (fixed, no code change)

During this run `npm run build` failed once with `Type error: ';' expected` in
`.next/dev/types/routes.d.ts`. That file is a **generated, gitignored** dev
artifact left behind by the Playwright dev server, and the committed
`next-env.d.ts` references the dev path, so a build run straight after an E2E
run type-checks a stale artifact. Removing `.next` and rebuilding succeeds
(exit 0). No repository file was at fault and none was changed; the sequence to
avoid is `npm run e2e` immediately followed by `npm run build` without clearing
the cache.

### Everything proven earlier is preserved

Real Neon PostgreSQL, migrations `0000` to `0009`, FORCE RLS and the
`NOBYPASSRLS` runtime login, the Clerk organizations, the Clerk-to-database
memberships, cross-tenant data isolation, revoked-membership denial and the
public E2E harness all remain PASS from PF-06C2 and were not re-run.
