# PATRIMOINE FISCAL — CURRENT STATE

Last updated: 2026-08-19

## Git state

Branch: claude/patrimoine-fiscal-context-e5b7df
HEAD before PF-01: afe1a79713eeb16935993d04d10d9f263569d1a6
HEAD before PF-01B: a1a6d0cb2bb0ec7993aa99dd408b0838a126d3d8
HEAD before PF-01C1: 8531cc900f6bf5eaccbdaa28949cba8f6c15a13c
HEAD before PF-01C2: b1263b2053ebcd5616fdaac1dc2c3c114b566a9a
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
- PF-01C1 — TAX-P0-002 (PFU as a global constant) fixed.
- PF-01C2 — TAX-P0-003 (apport-cession not versioned by operative date) fixed.

## PF-01 → PF-01C2 — Fiscal reconciliation (partial, 5 of 7 P0 fixed)

Full report: `docs/agent/PF01_FISCAL_RECONCILIATION.md`

Engines audited: IR, CEHR, CDHR, PFU, IFI, plus-value immobilière, résidence
principale, DMTG, Dutreil, apport-cession 150-0 B ter, taxe holding 235 ter C,
démembrement, assurance-vie, IS, SCI, exit tax, PER.

P0 detected: 7 of 7 in the approved P0 register (REGLEMENTATION_AOUT_2026.md
§ 17) confirmed as genuinely present in the code.

P0 fixed (5):
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
- TAX-P0-002 (PFU, PF-01C1) — le taux agrégé de 31,4 % était la source primaire
  du calcul, sans catégorie de revenu ni date. Remplacé par un registre de
  profils par catégorie (`lib/tax/investment-income-profiles.ts`) conservant les
  composantes IR et prélèvements sociaux séparées, l'agrégat n'étant plus qu'une
  valeur dérivée d'affichage. Résolution par catégorie ET par date : pivot
  LFSS 2026 au 01/01/2026 (17,2 % → 18,6 %), sauf produits dérogatoires
  (assurance-vie, CEL/PEL/PEP historiques) maintenus à 17,2 %.
  Corollaire : le moteur PEA retenait 17,2 % par défaut alors que le PEA n'est
  pas dérogatoire — corrigé à 18,6 %, soit une sous-imposition de 1,4 point.
- TAX-P0-003 (apport-cession 150-0 B ter, PF-01C2) — le moteur ne recevait
  aucune date : 70 % / 36 mois / conservation 5 ans étaient en dur, donc le
  régime LF 2026 était rétro-appliqué aux cessions antérieures au 21/02/2026.
  Le régime est désormais résolu par la DATE DE CESSION des titres apportés
  (`disposalDate`, nouveau champ), au jour près :
  cessions 01/01/2019 → 20/02/2026 = 60 % / 2 ans / 12 mois ;
  cessions à compter du 21/02/2026 = 70 % / 3 ans / 5 ans.
  En l'absence de date, le moteur s'abstient (`undetermined`, `needs_review`) —
  le régime 2026 n'est jamais présumé. Vérifié en complément du référentiel sur
  legifrance.gouv.fr (versions consolidées de l'art. 150-0 B ter).

Rule governance:
- `rule-dutreil-2026-v4` (DUTREIL-2026.08-V4) active, `rule-dutreil-2026-v3` archived.
  Evidence source `src-bofip-dmtg-reduction-790-2026` corrected (it asserted the
  abrogation). Rule diff rewritten as V3 → V4.
- `rule-plus-value-immobiliere-2026-v3` (PV-IMMO-2026.08-V3) active,
  `rule-plus-value-immobiliere-2026-v2` archived. New coverage limit
  `coverage-plus-value-main-residence`.
- `rule-pfu-arbitrage-2026-v2` (PFU-ARBITRAGE-2026.08-V2),
  `rule-ir-pfu-cdhr-2026-v3` (IR-PFU-CDHR-2026.08-V3) and
  `rule-pea-withdrawal-2026-v2` (PEA-2026.08-V2) active; predecessors archived.
- `rule-apport-cession-2019-v1` (APPORT-CESSION-2019.08-V1) and
  `rule-apport-cession-2026-v3` (APPORT-CESSION-2026.08-V3) active — one per
  regime, both selected by disposal date; `rule-apport-cession-pre-2019-v1`
  draft (holding period undocumented); `rule-apport-cession-2026-v2` archived.

P0 confirmed but NOT fixed (2): TAX-P0-004 (holding tax base not a closed list),
TAX-P0-005 (e-invoicing static date). Both require a change of scope to a
distinct engine, out of bounds for a one-engine-at-a-time run.

RECALCULATION CANDIDATE: apport-cession runs produced before PF-01C2 were all
liquidated under the 70 %/3-year/5-year regime regardless of the actual disposal
date. Files concerning a disposal before 21/02/2026 were assessed against too
high a threshold and too long a holding period. No automatic migration was run
and no historical result was rewritten.

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

Unit: PASS — 20 files, 219 tests (183 PF-01 baseline → 191 PF-01 → 198 PF-01B →
210 PF-01C1 → +9 net in PF-01C2), 0 failing
TypeScript: PASS — `npx tsc --noEmit` exit 0
Lint: PASS — `npm run lint` exit 0
Build: PASS — `npm run build` exit 0
E2E: NOT RUN — Playwright harness starts a server, not reliably runnable in this
non-interactive environment. Must be run before production release.

## Open blockers

None blocking the delivered scope. 2 confirmed P0 remain open by design (see
section above): TAX-P0-004, TAX-P0-005.

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

PF-01C3 — Model CGI art. 235 ter C holding-tax base as a closed statutory list.

## Handoff notes

Agents MUST update this document at the end of every implementation task.
