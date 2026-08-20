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
output depended on live UI state. Those files are untouched by PF-06: they
remain the fixture demo surface. The authoritative pipeline is now the server
one described below; wiring the UI onto it is product work, not this task.

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

## 9. Open items

**PRODUCTION_VERIFICATION_PENDING**, inherited from PF-05 and unchanged: no
Vercel Blob store or token was available, so no report PDF was written to or
read from a real provider container. The in-memory adapter stood in.

Deliberately not implemented, and documented as such:

- **Dérogation** to the readiness gate (AUDIT_DESIGN: "une dérogation nécessite
  un motif, un rôle autorisé et une trace d'audit"). The gate is strictly
  blocking today; the override workflow is a separate decision;
- **`deliveredAt`** exists as a column but no delivery workflow sets it;
- **two-layer rendering** (client synthesis vs adviser annex as separate
  documents) — the current PDF carries both layers in one document with
  separate sections;
- **cabinet branding** (logo, footer) and electronic signature (S7 P1/P2);
- **UI wiring** — no screen consumes the four new routes yet, exactly as with
  PF-05. The fixture `/report` page still renders the old browser view.

Before live use, PF-06-PUBLISH should evidence a real private blob round-trip
for a report PDF, migration `0009` applied to the managed database, and a
generation → validation → download cycle performed by a real Clerk expert
session.
