# Investigation Report: "Clicking outside a task prevents returning to it"

## 1. Observation
- In `index.html`, opening a modal (`openM`, `openMobSheet`, `openAlertForm`) locks the body scroll by storing `window.scrollY` in `document.body.dataset.scrollY`, adding the class `.modal-open` (which applies `position: fixed`), and setting `top: -scrollY`.
- Closing a modal (`closeM`, `closeAlertForm`) removes `position: fixed` and calls `window.scrollTo(0, parseInt(document.body.dataset.scrollY))`.
- `index.html` has a global CSS rule: `html { scroll-behavior: smooth }`.
- `closeMobSheet` is missing the scroll restoration logic entirely.
- In E2E tests, the bug is reproduced by "rapidly clicking outside, reopening, editing, and saving."

## 2. Logic Chain
1. When `closeM` removes `position: fixed` from the body, the browser's native behavior instantly resets `window.scrollY` to `0`.
2. `closeM` immediately calls `window.scrollTo(0, dataset.scrollY)`. Because `scroll-behavior: smooth` is active globally, this triggers a smooth scroll animation from `0` to the target position, rather than an instant jump.
3. If a user rapidly clicks outside the modal (triggering `closeM`) and then clicks a task to reopen the modal (triggering `openM`) *before* the smooth scroll animation completes, `openM` captures an incorrect, mid-animation `window.scrollY` (often `0`).
4. This incorrect value overwrites `document.body.dataset.scrollY`.
5. When the user eventually saves and the modal closes, they are smooth-scrolled to the corrupted value (`0`, the top of the page). 
6. This causes the user to completely lose their place in the task list, effectively "preventing returning to the task" they were interacting with.
7. A secondary bug exists where `closeMobSheet` does not restore the body scroll at all, permanently locking the screen after opening the mobile filters sheet.

## 3. Caveats
- The fix involves temporarily disabling smooth scroll via JS. Depending on the browser's render cycle, using `setTimeout` with `0` or `10ms` is usually sufficient to bypass the animation, but passing `{ behavior: 'instant' }` to `scrollTo` is a more modern standard. It is recommended to use both or modify the `html` style.

## 4. Conclusion
The root cause is a race condition between the JavaScript scroll-lock restoration and the CSS `scroll-behavior: smooth` animation, compounded by missing guards against double-clicks overwriting the saved scroll position with `0`.

**Recommended Fix Strategy:**
1. **Guard `open` functions:** In `openM`, `openMobSheet`, and `openAlertForm`, only capture `scrollY` and apply `modal-open` if `!document.body.classList.contains('modal-open')`.
2. **Bypass smooth scroll on `close`:** In `closeM`, `closeMobSheet`, and `closeAlertForm`, temporarily set `document.documentElement.style.scrollBehavior = 'auto'`, call `window.scrollTo`, and then restore the behavior using `setTimeout(() => { document.documentElement.style.scrollBehavior = ''; }, 10)`.
3. **Fix `closeMobSheet`:** Add the missing scroll restoration logic to `closeMobSheet` to mirror `closeM`.

## 5. Verification Method
1. Open the Bruno Tasks application.
2. Scroll down the task list to a task near the bottom.
3. Click the edit button to open the modal.
4. Rapidly click outside the modal (on the overlay) and immediately double-click the edit button of the same task.
5. Edit the task and click "Salvar".
6. **Expected:** The scroll position remains precisely where the task is located.
7. **Invalidation:** If the page jumps to the top and slowly scrolls, or locks the scroll entirely, the fix failed.
