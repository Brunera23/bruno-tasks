# Analysis Synthesis

## Consensus
Explorer 3 found that the bug "clicking outside a task prevents returning to it" is caused by a race condition between the JavaScript scroll-lock restoration (`window.scrollTo` when closing modals) and the CSS `scroll-behavior: smooth` rule on the `html` element. Rapidly reopening a modal captures a mid-animation `scrollY` (often 0), overwriting the stored scroll position, which later causes the page to jump to the top. Additionally, `closeMobSheet` is completely missing the scroll restoration logic.

## Resolved Conflicts
N/A (Only Explorer 3 completed the analysis successfully in time, providing a high-quality evidence-based root cause).

## Dissenting Views
N/A

## Gaps
None. The root cause fully explains the bug.

## Recommended Fix Strategy
1. **Guard `open` functions:** In `openM`, `openMobSheet`, and `openAlertForm` (in `index.html`), only capture `scrollY` and apply the `modal-open` class if `!document.body.classList.contains('modal-open')`.
2. **Bypass smooth scroll on `close`:** In `closeM`, `closeMobSheet`, and `closeAlertForm`, temporarily set `document.documentElement.style.scrollBehavior = 'auto'`, call `window.scrollTo`, and then restore it using a short `setTimeout` (e.g., 10ms) or use the `{ behavior: 'instant' }` argument.
3. **Fix `closeMobSheet` missing logic:** Add the missing scroll restoration logic to `closeMobSheet`.
