# PF-06 — Server report and immutable snapshot

Branch: `claude/private-document-storage-evidence-c569fd`
HEAD before PF-06: `d9c3827f5f2bd2c6bfb0153d968517bdefdb5234`
Migration: `drizzle/0009_pf06_server_report_snapshot.sql`

PF-06 replaces the browser-only report with a reproducible, traceable,
storable server-side report. It adds no fiscal rule, rate, threshold,
effective date or calculation step, and changes no golden expected result.

---

## 1. Starting point

The existing report was entirely browser-side:

- `app/report/page.tsx` composes fixture data (`demoHousehold`) into an HTML
  page and relies on hardened print CSS;
- `components/pdf/document-pdf.tsx` is a small `@react-pdf/renderer` template
  explicitly documented as *client-only — jamais rendu côté serveur*;
- `components/v3-4/pdf-download-button.tsx` imports the renderer dynamically
  in the browser on click.

Nothing was persisted, nothing was hashed, nothing was versioned, and the
output depended on live UI state. PF-06 left those files untouched and built
the authoritative server pipeline described below. **PF-06B (section 10
onwards) then wired the user-facing flow onto it** and demoted the browser
rendering to an explicitly non-final preview.

---

## 2. Snapshot first

`lib/report/snapshot.ts` defines the immutable snapshot. The PDF is rendered
from it and from nothing else — never from a request, a database handle or a
live UI value.

```text
ReportSnapshot
├── schemaVersion            "pf06-report-snapshot-1"
├── business                 deterministic facts, no generation timestamp
│   ├── dossier              tenantId, caseId, reference, title, status, fiscalYear
│   ├── legalFreezeDate      explicit operator input, never inferred
│   ├── simulationRunIds / runs (engine, version, scenario, status, input, output)
│   ├── ruleVersions         id, ruleSet, version, status, effect dates, source, checksum
│   ├── calculationSteps     order, label, input, formula, output, rule, evidence, confidence
│   ├── comparisons          one row per run, derived from its final step
│   ├── reviewFlags          derived from stored facts only
│   ├── professionalValidation  required / decision / reviewer / reviewedAt
│   ├── evidenceSources      official sources behind each step and rule
│   ├── documentReferences   PF-05 document version id, number and SHA-256
│   ├── coverageLimitIds
│   └── limitations
├── validation               status, decision, validator, timestamp, comment
└── generation               reportId, versionId, versionNumber, generatedAt,
                             generatedBy, generatorVersion, watermark
```

### Two hashes, on purpose

- `businessSha256` — hash of `business` alone. It contains no generation
  timestamp, every collection is sorted on a stable key, and serialisation
  goes through `canonicalJson` (sorted keys, no insignificant whitespace).
  The same database facts therefore always produce the same hash, whatever
  order PostgreSQL returned the rows in.
- `snapshotSha256` — hash of the whole snapshot, including validation and
  generation.

This is what makes the model coherent: validating a draft produces a new
version whose **business hash is identical** and whose **snapshot hash
differs**. The professional validation state is genuinely part of the
snapshot, so a validated report is a different document, not an edited one.

### Legal freeze date

`legalFreezeDate` is a required, explicit input to generation. It is never
derived from the clock, the fiscal year or the simulation dates — inventing it
would amount to asserting which law applies. A request without it is refused
with `REPORT_LEGAL_FREEZE_DATE_REQUIRED`.

### Review flags and the readiness gate

`buildReviewFlags` derives flags from stored values only; nothing is inferred.
Blocking flags are what the gate refuses to validate over:

| Code | Severity | Source fact |
|---|---|---|
| `simulation.none` | blocking | no run attached |
| `simulation.not_completed` | blocking | `simulation_runs.status` |
| `calculation.step_not_validated` | blocking | `calculation_steps.confidence_status` |
| `rule.version_unresolved` | blocking | step references a rule the tenant cannot see |
| `rule.version_not_active` | blocking | `rule_versions.status` |
| `rule.version_without_source` | blocking | empty `evidence_source_ids` |
| `review.professional_not_signed` | blocking | latest `professional_reviews.decision` |
| `simulation.professional_validation_required` | review | `professional_validation_required` |
| `coverage.limit` | review | declared coverage limit ids |

