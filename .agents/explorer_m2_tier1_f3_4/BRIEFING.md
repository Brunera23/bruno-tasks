# BRIEFING — 2026-06-05T22:34:00-03:00

## Mission
Investigate test flakiness in f3 tests due to DOM overrides and recommend a strategy using the proper Firebase Auth mock from f1.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigator
- Working directory: c:\Users\Bruno\Desktop\activities tracker\.agents\explorer_m2_tier1_f3_4
- Original parent: 14471871-b0b5-4376-9c21-0446c1490598
- Milestone: Tier 1 Feature Tests (Feature 3)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Find how f1 properly mocks Firebase Auth and recommend a fix strategy for f3
- Write strategy in handoff.md

## Current Parent
- Conversation ID: 14471871-b0b5-4376-9c21-0446c1490598
- Updated: not yet

## Investigation State
- **Explored paths**: `tests/e2e/tier1-feature/f1-task-management.spec.ts`, `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`
- **Key findings**: f1 overrides `firebase.auth().signInWithPopup()` to synchronously initialize the app and then clicks the login button. f3 currently uses fragile DOM overrides.
- **Unexplored areas**: None.

## Key Decisions Made
- Recommending to replace f3's DOM override with f1's Firebase Auth mock, while keeping the localStorage cleanup needed for f3.

## Artifact Index
- c:\Users\Bruno\Desktop\activities tracker\.agents\explorer_m2_tier1_f3_4\handoff.md — Strategy report
