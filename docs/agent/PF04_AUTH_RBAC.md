# PF-04A — Clerk Organizations authentication foundation

Date: 2026-08-20

## Status

**IMPLEMENTED / VERIFIED_LOCALLY.** Clerk is the identity provider and its
Organizations UI supplies the active-organization selection. PostgreSQL is
still the final authority for internal identity, membership, role, tenant and
RLS. No Clerk identifier is used as a foreign key across business tables.

**PRODUCTION_VERIFICATION_PENDING.** No Clerk instance, Vercel environment or
managed staging database was supplied. An operator must configure the keys,
provision the dedicated webhook login, apply migration `0006`, register the
webhook and retain a signed delivery/retry test before enabling real users.

## Clerk and Next.js integration

The installed dependency is `@clerk/nextjs` 7.7.9. Its declared peer range
supports Next `^16.0.10`; the repository resolves Next 16.2.6. The integration
uses Clerk's Next.js App Router patterns:

- root `proxy.ts` uses `clerkMiddleware` and protects `/workspace`;
- `app/sign-in/[[...sign-in]]` and `app/sign-up/[[...sign-up]]` host Clerk UI;
- `app/workspace/page.tsx` repeats authorization server-side through
  `requireClerkTenantContext()`, so proxy/client state alone cannot authorize;
- the workspace `UserButton` exposes Clerk's signed-out control.

Official Clerk references used for this versioned integration:

- <https://clerk.com/docs/nextjs/getting-started/quickstart>
- <https://clerk.com/docs/guides/development/webhooks/overview>
- <https://clerk.com/docs/reference/nextjs/clerk-middleware>

## Authorization boundary

The complete request path is:

```text
signed Clerk session (userId + active orgId)
  → app_security.resolve_clerk_context
  → user_identities(provider='clerk', provider_subject)
  → memberships(active, not revoked, internal role)
  → auth_provider_organizations(internal tenant mapping)
  → auth_provider_memberships(active observation)
  → branded TenantContext
  → withTenantTransaction + PostgreSQL FORCE RLS
```

The browser-provided slug and organization ID are insufficient on their own.
The resolver receives the server-verified Clerk session only, returns exactly
one internal context or no row, and is the only bridge before an RLS tenant
transaction. The internal role is always read from `memberships`; a Clerk role
is observed for audit/revocation only and never selects an application role.

This fails closed for no session, no active organization, unknown Clerk user,
unlinked organization, missing/revoked internal membership, inactive provider
membership and an organization mapped to a different tenant.

## Organization and membership synchronization

Migration `0006_pf04a_clerk_organizations_auth_foundation.sql` adds:

- `auth_provider_organizations`: a Clerk organization observation with a
  nullable `tenant_id` internal mapping;
- `auth_provider_memberships`: the observed Clerk organization membership;
- `auth_webhook_events`: immutable provider/event-id/payload-hash receipts.

`POST /api/webhooks/clerk` calls Clerk `verifyWebhook`; an invalid signature is
rejected. Supported events are `user.created`, `user.updated`,
`organization.created`, `organization.updated` and the three
`organizationMembership` lifecycle events. The Svix delivery ID is the
idempotency key; duplicate delivery is a successful no-op. The audit receipt
contains a SHA-256 fingerprint rather than a raw payload.

The webhook never creates, activates, changes or revokes an internal
`memberships` row, and it never creates a tenant/cabinet. An internal operator
must explicitly link a known `auth_provider_organizations` row to a
pre-existing `tenants` row and manage the internal membership in a controlled
administrative workflow. This preserves the database as the tenant authority.
## PF-04B — authenticated tenant context and RBAC

**IMPLEMENTED / VERIFIED_LOCALLY.** Migration `0007` adds an explicit
per-dossier `case_access_grants` table and a security-definer RLS predicate.
An active tenant membership with role `client` alone grants no dossier access:
the client must also have an active, non-revoked grant for that dossier.

The legacy enum remains intentionally stable; labels in the matrix are:
`admin` = TENANT_ADMIN, `conseiller` = ADVISER, `expert` = EXPERT, `client` =
CLIENT and existing `auditeur` = AUDITOR. No client input can select one of
these roles: fixture routes use one fixed synthetic actor, and the legacy demo
identity entry point fails closed in DATABASE and production environments.

| Capability | TENANT_ADMIN | ADVISER | EXPERT | CLIENT | AUDITOR |
|---|---|---|---|---|---|
| `dossier.read` | yes | yes | yes | explicit grant + RLS | yes |
| `dossier.write` | yes | yes | no | no | no |
| `simulation.run` | yes | yes | no | no | no |
| `simulation.review` | yes | no | yes | no | no |
| `report.generate` | yes | yes | yes | no | no |
| `report.validate` | yes | no | yes | no | no |
| `document.upload` | yes | yes | no | yes | no |
| `document.download` | yes | yes | yes | explicit grant + RLS | yes |
| `member.invite` | yes | no | no | no | no |
| `rule.review` | yes | no | yes | no | no |
| `admin.manage` | yes | no | no | no | no |

