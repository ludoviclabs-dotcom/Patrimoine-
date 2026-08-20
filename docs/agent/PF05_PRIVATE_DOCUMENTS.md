# PF-05 — Private versioned document storage and evidence access

Branch: `claude/private-document-storage-evidence-c569fd`
HEAD before PF-05: `ccb5359dd296b9c189321844693d2c8aeec090e1`
Migration: `drizzle/0008_pf05_private_document_storage.sql`

PF-05 connects real private documents to the PF-03 PostgreSQL metadata model
and the PF-04 authentication/RBAC chain. It adds no fiscal rule, rate,
threshold, effective date or calculation step, and changes no golden expected
result.

---

## 1. Model — no parallel document model

The existing objects stay authoritative and are reused as-is:

| Concept | Table | Change in PF-05 |
|---|---|---|
| Tenant | `tenants` | none |
| Dossier | `client_cases` | none |
| Document | `documents` | 3 storage columns added |
| Version | `document_versions` | **new** |
| Audit | `audit_logs` | 6 audit actions added |
| Client grant | `case_access_grants` (PF-04B) | reused for RLS |

`documents` keeps its business identity (`kind`, `label`, `status`,
`required`, client/dossier ownership). PF-05 only adds the storage lifecycle:

- `storage_status` — `pending | available | quarantined | deleted`;
- `current_version_number` — pointer to the newest published version;
- `deleted_at` — soft delete.

A check constraint (`documents_storage_pointer_check`) forbids a document
claiming `storage_status = 'available'` without a `blob_path` and a version
number, so a metadata-only fixture row can never be mistaken for a stored
document.

`document_versions` is the append-only record of the bytes actually stored:
`blob_key`, `original_file_name`, `mime_type`, `byte_size`, `sha256`,
`status`, `scan_status`, `uploaded_by_identity_id`, `created_at`.

**No `DocumentAccessLog` table was created.** The target architecture proposes
one, but this repository already has an append-only `audit_logs` table with
actor identity, tenant, action, entity, correlation and sanitized metadata.
Duplicating it would have created exactly the second parallel model the task
forbids. Read, download, upload, quarantine, deletion and evidence linkage all
land in `audit_logs`.

---

## 2. Storage — private by default, enforced three times

Provider: **Vercel Private Blob** (`@vercel/blob` 2.4.0, already a dependency;
ADR-006 of `ARCHITECTURE_CIBLE.md`).

`lib/documents/private-storage.ts` defines a `PrivateDocumentStorage` port with
two adapters: the Vercel one and a deterministic in-memory one used by the
tests. The domain never imports the provider SDK.

Private access is enforced at three independent levels:

1. the Vercel adapter hard-codes `access: "private"`, `addRandomSuffix: false`
   and `allowOverwrite: false` — there is no code path in this repository able
   to publish a patrimonial object;
2. `document_versions.visibility` is `NOT NULL` with a check constraint
   `visibility = 'private'`;
3. no object URL is ever persisted or returned. The download route streams the
   bytes through the server; the provider URL never reaches a browser.

### Object keys carry no personal data

```text
tenants/{tenantId}/dossiers/{caseId}/documents/{documentId}/versions/{versionId}
```

Every segment is an opaque UUID. `buildDocumentVersionBlobKey` refuses a
segment that is not a UUID, and the database enforces the same shape with a
check constraint that recomputes the expected key from the row's own
`tenant_id`, `case_id`, `document_id` and `id`. A file name, client name or
label therefore cannot reach the storage provider path even by mistake.

The legacy `buildTenantBlobPath` helper (fixture checklist) is unchanged but is
now explicitly documented as demo-only: it embeds a file name and must never be
used for a stored object.

---

## 3. Upload

`POST /api/v1/documents/{documentId}/versions` (multipart, field `file`).

```text
Clerk session
  → server-resolved tenant context (PF-04A)
  → RBAC document.upload (PF-04B capability matrix)
  → RLS + client dossier grant
  → server-side metadata validation
  → private object write
  → SHA-256
  → DocumentVersion
  → audit
```

### The browser MIME type is never trusted

