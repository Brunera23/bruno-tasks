# Handoff Report

## Observation
1. **Hypothesis 1 (Scroll position test)** fails immediately at `expect(initialScroll).toBe(1000)` (Received: 0). The test runs `window.scrollTo(0, 1000)` and then immediately asserts `window.scrollY`.
2. `index.html`'s `checkRestoreScroll()` removes `document.body.style.top=''` and sets `scrollBehavior='auto'`, then calls `window.scrollTo(...)`. It does not contain a layout reflow trigger (like `void document.body.offsetHeight;`) before scrolling.
3. **Hypothesis 2 (Clicking .item-body)** fails with a timeout: `locator.click: Test timeout of 30000ms exceeded` while waiting for `.item-body` to become visible. 
4. **Hypothesis 3 (Highlighting text)** fails with `Expected: false, Received: true`. The test injects text into the DOM, fakes a text selection, dispatches a synthetic click, and asserts `editCalled` is false.
5. In `index.html`, initialization logic falls back to `showLoginScreen()` if there is no logged-in user. `showLoginScreen()` explicitly sets `$('.shell').style.display='none'`.

## Logic Chain
1. **Test Setup Flaw:** The tests run against the local file (`file:///`) without mocking an authenticated user. Therefore, the app asynchronously defaults to `showLoginScreen()`, which hides the `.shell` container (`display: none`). 
2. **Hypothesis 2 Timeout:** Because `.shell` is hidden, the injected `.item-body` tasks are not visible to the browser. Playwright's `locator.click()` strictly waits for the target element to become visible. Since it never does, the 30-second timeout occurs.
3. **Hypothesis 3 False Positive:** The test uses `body.dispatchEvent(new MouseEvent('click'))`, which bypasses Playwright's visibility check. The synthetic click reaches `#list`. The app's event listener checks `window.getSelection().toString().length > 0`. Because the element is hidden (`display: none`), the browser's Selection API returns an empty string (`""`). The text selection check incorrectly evaluates to false, allowing `edit()` to be called. Thus, the test fails, expecting `false` but receiving `true`.
4. **Hypothesis 1 Premature Failure:** The test evaluates `window.scrollTo(0, 1000)` and expects `scrollY` to instantly be 1000. Due to `scroll-behavior: smooth` defined in the global CSS, the browser scrolls asynchronously, so `scrollY` is still 0 at the moment of assertion. This masks the actual bug in `checkRestoreScroll()`.
5. **The Real Bug (`checkRestoreScroll`):** In `index.html`, when `document.body.style.top = ''` removes the fixed body positioning, the document's height collapses and expands. Without forcing a layout reflow (e.g., querying `offsetHeight`) before `window.scrollTo(...)`, the browser doesn't recognize the expanded height synchronously. The scroll fails to reach its target, causing the scroll position to be lost if a modal is rapidly opened right after.

## Caveats
- Since I am operating in read-only mode, I have inferred the exact behavior of the DOM in Playwright headless mode when dealing with `display: none` text selection, which perfectly explains the documented errors. 
- I did not test a fully mocked Firebase flow, but identified that bypassing the login screen's CSS is sufficient to expose the `.shell` container for the injected DOM elements.

## Conclusion
The failing tests are primarily caused by flawed test methodology (not handling asynchronous scroll behavior and unauthenticated app states). The underlying app logic in `index.html` also requires a layout reflow fix to genuinely resolve the scroll deselection bug.

### Fix Strategy
1. **In `index.html`:** Add `void document.body.offsetHeight;` immediately before `window.scrollTo(...)` in `checkRestoreScroll()` to force layout reflow.
2. **In `bug_fix_verification.spec.ts` (Hypothesis 1):** Temporarily set `document.documentElement.style.scrollBehavior = 'auto'` inside the `page.evaluate()` setup block before the initial `scrollTo(0, 1000)`.
3. **In `bug_fix_verification.spec.ts` (Hypotheses 2 & 3):** To bypass the hidden shell issue, inject a style override during `beforeEach` to force visibility:
   ```javascript
   const style = document.createElement('style');
   style.textContent = '.shell { display: flex !important; } #loginScreen { display: none !important; }';
   document.head.appendChild(style);
   ```

### Proper Methodology Recommendation
Instead of injecting DOM nodes directly into `#list` immediately after `goto`, the test should:
1. Seed `tasks` via `localStorage.setItem('bt-v5', JSON.stringify([...]))` before load, or mock the global `tasks` object.
2. Mock an authenticated state so `fbInit()` triggers the regular `renderTasks()` loop, or run the CSS visibility override.
3. Wait for actual elements (e.g., `page.waitForSelector('.item-body')`) before acting, allowing genuine DOM reconciliation instead of conflicting with the app's render engine.

## Verification Method
1. Edit `index.html` line ~3228 to insert `void document.body.offsetHeight;` before `window.scrollTo(...)`.
2. Edit `tests/e2e/bug_fix_verification.spec.ts` to implement the `scrollBehavior` and CSS injections as detailed.
3. Run `npx playwright test tests/e2e/bug_fix_verification.spec.ts`. All four tests should pass.
