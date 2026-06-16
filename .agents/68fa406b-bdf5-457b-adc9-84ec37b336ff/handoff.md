# Adversarial Challenge Report: `f5-mobile-view-switching.spec.ts`

## 1. Observation
- **`Desktop View Navigation` / `Mobile View Switching`**: Tests weakly assert mutually exclusive visibility. For example, `Desktop View Navigation` clicks `dashNav` but only checks `tasksView` is hidden, completely ignoring `medView` visibility.
- **`Mobile Mais Sheet Toggle`**: The test uses `await page.keyboard.press('Escape')` to close the mobile sheet. The comment explicitly notes "Click outside the sheet... or press Escape".
- **`Responsive Adaptability`**: Tests resizing from Mobile (375x812) to Desktop (1280x800). However, it only checks `dashView`, which is the default view.
- **`beforeEach` hook**: Sets up globals via `page.evaluate()` immediately after `await page.goto('/')`. During execution of a new adversarial test, this occasionally caused an error: `Error: page.evaluate: Execution context was destroyed, most likely because of a navigation`.
- **Application Edge Case (Discovered via custom test)**: When adding a custom test to open the mobile sheet (`#mobCatMgr`), and then resizing the viewport to desktop dimensions (1280x800), Playwright's `expect(page.locator('#mobSheet')).not.toBeVisible()` failed with `Received: visible`. The `.mob-sheet open` element remained fully visible in the desktop view.

## 2. Logic Chain
- Testing Mobile interactions using Desktop paradigms (the `Escape` key) fails to verify the actual user experience (tapping the overlay). While I empirically verified that tapping the overlay works in the app, the test is not providing true coverage of the mobile interaction.
- Testing responsive state synchronization using the *default* view (`dashView`) gives a false sense of security. If the app incorrectly resets its state on resize, `dashView` would naturally be active anyway. The test doesn't actually prove state is preserved. (Empirical check showed state *is* preserved for other views, but the test does not guarantee this).
- The `beforeEach` race condition occurs because the application is doing client-side navigation or re-rendering right after load, which destroys the execution context while `page.evaluate` is running. This creates flaky tests.
- Transient mobile UI elements (like `#mobSheet`) lack logic to hide or close when crossing breakpoints. The tests never considered resizing the window while a mobile-specific modal is open, completely missing this bug.

## 3. Caveats
- I did not test interactions across every single view (only `dash`, `med`, `tasks` are defined in the tests).
- The `beforeEach` flakiness may be exacerbated by my local execution environment or Playwright worker restarts.

## 4. Conclusion
The test file `f5-mobile-view-switching.spec.ts` successfully passes its own "happy path" checks but is adversarially weak. It relies on desktop keyboard inputs to test mobile components, fails to assert state retention on non-default views during responsive changes, and misses a significant bug where the mobile sheet remains persistently visible if the window is resized to desktop mode. Furthermore, its setup hook is prone to race conditions.

## 5. Verification Method
1. **To verify the mobile sheet bug**: Append this test to `f5-mobile-view-switching.spec.ts`:
   ```typescript
   test('Adversarial: Mobile Sheet Resize', async ({ page }) => {
     await page.setViewportSize({ width: 375, height: 812 });
     await page.locator('#mobCatMgr').click();
     await expect(page.locator('#mobSheet')).toBeVisible();
     await page.setViewportSize({ width: 1280, height: 800 });
     await expect(page.locator('#mobSheet')).not.toBeVisible();
   });
   ```
   Run `npx playwright test tests/e2e/tier1-feature/f5-mobile-view-switching.spec.ts`. It will fail because `#mobSheet` remains visible.
2. **To verify the test weakness**: Observe line 101 of the original spec file using `await page.keyboard.press('Escape')` instead of clicking the overlay, and line 111 testing only the default `dash` view.
