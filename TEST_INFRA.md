# E2E Test Infra: Bruno Tasks

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Framework: Playwright (Node.js).

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Task Management (CRUD, Status) | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 2 | Modal & UI State Resilience | ORIGINAL_REQUEST R1, R2 | 5  | 5      | ✓      |
| 3 | Categories & Projects | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 4 | Filtering & Search | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 5 | Mobile & View Switching | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 6 | Widget Panel Rendering | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |

## Test Architecture
- Test runner: `npx playwright test`
- Environment: Local HTTP server serving `index.html` (e.g., via Playwright's webServer).
- Test case format: Playwright TS specs in `tests/e2e/`.
- Directory layout:
  - `playwright.config.ts`
  - `tests/e2e/tier1-feature/`
  - `tests/e2e/tier2-boundary/`
  - `tests/e2e/tier3-pairwise/`
  - `tests/e2e/tier4-workload/`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Create a project, add multiple tasks with statuses, filter them, and close modal. | F1, F3, F4 | High |
| 2 | Simulate a mobile user adding tasks, opening widgets, and marking tasks as done. | F1, F5, F6 | Medium |
| 3 | Break modal state by rapidly clicking outside, reopening, editing, and saving. | F1, F2 | Medium |
| 4 | Heavy text input in search, rapid category switching, task list consistency. | F1, F3, F4 | Medium |
| 5 | Cross-view workflow: desktop search -> edit -> mobile toggle -> widget check. | F1, F3, F4, F5, F6 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total: 30 cases)
- Tier 2: ≥5 per feature (Total: 30 cases)
- Tier 3: pairwise coverage of major feature interactions (Total: 6 cases)
- Tier 4: ≥5 realistic application scenarios (Total: 5 cases)
