## Challenge Summary

**Overall risk assessment**: HIGH

## Challenges

### [High] Challenge 1: Incomplete View State Assertions

- Assumption challenged: The test accurately verifies that ONLY the selected view is active and all others are hidden.
- Attack scenario: A bug in `switchView` causes `medView` to receive or retain the `.active` class while `dashView` is also active.
- Blast radius: UI state bleeds. Users see multiple views layered on top of each other. The test suite reports a pass, giving a false sense of security.
- Mitigation: Add `await expect(medView).not.toBeVisible();` to the Dashboard and Tasks navigation tests, and ensure all non-target views are asserted as hidden in every view-switch test.

### [High] Challenge 2: Bypassing Application Initialization

- Assumption challenged: The test reflects actual user experience starting the application.
- Attack scenario: The application's `DOMContentLoaded` listener or Firebase initialization chain breaks, meaning `showApp()` is never called in production.
- Blast radius: The application is completely broken (blank screen) for users, but the E2E tests still pass 100% because they use `page.evaluate()` to manually invoke `showApp()` and `render()`.
- Mitigation: Remove manual initialization from `beforeEach`. Use a local web server (e.g., `http-server` or Playwright's `webServer` config) instead of `file:///`, and let the app initialize itself naturally.

### [Medium] Challenge 3: Brittle Coordinate-Based Interaction

- Assumption challenged: Clicking `{ x: 10, y: 10 }` on `mobSheetOv` will consistently close the modal overlay.
- Attack scenario: A CSS update adds a safe-area inset, margin, or alters the bounding box of the overlay, shifting `(10, 10)` outside the clickable region.
- Blast radius: The test suite randomly fails on different screen sizes or after minor CSS adjustments, causing developer fatigue and ignored CI failures. (This was empirically verified: it failed after a minor DOM update).
- Mitigation: Instead of absolute coordinates, use a top-left offset percentage, or better, add a dedicated hidden close button or send an `Escape` keystroke (for desktop tests) to close the modal. For mobile, target an element bounding box robustly.

### [Low] Challenge 4: State Bleeding Across Responsive Breakpoints

- Assumption challenged: Navigational state gracefully transitions when resizing between mobile and desktop breakpoints in all directions.
- Attack scenario: User switches to `medView` on desktop, then resizes to mobile. The mobile tab bar might not accurately reflect the active state because the test only covers `dashView` from mobile to desktop.
- Blast radius: Minor UI inconsistency.
- Mitigation: Expand `Responsive Adaptability` test to cover reverse directions (Desktop -> Mobile) and other views (`tasksView`, `medView`).

## Stress Test Results

- [Scenario: Inject `$('#medView').classList.toggle('active', v==='med' || v==='dash');` into source code] → [Expected: Test fails] → [Actual: Test passed] → [Fail]
- [Scenario: Another agent changed modal scroll lock overlay DOM logic] → [Expected: Test adapts or clicks correct region] → [Actual: `expect(locator).not.toBeVisible() failed` due to missing the click target] → [Fail]

## Unchallenged Areas

- Playwright global configuration — out of scope.
- `index.html` structure outside of view switching.