`lib/documents/upload-validation.ts` detects the media type from the **magic
bytes of the payload**. The declared type is only compared to it: a mismatch is
refused (`DOCUMENT_MEDIA_TYPE_MISMATCH`), and the type stored in the database
is always the detected one.

Closed allowlist (formats whose leading bytes can be verified):
`application/pdf`, `image/jpeg`, `image/png`, `image/tiff`.

Deliberately **not** accepted: OOXML/ZIP containers (`docx`, `xlsx`) — their
magic bytes are indistinguishable from any ZIP — and signature-less text
formats such as CSV. Accepting them would mean trusting the declaration. The
roadmap's "import CSV" item (S6 P1) is a structured import path, not a blob
upload, and stays out of PF-05.

Other limits: 1 byte minimum, **25 MB** maximum, file name ≤ 180 characters
with directory separators, `.`/`..` and control characters refused outright
(never silently rewritten). The human-readable name is stored in the database
column only.

### Three phases, so a partial failure is never silent

1. **transaction** — authorize, load the document, allocate version n+1,
   insert the version row as `pending`;
2. **no transaction** — write the private object; on failure the row is marked
   `failed` and the error is propagated;
3. **transaction** — publish the version as `available`, move the document
   pointer, append `document.version.created`.

A version row that never reached phase 3 is not downloadable, and a stored
object with no published row is unreachable.

---

## 4. Download

No permanent and no public URL exists.

- `GET /api/v1/documents/{documentId}/download` — authenticates, checks
  membership, RBAC, dossier grant, document and version state, audits
  `document.download.authorized` and returns a **60-second server-signed
  grant** plus the version number and SHA-256.
- `GET /api/v1/documents/{documentId}/download/stream?token=…` — verifies the
  grant, **repeats the full database check**, audits `document.downloaded` and
  streams the bytes with `Content-Disposition: attachment`, `Cache-Control:
  no-store, private` and `X-Content-Type-Options: nosniff`.

The grant (`lib/documents/access-grant.ts`) is an HMAC-SHA256 over tenant,
document, version, identity and expiry, compared with `timingSafeEqual`. It is
**never sufficient on its own**: the streaming route re-runs
`withAuthorizedTenantTransaction`, so a revoked membership, a withdrawn client
grant, a quarantined version or a deleted document blocks an otherwise valid
grant. Rotating `DOCUMENT_DOWNLOAD_SIGNING_SECRET` invalidates every
outstanding grant.

Errors are mapped to stable machine-readable codes with no message, tenant
identifier, file name or provider detail (`lib/documents/runtime.ts`).

---

## 5. Versioning

Replacing a justificatif never destroys the previous one. The upload path only
ever inserts version n+1, and the database enforces immutability with the
`document_versions_immutability` trigger:

- `DELETE` is always refused (`document version rows are append-only`);
- `UPDATE` of `blob_key`, `sha256`, `byte_size`, `mime_type`,
  `original_file_name`, `version_number`, ownership columns, provider,
  visibility or `created_at` is refused (`document version content is
  immutable`);
- only the lifecycle columns `status` and `scan_status` may advance, and never
  back to `pending`.

Both versions stay independently downloadable
(`GET …/download?version=1`).

---

## 6. Security

### Quarantine / validation workflow

No antivirus product is configured — the roadmap's "Choix antivirus" (S6
dependency) is still open. Rather than claim a scan that does not happen, PF-05
implements the roadmap's alternative, an explicit validation workflow:

- a freshly uploaded version is `scan_status = 'pending'` and **is not
  downloadable** (`DOCUMENT_VERSION_AWAITING_VALIDATION`);
- `recordScanOutcome` requires the new `document.validate` capability
  (admin/conseiller/expert) and records `clean` or `infected`;
- `infected` quarantines the version and the document, and audits
  `document.quarantined`.

When an antivirus is chosen, it becomes the producer of that outcome; nothing
else changes. This is a deliberate fail-closed default, not an oversight.

### Tested attack paths

