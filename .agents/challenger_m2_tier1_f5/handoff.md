# Handoff Report: F5 Mobile View Switching Tests

## Observation
1. Running `npx playwright test tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts` resulted in two failed tests: `Desktop View Navigation` and `Mobile Mais Sheet Toggle`.
2. `Desktop View Navigation` failed because `expect(locator('#tasksView')).toBeVisible()` timed out. `tasksView` remained hidden.
3. Code analysis of `index.html` shows that clicking the "Tarefas" tab triggers `switchView('tasks')`. In this function, the condition `v==='tasks' && $('#fmWrap').classList.contains('open')` is evaluated. Since `$('#fmWrap')` does not exist in the DOM, this throws a `TypeError: Cannot read properties of null`, halting the function before it applies the `active` class to `#tasksView`.
4. `Mobile Mais Sheet Toggle` failed with a timeout because `mobSheetOv.click()` was intercepted by an element inside `#mobSheet`. Playwright clicks the center of elements by default, and `#mobSheetOv` covers the entire viewport, meaning the click lands at `y=50%`. The sheet `#mobSheet` grows upwards from the bottom and covers the center of the screen, intercepting the click and causing a timeout.

## Logic Chain
1. The failure in `Desktop View Navigation` is a genuine application bug caught by the test. The test exercises standard user behavior (clicking a navigation link), and the application crashes due to a stale reference to a removed element (`#fmWrap`).
2. The failure in `Mobile Mais Sheet Toggle` is a test implementation flaw. The test assumes a generic click on the background overlay will dismiss the modal, which works for human users who naturally click the visible part of the overlay. However, the test runner clicks the geometric center, which is obscured by the modal content.
3. The `Mobile View Switching` test does not click the "Tarefas" (`data-view="tasks"`) mobile tab. If it did, it would also encounter the application bug found by the desktop test.

## Caveats
- No caveats. The test failures and bugs are fully reproducible and the root causes are deterministic.

## Conclusion
- The test file is effective at catching an application bug but contains a brittle test and incomplete coverage.
- The `Mobile Mais Sheet Toggle` test must be updated to click an unobscured coordinate, e.g., `mobSheetOv.click({ position: { x: 10, y: 10 } })`.
- The `Mobile View Switching` test should be expanded to click the "tasks" tab to ensure symmetric coverage with the desktop test.
- The application bug in `index.html` must be fixed by removing the stale `$('#fmWrap')` check in `switchView()`.

## Verification Method
- Run `npx playwright test tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts`.
- Check Playwright traces/errors to confirm the center-click interception.
- Open `index.html` in browser, click "Tarefas" after switching to "Dashboard", and observe the console error: `TypeError: Cannot read properties of null (reading 'classList')`.
