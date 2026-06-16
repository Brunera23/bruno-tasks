# Handoff Report: Fixing Flaky Modal Test

## 1. Observation
- The user reported that Test 5 in `tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts` occasionally fails with `Error: expect(locator).toHaveClass(expected) failed` when verifying the modal's `open` class.
- The test previously used `{ force: true }` on clicks and `waitForTimeout(500)` to wait for modal closure and insertion animations.
- The modal and overlay use CSS transitions for closing (`opacity` fading to `0` over `350ms` specified by `--dur-smooth`).
- `waitForTimeout(500)` was acting as an implicit, flaky wait for this `350ms` CSS transition.
- Removing `waitForTimeout(500)` and `{ force: true }` without adding other waits caused the test to fail consistently because Playwright would immediately interact with the DOM while the modal's `opacity` was still transitioning, causing the click to either be swallowed, ignored, or registered as a double-click event (due to its close proximity in time and space to the previous modal close click).

## 2. Logic Chain
1. To replace `{ force: true }` and `waitForTimeout(500)` with robust assertions, we must explicitly wait for the UI to settle into the expected state.
2. The UI state we are waiting for is the completion of the modal and overlay fade-out transitions.
3. Playwright's `toBeHidden()` considers an element hidden if its `opacity` reaches `0`. However, since the elements have `display: block` and `visibility: visible`, asserting directly on the computed CSS property is much more deterministic.
4. By using `await expect(page.locator('#modal')).toHaveCSS('opacity', '0')` and the same for `#ov`, we tell Playwright to poll until the `350ms` CSS transition completes perfectly.
5. Once the opacity reaches `0`, the UI is stable, and we can safely use a standard `.click()` without `{ force: true }`.

## 3. Caveats
- Playwright automatically waits for CSS animations (`taskSlideIn`) to finish before clicking an element when `{ force: true }` is removed. This makes the clicks robust on their own, provided the overlay transitions are handled.

## 4. Conclusion
The flakiness in Test 5 was resolved by removing the hardcoded `waitForTimeout(500)` and `{ force: true }` bypasses, and replacing them with explicit visual state assertions: `await expect(locator).toHaveCSS('opacity', '0')`. This ensures the test deterministically waits for the CSS transitions to complete regardless of execution speed.

## 5. Verification Method
- Run `npx playwright test tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts`.
- The test suite should pass reliably without timeouts. I have already verified this locally and it passes with 100% success.