`lib/auth/authorization.ts` is the single capability matrix. Repositories use
`withAuthorizedTenantTransaction`, which checks `can(actor, action, resource)`
before executing a sensitive operation. A capability denial is persisted as a
sanitized `authorization.denied` audit event in a separate tenant/RLS
transaction before the caller receives `TENANT_AUTHORIZATION_DENIED`.

The server chain is now:

```text
Clerk session → internal identity → active DB membership → TenantContext
→ central capability check → resource-specific RLS → repository transaction
```

The `case_access_grants` RLS function protects `client_cases`, `documents` and
private-document metadata. A client can upload only a document attached to an
explicitly granted dossier; it cannot update/delete it. Client report access is
denied in PF-04B because no report-read capability was requested. Existing generic RLS still denies all
cross-tenant dossier/document/report identifiers for every role, including an
administrator.

Server-only `createMembershipService` provides invite, role-change and revoke
operations; all require the central policy and record `member.invited`,
`member.role.changed` or `membership.changed`. Clerk webhooks remain an
observational audit path and cannot mutate business memberships. Every resolved
Clerk session records `session.mapped` without a token, email or secret.

### PF-04B local evidence

- `tests/unit/pf04b-rbac.test.ts` proves the matrix, role boundaries and
  cross-tenant policy denial.
- `npm run test:postgres` applies migrations through `0007` in fresh native
  PostgreSQL and proves a client sees only the granted dossier/document,
  cannot write/run expert actions, cannot read an ungranted same-tenant dossier
  or a cabinet-B URL/report, and is denied immediately after DB revocation
  despite a still-usable context object.
- `tests/postgres/pf03b-tenant-isolation.test.ts` continues to prove direct
  ID-based A/B dossier, document, simulation, audit and report isolation.

**PRODUCTION_VERIFICATION_PENDING:** real Clerk session, Vercel, managed
PostgreSQL and signed webhook evidence remain unavailable; no external user or
database has been modified.

## Credentials and least privilege

No actual secret is stored in Git. Configure only server-side/secret stores:

| Value or role | Purpose | Required constraint |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser SDK configuration | Public identifier only; configured in Vercel. |
| `CLERK_SECRET_KEY` | Clerk server middleware/session validation | Server-only Vercel secret. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Svix signature verification | Server-only Vercel secret, never logged. |
| `DATABASE_URL` | Normal application connection | Existing `NOBYPASSRLS` login, member only of `patrimoine_app`; never an admin/superuser. |
| `CLERK_WEBHOOK_DATABASE_URL` | Signed webhook persistence | Separate `NOBYPASSRLS`, non-superuser login, member only of `patrimoine_webhook_service`; no direct table grants. |
| `DATABASE_ADMIN_URL` | Migrations/operator mapping only | Separate deployment/admin secret; never available to normal route runtime. |
| `patrimoine_webhook_service` | Controlled webhook group role | `NOLOGIN`, `NOINHERIT`, `NOSUPERUSER`, `NOBYPASSRLS`; execute-only on the recording function. |

The route verifies the dedicated webhook login is neither superuser nor
`BYPASSRLS`, can assume the service role, and is not the group role itself.
The normal runtime role cannot execute the webhook function; the webhook role
cannot read application tables directly. `DATABASE_ADMIN_URL` is not imported
by any application route.

## Operator runbook before production

1. Apply all migrations with the PF-03C administrative process, including
   `0006`.
2. Create a distinct LOGIN role meeting the webhook row above and grant only
   `patrimoine_webhook_service`; store it only as
   `CLERK_WEBHOOK_DATABASE_URL` in Vercel server environment.
3. Set Clerk publishable/secret/signing values in the matching Vercel
   environment. Do not expose `CLERK_SECRET_KEY`, signing secret, any database
   URL or admin URL through `NEXT_PUBLIC_*`.
4. Register `https://<host>/api/webhooks/clerk` in Clerk. Deliver one signed
   user, organization and membership event; retry one delivery and retain the
   evidence that it produces one `auth_webhook_events` receipt.
5. Explicitly map the observed organization to a pre-existing tenant and add
   an active internal membership. Verify `/workspace` with a real session;
   then revoke that internal membership and prove access is denied at the next
   request.
6. Run the existing PF-03C migration, verification, staging smoke and restore
   procedures. PF-04A does not close their managed-provider evidence gap.

## Local evidence

`tests/unit/pf04a-clerk-auth.test.ts` proves the no-session, unknown user,
wrong organization and ambiguous/missing internal context paths reject.
`tests/postgres/pf03b-tenant-isolation.test.ts` applies migrations through
`0006` to fresh PostgreSQL and proves the database resolver accepts only an
active internal membership for its mapped tenant, then denies a revoked one.
No Clerk or managed user database was contacted.
