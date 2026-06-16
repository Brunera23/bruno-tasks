# Scope: Milestone 2 (Tier 1 Tests)

## Architecture
- Tier 1 tests placed in `tests/e2e/tier1-feature/`
- Opaque-box Playwright testing for 6 core features (5 tests each).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Feature 1 Tests | 5 tests for Task Management | none | BLOCKED: Quota Exhausted |
| 2 | Feature 2 Tests | 5 tests for Modal & UI State | none | BLOCKED: Quota Exhausted |
| 3 | Feature 3 Tests | 5 tests for Categories & Projects | none | DONE |
| 4 | Feature 4 Tests | 5 tests for Filtering & Search | none | DONE |
| 5 | Feature 5 Tests | 5 tests for Mobile & View Switching | none | DONE |
| 6 | Feature 6 Tests | 5 tests for Widget Panel Rendering | none | DONE |

## Interface Contracts
### E2E Tests ↔ App
- Tests rely solely on UI elements visible to an end user via locators.
- No internal dependencies. Runs via `npx playwright test`.
