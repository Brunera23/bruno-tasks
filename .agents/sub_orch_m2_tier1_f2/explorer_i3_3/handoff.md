# Observation
- In `tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts`, there are two instances of `waitForTimeout`.
- The first is at line 30 in the `beforeEach` hook (`await page.waitForTimeout(500);`), immediately following CSS injection that bypasses the login screen.
- The second is at line 92 in test 5 (`await page.waitForTimeout(300);`), occurring after a second task is added via the modal and submitted. The test comments note: `// After adding two tasks, the list is re-rendered / wait for it to stabilize`.
- Following the second timeout, the test asserts the visibility of the newly added item: `await expect(itemBodies.nth(1)).toBeVisible();`.

# Logic Chain
- The first `waitForTimeout(500)` is an arbitrary delay to ensure that the app has fully loaded and the `#btnAdd` is actionable after bypassing the login screen. Playwright's `click()` naturally waits for visibility and actionability, so this timeout can either be removed entirely or replaced with an explicit assertion on the application shell's readiness. Wait for `#btnAdd` visibility ensures the target of the first interaction is ready.
- The second `waitForTimeout(300)` is used to wait for the DOM to update with the new task list item. Hardcoded timeouts for DOM updates are flaky. By using Playwright's `toHaveCount` assertion, we can poll the DOM until the list correctly reflects the expected state (2 items).
- Replacing `await page.waitForTimeout(300);` with `await expect(itemBodies).toHaveCount(2);` ensures the test waits exactly as long as needed for the DOM to re-render, eliminating the flakiness while avoiding unnecessary waiting.

# Caveats
- Removing the first timeout assumes that JavaScript attaches the click listener to `#btnAdd` synchronously or quickly enough that Playwright's native element waiting handles the lifecycle cleanly. If tests fail on `#btnAdd` click without the timeout, replacing it with `await page.waitForLoadState('networkidle')` might be necessary, though typically `toBeVisible()` is sufficient.

# Conclusion
To refactor the test file robustly:
1. Replace `await page.waitForTimeout(500);` in `beforeEach` (line 30) with `await expect(page.locator('#btnAdd')).toBeVisible();`. This is much faster and reliably ensures the interface is loaded.
2. Replace `await page.waitForTimeout(300);` in test 5 (line 92) with `await expect(itemBodies).toHaveCount(2);`. This explicitly waits for the DOM to render exactly two tasks, correctly acting as a synchronization point for the re-render.

# Verification Method
1. Open `tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts`.
2. Delete the `waitForTimeout` calls and replace them with the assertions outlined in the Conclusion.
3. Run the E2E tests for this feature: `npx playwright test tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts`.
4. Verify the test passes reliably without relying on fixed timeouts.