---

## 3. PDF

`@react-pdf/renderer` server-side via `renderToBuffer` (`lib/report/render.tsx`).
Puppeteer was not considered: no technical blocker appeared, and ADR-007 of the
target architecture selects `@react-pdf/renderer` precisely for determinism.

**Reproducible binaries.** The document's `creationDate` and `modificationDate`
are pinned to the snapshot's own `generatedAt`, and `creator`/`producer` to the
generator version. Rendering the same snapshot twice therefore yields a
byte-identical file and the same `pdfSha256` — verified by a unit test, and the
property the target architecture asks for ("même snapshot/version renderer →
hash stable dans l'environnement contrôlé").

---

## 4. Content

Three pages, matching the required outline and AUDIT_DESIGN § 4.5:

1. cover with dossier identity, version and status banner; identification and
   legal freeze; hypotheses and input data; results; scenario comparison;
2. vigilance and review flags (with an explicit blocking count); calculation
   explanations, step by step, each carrying its rule version;
3. rule versions and official sources; evidence index of document versions with
   their SHA-256; coverage limits and limitations; the professional validation
   block; integrity fingerprints.

A single-scenario report states plainly that no comparison is produced rather
than inventing one, and an empty table renders "Aucun élément."

---

## 5. Watermark

`resolveWatermark` (ARCHITECTURE_CIBLE § 9.4):

| Status | Watermark | Banner |
|---|---|---|
| `draft` | « BROUILLON — NON VALIDÉ » | non-remittable warning |
| `changes_requested` | « À REVOIR » | non-remittable warning |
| `validated` | none | explicit "validé par un professionnel habilité le …" |

A validated report therefore cannot be confused with a draft: it carries no
watermark, and it carries a banner a draft never has. Every page footer repeats
the reference, the version number, the status, the generation timestamp and the
generator version; the last page prints the report, version and snapshot
identifiers.

---

## 6. Validation

Only `report.validate` holders may validate — admin and expert. `conseiller`,
`auditeur` and `client` are refused by the central capability matrix, the
denial is audited as `authorization.denied` and the transaction fails closed.

A validation **never mutates the reviewed version**. It appends version n+1
carrying the same `business` payload plus the actor identity, the timestamp,
the decision and a mandatory comment, re-renders the PDF from the new snapshot
and stores it as a separate private object. Version n keeps its own row, its
own PDF and its own hashes for ever.

Guards:

- `approved` requires zero blocking flags, otherwise `REPORT_READINESS_BLOCKED`;
  `changes_requested` and `rejected` are allowed while blocked, which is the
  point of asking for changes;
- only the report's current version may be validated (`REPORT_VERSION_SUPERSEDED`);
- an already validated version cannot be re-validated (`REPORT_ALREADY_VALIDATED`);
- an empty comment is refused.

Because the gate reads the *stored* snapshot, signing the professional review
after a draft was generated requires generating a fresh draft before approving.
That is deliberate: the delivered document must state the signed reality, not a
state that was true only at validation time.

Database-side, the `report_versions_immutability` trigger refuses every DELETE
and every UPDATE of a server-generated row, and
`report_versions_server_generated_check` refuses a row that lacks its snapshot,
hashes, object key, validation block, generator version or legal freeze date.
Legacy fixture rows keep `report_id` NULL, stay mutable and are never
downloadable.

---

## 7. Private storage

The PDF is stored through the PF-05 `PrivateDocumentStorage` port — the same
Vercel Private Blob adapter, the same `access: "private"`, the same absence of
any persisted object URL. Keys follow ARCHITECTURE_CIBLE § 11.3 and the same
identifier-only discipline, enforced by a database check constraint that
recomputes the expected key from the row itself:

```text
tenants/{tenantId}/reports/{reportId}/versions/{reportVersionId}
```

Download reuses the PF-05 short-lived signed grant, generalised in this task to
carry a `resource` discriminator (`document` | `report_version`) so both
families share exactly one mechanism rather than growing a parallel one:

- `GET /api/v1/reports/versions/{id}/download` — RBAC, tenant, ownership, audit
  `report.download.authorized`, returns a 60-second grant plus `pdfSha256` and
  `snapshotSha256`;
- `GET …/download/stream?token=…` — re-verifies the grant, **repeats the full
  database check**, audits `report.downloaded` and streams with
  `Content-Disposition: attachment`, `Cache-Control: no-store, private` and
  `X-Content-Type-Options: nosniff`.

A grant is never sufficient on its own: a revoked membership, a foreign tenant
or a missing version blocks an otherwise valid token.

---

## 8. Tests

Unit — `tests/unit/pf06-server-report.test.ts` (16 tests): canonical
serialisation, business hash stability across row order and across generation
timestamps, business hash preserved through validation, complete snapshot
coverage of every element the task lists, each blocking-flag rule, coverage
limits as non-blocking, the watermark policy, reproducible server rendering
(same snapshot → same `pdfSha256`; validated version → different binary),
identifier-only report keys, and the validation capability matrix.

PostgreSQL — `tests/postgres/pf06-server-report.test.ts` (8 tests) on a fresh
native cluster with migrations `0000` → `0009`:

| Requirement | Covered by |
|---|---|
| deterministic snapshot | version 2 reproduces version 1's `businessSha256` |
| same snapshot → stable business content | validated version keeps the draft's `businessSha256` |
| cross tenant denial | list, snapshot, download, generation and direct SQL all refused |
| draft watermark | stored `watermark` and snapshot both « BROUILLON — NON VALIDÉ » |
| validated state | version 4 validated, no watermark, validator and comment recorded |
| missing professional review | `REPORT_READINESS_BLOCKED` while the review is unsigned |
| versioning | validation appends n+1; UPDATE and DELETE on n are refused by the trigger |
| document links | PF-05 document version id, number and SHA-256 present in the snapshot |
| rule provenance | active rule version with `sourceReference` and evidence ids; every step resolves |

Plus: validation by a `conseiller` refused, a superseded version refused, an
already validated version refused, expired/tampered/foreign-subject grants
refused, and a forged cross-tenant grant resolving nothing under RLS.

| Command | Result |
|---|---|
| `npm test` | PASS — 31 files, 379 tests |
| `npm run test:postgres` | PASS — 3 files, 32 tests, migrations `0000` → `0009` |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |

`npm run e2e` — **NOT RUN**, unchanged since PF-04B: the Playwright harness
needs a Clerk test instance and session fixture that do not exist here. The
generation, validation and download chain is covered natively against real
PostgreSQL RLS instead.

Two pre-existing assertions were made drift-proof rather than re-pinned: the
PF-03C readiness test now checks that the SQL attestation count matches the
TypeScript table list (instead of a hardcoded number), and the PF-05 tests read
the marker from `managedPostgresMigrationMarker` (instead of hardcoding
`0008`). Both would otherwise need editing on every future migration.

---

# PF-06B — Cabinet report UI wired to the server pipeline

HEAD before PF-06B: `b3c1690f7eb1fcfb001f0fe6b2ba03aab09077d1`

Branch ancestry checked before starting: `git merge-base HEAD origin/main` =
`ccb5359` (the merged PR #12 Clerk/RBAC commit). The branch is **two commits
ahead of `origin/main` and zero behind** — `d9c3827` (PF-05) and `b3c1690`
(PF-06) are the commits not yet in main. Nothing was rebased, reset or
rewritten.

## 10. The user-facing flow is now the server pipeline

`app/report/page.tsx` was **adapted, not duplicated**. It is now a dynamic
server component that resolves the Clerk tenant context, loads the console read
model and renders `ServerReportConsole` as the primary path:

```text
dossier → simulations sélectionnées → preuves → revue
       → snapshot serveur → PDF DRAFT → validation professionnelle
       → PDF VALIDATED → téléchargement privé audité
```

`lib/report/report-console.ts` is a read-only server model: it lists the
tenant's dossiers and simulation runs, the report versions, the freshness
verdict, the readiness gate and the explicit blockers. It performs no mutation
— every action stays behind the audited PF-06 routes, so authorization is
decided once, server-side.

The console shows report status, version number, generation timestamp,
`legalFreezeDate`, the simulations used, the rule versions, the review status,
the evidence count, DRAFT/VALIDATED badges, both integrity fingerprints and the
version history. Buttons: **Générer** / **Régénérer** (when a version exists),
**Valider** (rendered only for a role the server would accept) and
**Télécharger**.

## 11. Stale snapshot detection

`lib/report/freshness.ts` rebuilds the business payload from today's facts —
using the delivered version's own run selection, freeze date and limitations —
and compares it with the stored snapshot through the **same canonical hash**
PF-06 already relies on. Equal hash → `current`; different → `outdated` with
`REPORT_REGENERATION_REQUIRED` and the list of sections that moved, translated
into readable labels.

That single criterion covers all four required triggers, because each of them
changes the business payload: a new simulation selection (`runs`,
`simulationRunIds`), a new professional validation (`professionalValidation`,
`reviewFlags`), a changed evidence/document version (`documentReferences`), and
any business data inside the snapshot (`calculationSteps`, `ruleVersions`, …).
Facts that can no longer be read at all resolve to `outdated` carrying the
underlying code, never silently to `current`.

**No delivered PDF is ever rewritten.** A stale report keeps its bytes, its
snapshot and both hashes; the only remedy offered is regeneration, which
appends a new version. The PostgreSQL suite asserts the stored `pdf_sha256` and
`snapshot_sha256` are byte-for-byte unchanged after the underlying fact moved.

## 12. Validation UX

DRAFT displays the watermark text verbatim, states the document cannot be
handed to a client, and the console never labels it a final deliverable.
VALIDATED displays the decision, the version number, the generation timestamp
and both fingerprints, with the download button enabled.

A client never validates: `report.validate` is absent from the client, adviser
and auditor rows of the capability matrix, the button is not rendered for them,
and `validateVersion` refuses with `TENANT_AUTHORIZATION_DENIED` — audited —
even if the route is called directly. The approval button is additionally
disabled while the readiness gate is closed or the report is stale, mirroring
exactly what the server enforces.

## 13. Explicit error states

Each condition is surfaced with its own machine-readable code and its own
sentence; nothing is collapsed into a generic toast.

| Condition | Code |
|---|---|
| missing legal freeze date | `REPORT_LEGAL_FREEZE_DATE_REQUIRED` |
| no simulation selected | `REPORT_SIMULATION_RUN_REQUIRED` |
| unsigned professional review | `review.professional_not_signed` |
| blocking review item | the flag's own code |
| missing evidence | `REPORT_EVIDENCE_MISSING` (vigilance, not blocking) |
| generation failure | the route's error code, with its HTTP status |
| private Blob unavailable | `BLOB_READ_WRITE_TOKEN_REQUIRED` |
| download secret absent | `DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED` |
| stale report | `REPORT_REGENERATION_REQUIRED` |
| cross-tenant dossier | `REPORT_DOSSIER_NOT_ACCESSIBLE` |
| revoked membership / denied role | `TENANT_MEMBERSHIP_REQUIRED`, `TENANT_AUTHORIZATION_DENIED` |
| pipeline off / no session | `PERSISTENCE_MODE_FIXTURE`, `CLERK_SESSION_REQUIRED`, … |

Asking for a dossier outside the tenant resolves to **nothing** — there is no
fallback to another dossier, and the reason is displayed.

## 14. Browser PDF path

The old browser rendering is kept as an explicitly non-final working preview:
the section is titled « Aperçu de travail — NON FINAL », it states it is
neither versioned, timestamped, signed nor stored, and the print button now
reads « Imprimer l'aperçu (non final) ». `components/report-document.tsx` is
unchanged behind it.

`components/v3-4/pdf-download-button.tsx` was left alone on purpose: it serves
the DER, lettre de mission and adéquation documents, not the cabinet report, so
it is outside this task's scope.

## 15. PF-06B validation

| Command | Result |
|---|---|
| `npm test` | PASS — 32 files, 398 tests |
| `npm run test:postgres` | PASS — 4 files, 39 tests, migrations `0000` → `0009` |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — `/report` now server-rendered on demand |
| `git diff --check` | PASS |

`tests/unit/pf06b-report-ui-wiring.test.ts` (19 tests) covers staleness for
each of the four triggers, unreadable facts, the section labels, the whole
blocker surface, the unavailability catalogue, and the fact that the page wires
the server console while the preview stays non-final.

`tests/postgres/pf06b-report-console.test.ts` (7 tests) proves the workflow end
to end on a fresh cluster: empty gate → DRAFT generated with its watermark →
a signed review makes the report OUTDATED while the stored PDF and hashes stay
identical → regeneration returns to `current` and opens the gate → a client is
offered no validation and is refused server-side → the expert validates into
version 3 without a watermark → download authorized and streamed, with all four
report audit actions present → cabinet B sees none of it.

`npm run e2e` — at the time of PF-06B this was **NOT RUN**: the Playwright
harness did not start at all. **PF-06C found and fixed the root cause** (an
IPv4-only bind that broke Next 16's internal proxy hop, see
`docs/agent/PF06C_STAGING_EVIDENCE.md` § 4). The suite now runs: **12 passed,
4 skipped**. The 4 skipped are the authenticated journeys in
`tests/e2e/report-server-pipeline.spec.ts` (EXPERT generate → validate →
download, and CLIENT validate = DENY), still guarded by `E2E_CLERK_FIXTURE=1`:
**SKIPPED — REAL AUTH FIXTURE REQUIRED**.

---

## 16. Open items

### Real provider evidence — PRODUCTION_VERIFICATION_PENDING

The session was checked for real credentials before writing anything. Result:

| Requirement | Status |
|---|---|
| `DATABASE_URL` / managed PostgreSQL | **absent** — no value in the environment, no `.env` file |
| `DATABASE_ADMIN_URL` | **absent** |
| Clerk test instance (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) | **absent** |
| `BLOB_READ_WRITE_TOKEN` / private Blob store | **absent** — the Vercel account holds one store, `carbonco-workbooks`, attached to the unrelated `carbon` project; none exists for `patrimoine-fiscal-demo` |
| `DOCUMENT_DOWNLOAD_SIGNING_SECRET` | **absent** |
| Repository linked to a Vercel project | **no** — no `.vercel` directory |

The Vercel CLI *is* authenticated (`ludoviclabs-7443`), so a store could be
provisioned in one command — but that creates a billable cloud resource and
requires the owner's explicit go-ahead, and it would still not unblock steps 2
to 6, which need a managed database and a Clerk session. **No evidence was
simulated:** nothing was uploaded, generated, validated or downloaded against a
real provider, and no unrelated store was written to.

Still to evidence in PF-05-06-PUBLISH:

1. document private upload/download round-trip;
2. server PDF generation;
3. validation;
4. private PDF download;
5. audit entries;
6. cross-tenant denial.

### Deliberately not implemented

- **Dérogation** to the readiness gate (AUDIT_DESIGN: "une dérogation nécessite
  un motif, un rôle autorisé et une trace d'audit"). The gate is strictly
  blocking; the override workflow is a separate decision;
- **`deliveredAt`** exists as a column but no delivery workflow sets it;
- **two-layer rendering** (client synthesis vs adviser annex as separate
  documents) — the current PDF carries both layers in one document with
  separate sections;
- **cabinet branding** (logo, footer) and electronic signature (S7 P1/P2);
- **dossier navigation** — the console reads `?dossier=`, `?runs=` and `?gel=`
  and defaults to the tenant's first dossier; a dossier picker inside the
  screen is product work left for the dossier module.

---

## Verification level after PF-06C

| Level | Reached |
|---|---|
| IMPLEMENTED | yes |
| VERIFIED_LOCALLY | yes — ephemeral PostgreSQL cluster, in-memory private storage |
| VERIFIED_STAGING | **no** — no managed database, Clerk instance or Blob store exists |
| PRODUCTION_VERIFICATION_PENDING | yes — see `docs/agent/PF06C_STAGING_EVIDENCE.md` |

PF-06C inventoried the provider surface, linked the repository to the Vercel
project `patrimoine-fiscal-demo`, and stopped at the cost gate: creating a Blob
store, a managed PostgreSQL database or a Clerk instance all require owner
approval, and the marketplace step additionally requires an interactive
terminal. Nothing was created and no evidence was simulated.
