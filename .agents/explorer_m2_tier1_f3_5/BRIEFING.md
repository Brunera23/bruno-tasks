# BRIEFING — 2026-06-05

## Mission
Investigate flaky test in F3 caused by fragile DOM override and recommend fix strategy based on F1 test mock.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigator
- Working directory: c:\Users\Bruno\Desktop\activities tracker\.agents\explorer_m2_tier1_f3_5
- Original parent: 14471871-b0b5-4376-9c21-0446c1490598
- Milestone: Tier 1 Feature 3 Tests

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify any source files.

## Investigation State
- **Explored paths**: `tests/e2e/tier1-feature/f1-task-management.spec.ts`, `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`
- **Key findings**: F1 correctly mocks `firebase.auth().signInWithPopup` and clicks `#loginBtn`. F3 bypasses this by overriding `display` on DOM elements, which conflicts with Firebase's `onAuthStateChanged`.

## Key Decisions Made
- Recommend replacing F3's DOM override with F1's auth mock.
