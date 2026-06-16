# Handoff Report: F3 Tests Review (Tier 1) - REQUEST CHANGES

## Observation
- The worker isolated local JS state (`tasks`, `cats`, `projects`) cleanly and skipped the asynchronous `fbInit()` call.
- However, when running `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts --repeat-each 5`, test #18 (a repetition of TC2) FAILED with a timeout: `Test timeout of 30000ms exceeded while running "beforeEach" hook.`
- The logs show: `waiting for locator('#tasksView') to be visible`, but it resolved to `hidden <div id="tasksView" class="tasks-view active">…</div>` 33 times.

## Logic Chain
- The test suite uses the same Playwright worker for multiple tests, meaning `localStorage` is shared between runs.
- `TC2` tests the Category Manager, which involves clicking `#catMgrBtn`. This changes the application's current view and saves `curView` to `localStorage`.
- When the next test starts, `page.goto('/')` is called. The app initializes and reads `localStorage.getItem('curView')`, setting `#catMgrView` (or whatever the last view was) to be active instead of `#tasksView`.
- In `page.evaluate()` inside `beforeEach`, the worker explicitly resets `curView = 'tasks'` and calls `render()`, but it does NOT call `switchView('tasks')` or explicitly clear `localStorage`. 
- Because `render()` updates the *contents* of the active view but does not reset the CSS classes that control which view is visible, `#tasksView` remains hidden. Thus, `page.waitForSelector('#tasksView', { state: 'visible' })` times out.

## Caveats
- Bypassing network sync via `fbInit()` is structurally sound, but the UI state is still leaking across tests via `localStorage` because `curView` and view visibility CSS are not fully reset.

## Conclusion
- The test flakiness is NOT completely resolved. A timeout still occurs due to state leakage via `localStorage` altering the active view.
- To fix this, `beforeEach` should either fully clear `localStorage` before navigating/evaluating, or explicitly call `switchView('tasks')` instead of just setting the variable.
- Verdict: FAIL (REQUEST_CHANGES).

## Verification Method
- Run `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts --repeat-each 5`. 
- Without the fix, you will occasionally observe a test timing out in the `beforeEach` hook waiting for `#tasksView` to become visible.
