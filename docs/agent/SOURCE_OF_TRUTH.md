# PATRIMOINE FISCAL — SOURCE OF TRUTH

Last reference baseline: 2026-08-18.

## Purpose

This file determines which repository sources must be consulted before a change.

Model knowledge is never authoritative for fiscal constants or legal rules.

## PROJECT REFERENCE BASELINE

### Fiscal engines

Primary references:

- ../reference/2026-08/MOTEURS_FISCAUX_2026.ts
- ../reference/2026-08/REGLEMENTATION_AOUT_2026.md
- ../rule-governance.md

### Product UX

Primary reference:

- ../reference/2026-08/AUDIT_DESIGN.md

### Technical architecture

Primary reference:

- ../reference/2026-08/ARCHITECTURE_CIBLE.md

### Delivery order

Primary reference:

- ../reference/2026-08/ROADMAP_Q3_2026_Q1_2027.md

Priority order:

P0 fiscal engines
→ Postgres/Auth
→ server PDF
→ design system
→ regulatory watcher
→ AI runtime

## CONFLICT POLICY

If current code and target architecture differ:

- current code describes the existing implementation;
- reference documents describe the approved target.

Do not rewrite unrelated existing code.

If a legal source conflicts with a project reference document:

STOP the affected fiscal implementation.

Report:

REGULATORY CONFLICT DETECTED

Never silently resolve a legal conflict.

## TEMPORAL VALIDITY

The regulatory reference baseline is dated 18 August 2026.

For changes concerning law after that date, perform a new official-source verification before updating deterministic rules.
