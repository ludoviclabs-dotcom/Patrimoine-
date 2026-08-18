# PATRIMOINE FISCAL — CURRENT STATE

Last updated: 2026-08-19

## Git state

Branch: claude/patrimoine-fiscal-context-e5b7df
HEAD before PF-01: afe1a79713eeb16935993d04d10d9f263569d1a6
HEAD before PF-01B: a1a6d0cb2bb0ec7993aa99dd408b0838a126d3d8
git diff --check: PASS (exit 0, no whitespace/conflict-marker errors)

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
- PF-01 (partial) — fiscal engine reconciliation against the 2026 approved reference.
- PF-01B — TAX-P0-006 (main residence capital-gain exemption) fixed.

## PF-01 / PF-01B — Fiscal reconciliation (partial, 3 of 7 P0 fixed)

Full report: `docs/agent/PF01_FISCAL_RECONCILIATION.md`

Engines audited: IR, CEHR, CDHR, PFU, IFI, plus-value immobilière, résidence
principale, DMTG, Dutreil, apport-cession 150-0 B ter, taxe holding 235 ter C,
démembrement, assurance-vie, IS, SCI, exit tax, PER.

P0 detected: 7 of 7 in the approved P0 register (REGLEMENTATION_AOUT_2026.md
§ 17) confirmed as genuinely present in the code.

P0 fixed (3):
- TAX-P0-001 (Dutreil) — réduction de 50 % rattachée à tort à l'ancien art. 790 I
  et désactivée après le 21/02/2026. L'art. 790 CGI n'a pas été abrogé par la
  LF 2026. Sur le cas de référence, les droits passent de 78 195 € à 39 098 € :
  la V3 surévaluait les droits de 39 097 €.
- TAX-P0-007 (Dutreil) — régime non versionné : engagement individuel 4 ans avant
  le 21/02/2026 / 6 ans à compter, exclusions LF 2026 non rétroactives.
- TAX-P0-006 (plus-value immobilière, PF-01B) — `isMainResidence: boolean` seul
  déclenchait une exonération totale automatique (sous-estimation de l'impôt).
  Remplacé par `assessMainResidenceExemption` (`eligible` / `not-eligible` /
  `needs_review`) : seule une occupation confirmée au jour de la cession, ou une
  vacance avec diligences de vente et délai ≤ 12 mois (tolérance BOFiP), déclenche
  l'exonération. Toute situation insuffisamment documentée retombe sur
  l'imposition normale, jamais sur une exonération silencieuse.

Rule governance:
- `rule-dutreil-2026-v4` (DUTREIL-2026.08-V4) active, `rule-dutreil-2026-v3` archived.
  Evidence source `src-bofip-dmtg-reduction-790-2026` corrected (it asserted the
  abrogation). Rule diff rewritten as V3 → V4.
- `rule-plus-value-immobiliere-2026-v3` (PV-IMMO-2026.08-V3) active,
  `rule-plus-value-immobiliere-2026-v2` archived. New coverage limit
  `coverage-plus-value-main-residence`.

P0 confirmed but NOT fixed (4), unchanged since PF-01: TAX-P0-002 (PFU as a
global constant), TAX-P0-003 (apport-cession not date-versioned), TAX-P0-004
(holding tax base not a closed list), TAX-P0-005 (e-invoicing static date).
None of these produce an undue exemption (unlike TAX-P0-006, now fixed); all
require a change of scope to a distinct engine, out of bounds for a
one-engine-at-a-time run.

Two pre-existing golden cases locked in erroneous rules and were replaced (not
adjusted to pass): the art. 790 abrogation in PF-01, and the bare-boolean main
residence exemption in PF-01B. Both replacements are legally justified in the
reconciliation report.

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

Unit: PASS — 20 files, 198 tests (183 PF-01 baseline, 191 after PF-01, +7 net
in PF-01B), 0 failing
TypeScript: PASS — `npx tsc --noEmit` exit 0
Lint: PASS — `npm run lint` exit 0
Build: PASS — `npm run build` exit 0
E2E: NOT RUN — Playwright harness starts a server, not reliably runnable in this
non-interactive environment. Must be run before production release.

## Open blockers

None blocking the delivered scope. 4 confirmed P0 remain open by design (see
PF-01/PF-01B section above) and are the subject of PF-01C.

## Regulatory verification required

- Holding animatrice: not modelled. Requires a faisceau-d'indices approach with
  `needs_review`, per REGLEMENTATION_AOUT_2026.md § 7.4 and
  Cass. com., 17 déc. 2025, n° 24-17.415.
- DMTG rounding convention: the repository rounds per bracket (reproducing the
  official service-public example, 50 000 € → 8 195 €) while the reference
  rounds once on an exact base. 1 € divergence on the 1 M€ Dutreil golden case
  (repo 14 098 € vs reference 14 097 €). Explicit arbitration required; the
  repository convention was deliberately left unchanged.

## Known technical debt

- IFI V0: décote, plafonnement, démembrement, in-fine and family debts absent.
- Golden coverage missing for exit tax, SCI IR/IS, PER.

## Next recommended task

PF-01C — Resolve remaining confirmed fiscal P0 (TAX-P0-002, 003, 004, 005).

## Handoff notes

Agents MUST update this document at the end of every implementation task.
