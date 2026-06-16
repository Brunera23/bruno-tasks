## Observation
- Ran `npx playwright test tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts`.
- In the first run, the command failed with exit code 1. Tests 1 and 2 failed due to a 30000ms timeout: `Error: locator.click: Test timeout of 30000ms exceeded. Call log: waiting for locator('#btnAdd') ... element is not visible`. Tests 3, 4, and 5 passed.
- In a subsequent run, all tests passed in 6.3s. This confirms intermittent flakiness.
- Checked `tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts` setup logic:
  ```typescript
  await page.addInitScript(() => {
    (window as any).currentUser = { uid: 'test-uid', displayName: 'Test User' };
    (window as any)._fbReady = false;
    (window as any)._fbInitDone = false;
  });
  ```
- Checked `index.html` source code: `currentUser`, `_fbReady`, and `_fbInitDone` are declared with `let` in the top-level script, not as properties of `window`:
  ```javascript
  let currentUser=null;
  let _fbReady=false,_fbSaving=false,_fbListening=false;
  ```
- The test setup uses `await page.waitForTimeout(500)` in `beforeEach` and `await page.waitForTimeout(300)` in Test 5 to wait for DOM updates.

## Logic Chain
1. The use of `let` in `index.html` prevents `window.currentUser` or `window._fbReady` from shadowing or modifying the application's internal variables.
2. Because the application state is not properly mocked, the real Firebase authentication listener (`auth.onAuthStateChanged`) fires with a `null` user.
3. This triggers `showLoginScreen()`, which manipulates the DOM (`$('.shell').style.display='none'`). Although the test injects a CSS tag with `!important` to force `.shell` visibility, the underlying Firebase initialization (including `db.enablePersistence`) still runs asynchronously.
4. During initial parallel execution, this heavy asynchronous Firebase logic causes main thread blocking or layout thrashing, resulting in Playwright evaluating `#btnAdd` as "not visible" and timing out after 30 seconds.
5. The use of hardcoded `waitForTimeout` (300ms, 500ms) instead of web-first assertions (e.g., waiting for list items to have a specific count) increases the likelihood of flakiness, as it assumes DOM stability after an arbitrary duration.

## Caveats
- Playwright isolates browser contexts by default, so the tests don't share IndexedDB databases, but running multiple instances connecting to production Firebase simultaneously can still lead to throttled network responses or CPU starvation, aggravating the race condition.

## Conclusion
**Verdict: REQUEST_CHANGES (Fail)**
The test setup is still flaky and not robust. The attempt to mock application state via `window` properties fails because the target variables are block-scoped (`let`). As a result, the application executes real Firebase logic, causing unpredictable DOM behavior and intermittent timeouts. Additionally, hardcoded timeouts should be replaced with Playwright locators and assertions.

## Verification Method
- Execute `npx playwright test tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts` multiple times (especially with a cold start or heavy parallel load) to observe the intermittent `locator.click` timeouts.
- Inspect `index.html` to confirm that `currentUser` and `_fbReady` are declared with `let`.
