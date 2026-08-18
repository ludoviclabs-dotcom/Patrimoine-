# PATRIMOINE FISCAL — CURRENT STATE

Last updated: 2026-08-18

## Git state

Branch: claude/patrimoine-fiscal-context-e5b7df
HEAD: f8a1f49f8f126f239674342fd66f468ef47c81a8
git diff --check: PASS (exit 0, no whitespace/conflict-marker errors)
Working tree: 5 reference files moved (unstaged rename: root → docs/reference/2026-08/), tsconfig.json modified (unstaged), AGENTS.md/CLAUDE.md/docs/agent/ untracked. Nothing staged, nothing committed.

## Current milestone

MVP cabinet-ready — Q1 2027

## Current priority

P0 — Fiscal engines LF 2026 + golden cases

## Completed

- Agent context layer installed.
- 2026-08 reference baseline installed.
- Source routing configured.
- Claude Code project memory configured.
- Codex AGENTS instructions configured.
- PF-00 validated in Claude Desktop isolated worktree.

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

Unit: not run (PF-00 is an installation/verification task only; no application code was touched)
TypeScript: PASS — `npx tsc --noEmit` exit 0
Lint: not run
Build: not run
E2E: not run

## Open blockers

None recorded.

## Regulatory verification required

None recorded.

## Known technical debt

Populate during implementation.

## Next recommended task

PF-01 — Reconcile existing fiscal engines against the 2026 approved reference and golden cases.

## Handoff notes

Agents MUST update this document at the end of every implementation task.
