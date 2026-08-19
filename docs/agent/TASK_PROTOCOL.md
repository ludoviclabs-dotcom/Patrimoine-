# PATRIMOINE FISCAL — TASK EXECUTION PROTOCOL

Every implementation task follows this sequence:

DISCOVER
→ VERIFY
→ PLAN
→ IMPLEMENT
→ TEST
→ REVIEW DIFF
→ UPDATE STATE
→ REPORT

## DISCOVER

Read AGENTS.md and the task-specific reference files.

Inspect existing implementation before proposing replacement code.

## VERIFY

Determine:

- existing behavior;
- expected target behavior;
- existing tests;
- dependencies;
- regulatory implications.

## PLAN

Produce a short implementation plan before editing.

Keep the scope narrow.

## IMPLEMENT

Make the minimum coherent change.

Do not modify unrelated code.

## TEST

Execute the relevant validation commands.

Fiscal changes require golden cases.

## REVIEW

Inspect the final diff for:

- unintended deletion;
- unrelated formatting;
- changed fiscal constants;
- missing source references;
- broken TypeScript;
- regressions.

## STATE

Update docs/agent/CURRENT_STATE.md.

## REPORT

Return:

STATUS
FILES CHANGED
TESTS
LEGAL/FISCAL IMPACT
BLOCKERS
NEXT STEP