| Scenario | Result |
|---|---|
| Cross-tenant read/list/upload/download | refused; listings return empty rather than disclosing existence |
| Direct SQL on `document_versions` from cabinet B | 0 rows (FORCE RLS) |
| Forged grant carrying another cabinet's identifiers, correctly signed | `DOCUMENT_NOT_FOUND` — the row is invisible under RLS |
| Guessed or foreign object key | `DOCUMENT_BLOB_KEY_INVALID` / `_TENANT_MISMATCH` |
| Expired grant | `DOCUMENT_DOWNLOAD_GRANT_EXPIRED` |
| Tampered grant | `DOCUMENT_DOWNLOAD_GRANT_INVALID_SIGNATURE` |
| Grant replayed by another identity | `DOCUMENT_DOWNLOAD_GRANT_SUBJECT_MISMATCH` |
| Quarantined version | `DOCUMENT_QUARANTINED` |
| Soft-deleted document (grant issued before deletion) | `DOCUMENT_DELETED`, versions and hashes preserved |
| Revoked member | `TENANT_MEMBERSHIP_REQUIRED` on the next request |
| Client on an ungranted dossier | refused |
| Client declaring their own upload clean (direct SQL) | `client role may not record a document scan outcome` |

### Client uploads

PF-04B allowed a client to insert a document row on a granted dossier but not
to complete a storage lifecycle. PF-05 adds two narrow policies
(`documents_client_storage_update`, `document_versions_client_publish`, the
latter restricted to rows the client uploaded) plus the
`enforce_client_document_scope` trigger, which refuses any client change to
`kind`, `label`, `required`, ownership, `deleted_at` or `scan_status`. Row-level
security cannot restrict columns; the trigger does.

---

## 7. Evidence

`simulation_document_versions` links a simulation trace to **one precise
document version**, mirroring the existing `simulation_rule_versions` shape.
`listSimulationEvidence` returns `{documentId, versionId, versionNumber,
sha256, byteSize, mimeType, purpose, capturedAt}`.

A report referencing a run can therefore cite an exact version and its hash
rather than a mutable document pointer — the reference stays valid even after
version n+1 replaces it, because version n is immutable.

Linking requires the `report.generate` capability and both sides must belong to
the acting tenant (composite tenant foreign keys plus RLS).

---

## 8. Configuration

```text
BLOB_READ_WRITE_TOKEN                # private container write access
DOCUMENT_DOWNLOAD_SIGNING_SECRET     # server-only, >= 32 characters
```

Both are server-side only and absent from any client bundle. No value is read
from a request body.

---

## 9. Validation executed

| Command | Result |
|---|---|
| `npm test` | PASS — 30 files, 363 tests |
| `npm run test:postgres` | PASS — 2 files, 24 tests, fresh native PostgreSQL 18.4, migrations `0000` → `0008` |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `git diff --check` | PASS |

`scripts/run-postgres-tests.mjs` now runs the whole `tests/postgres` directory
sequentially; the PF-05 suite provisions its own database inside the ephemeral
cluster so each suite still starts from a fresh migration chain.

`npm run e2e` — **NOT RUN.** The Playwright harness starts a server and needs a
Clerk test instance and session fixture, neither of which exists in this
environment (unchanged since PF-04B). The upload/download chain is covered
natively against real PostgreSQL RLS instead.

---

## 10. Open items

**PRODUCTION_VERIFICATION_PENDING.** No Vercel Blob store, token or managed
staging database was available. Nothing was uploaded to, downloaded from or
deleted from a real provider container. Before live-user admission, PF-05-PUBLISH
must evidence:

- a provisioned **private** blob store and a runtime token with write access
  only to it;
- an end-to-end upload/download against that store, proving the object is not
  reachable without an authenticated session;
- `DOCUMENT_DOWNLOAD_SIGNING_SECRET` provisioned and its rotation procedure;
- migration `0008` applied to the managed database with `npm run db:migrate`,
  followed by `npm run db:verify` and the health endpoint returning `ok`.

Known limitations, deliberately left open:

- no antivirus product — see the validation workflow above;
- OOXML and CSV uploads are refused pending a container-aware validator;
- retention, grace period, legal hold and asynchronous purge (S6 P1 / §11.4 of
  the target architecture) are not implemented: deletion is a soft delete and
  no object is ever removed from the container;
- structured extraction, OCR and the advanced client upload portal (S6 P2) are
  out of scope;
- no UI surface consumes the new routes yet; the deterministic chain and its
  safeguards are ready for the S6 product work.

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
