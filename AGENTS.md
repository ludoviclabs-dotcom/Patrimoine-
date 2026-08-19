# PATRIMOINE FISCAL — AGENT CONTRACT

This repository contains a French wealth-tax and patrimonial-tax SaaS.

Fiscal correctness and preservation of existing work are higher priority than speed.

These instructions apply to the entire repository.

## MANDATORY STARTUP PROTOCOL

Before planning, editing, generating, refactoring, migrating or deleting anything:

1. Run:

git status --short
git branch --show-current
git rev-parse HEAD
git diff --stat

2. Read completely:

docs/agent/SOURCE_OF_TRUTH.md
docs/agent/CURRENT_STATE.md
docs/agent/TASK_PROTOCOL.md

3. Determine which reference documents apply to the requested task.

4. Read those reference documents BEFORE modifying code.

5. Inspect the existing implementation and relevant tests.

Do not begin implementation before completing this preflight.

## SOURCE-OF-TRUTH POLICY

Never use model memory as the source of a fiscal rate, threshold, legal condition, effective date or tax formula.

Project reference documents are located in:

docs/reference/2026-08/

Mandatory routing:

Fiscal calculation / tax engine / tax labels:
- docs/reference/2026-08/MOTEURS_FISCAUX_2026.ts
- docs/reference/2026-08/REGLEMENTATION_AOUT_2026.md
- docs/rule-governance.md
- relevant tests/unit files

UI / UX / dashboard / mobile:
- docs/reference/2026-08/AUDIT_DESIGN.md
- docs/reference/2026-08/ARCHITECTURE_CIBLE.md

Database / Auth / tenancy / Blob / PDF:
- docs/reference/2026-08/ARCHITECTURE_CIBLE.md
- docs/reference/2026-08/ROADMAP_Q3_2026_Q1_2027.md

Regulatory watcher:
- docs/reference/2026-08/REGLEMENTATION_AOUT_2026.md
- docs/reference/2026-08/ARCHITECTURE_CIBLE.md
- docs/reference/2026-08/ROADMAP_Q3_2026_Q1_2027.md

AI runtime:
- docs/reference/2026-08/REGLEMENTATION_AOUT_2026.md
- docs/reference/2026-08/ARCHITECTURE_CIBLE.md
- docs/reference/2026-08/ROADMAP_Q3_2026_Q1_2027.md

## FISCAL SAFETY MODE

For any fiscal or patrimonial rule:

- NEVER invent a rate, threshold, date, exemption or legal condition.
- NEVER silently infer a missing tax rule.
- NEVER replace a documented value with model memory.
- NEVER simplify a rule if doing so changes the fiscal result.

Every deterministic fiscal rule must retain:

- stable rule identifier;
- version;
- effective date;
- official source reference;
- calculation steps;
- golden test where applicable.

If information is missing or contradictory, use:

[BLOCKED — SOURCE VERIFICATION REQUIRED]

and explain the conflict.

Do not guess.

For legal verification, prefer official sources only:

- legifrance.gouv.fr
- bofip.impots.gouv.fr
- impots.gouv.fr
- economie.gouv.fr
- service-public.fr
- official EU sources

A regulatory change must never enter production only because a web page changed.

It must pass:

source detection
→ review
→ rule version
→ golden test
→ activation

## EXISTING RULE GOVERNANCE

Preserve these project principles:

- no simulation result without calculation_steps;
- each calculation_step points to a rule version;
- each fiscal rule points to official sources;
- uncertain results become indicative / needs_review;
- missing data causes abstention or verification status;
- deterministic rules require golden cases.

Do not weaken these guarantees.

## EXISTING STACK

Inspect package.json before making architectural assumptions.

Do not downgrade or replace existing technology solely because an older planning document mentions another version.

Preserve the current implementation unless the active roadmap explicitly requires migration.

Avoid unnecessary framework, ORM or state-management migrations.

## GIT SAFETY

Never run without explicit user authorization:

git reset --hard
git clean -fd
git checkout .
git restore .
git rebase
git push --force

Never overwrite unrelated local changes.

Never discard uncommitted work.

Never create, merge or publish a PR unless explicitly requested.

## IMPLEMENTATION POLICY

Prefer the smallest coherent change that satisfies the task.

Avoid opportunistic refactors.

Do not mix fiscal rule changes, UI refactors, database migrations or dependency upgrades inside the same change unless strictly necessary.

Never replace working deterministic tax logic with LLM-generated runtime logic.

The LLM may explain or orchestrate.

The deterministic engine calculates.

## TEST POLICY

For fiscal changes:

Run relevant tests before editing when possible.

After implementation run:

npm test
npx tsc --noEmit
npm run lint

For production-impacting changes also run:

npm run build

For user-flow changes run:

npm run e2e

A fiscal change is incomplete without a golden regression case.

Never modify a golden expected result simply to make a failing implementation pass unless the legal source proving the new result is documented.

## COMPLETION PROTOCOL

At the end of every task:

1. Re-run relevant validation.
2. Run git diff --check.
3. Inspect git diff.
4. Update:

docs/agent/CURRENT_STATE.md

Include:

- date;
- branch;
- HEAD;
- task completed;
- files changed;
- tests executed;
- tests passed/failed;
- unresolved blockers;
- regulatory verification still required;
- recommended next task.

Do not mark incomplete work as completed.

## REQUIRED FINAL RESPONSE

Always report:

STATUS
FILES CHANGED
TESTS
FISCAL/LEGAL IMPACT
BLOCKERS
NEXT RECOMMENDED STEP
