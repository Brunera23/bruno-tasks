# Project: Bruno Tasks

## Architecture
- Frontend web application (SPA) contained primarily in `index.html`.
- Service worker support in `sw.js` for PWA functionality.
- Hosted using Firebase (indicated by `firebase.json` and `.firebaserc`).

## E2E Testing Track
- **Goal:** Design comprehensive opaque-box test suite.
- Publishes TEST_READY.md when complete.

## Implementation Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Fix Known Bugs | Resolve the bug where "clicking outside a task prevents returning to it". | none | PLANNED |
| 2 | QA & Fix Other Bugs | Fix any other logic, UI, or state management errors found during QA. | 1 | PLANNED |
| 3 | Final E2E Pass | Pass 100% of the E2E test suite (Tiers 1-4). | 1, 2 | PLANNED |
| 4 | Adversarial Hardening | Adversarial coverage hardening (Tier 5). | 3 | PLANNED |

## Code Layout
- `index.html`: Main application logic, HTML structure, and CSS.
- `sw.js`: Service worker.
- `manifest.json`: PWA manifest.
