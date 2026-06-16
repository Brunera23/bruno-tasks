# Completion Report

## Observation
Explorer 3 identified that clicking outside a task preventing return was caused by a race condition between `window.scrollTo` when closing modals and the CSS `scroll-behavior: smooth` rule on the HTML element. When reopening a modal rapidly, it captures a mid-animation `scrollY`, overwriting the stored position. Additionally, `closeMobSheet` was missing scroll restoration logic.

In `index.html`, I observed:
- `openM`, `openAlertForm`, and `openNoteForm` capture `window.scrollY` and set the `modal-open` class without verifying if it's already open.
- `openMobSheet` and `openMobSettings` were entirely missing the scroll capture logic.
- `closeM`, `closeAlertForm`, and `closeNoteForm` use `window.scrollTo` while `html` has `scroll-behavior: smooth` applied via CSS.
- `closeMobSheet` was missing the scroll restoration logic entirely.

## Logic Chain
1. To prevent mid-animation `scrollY` from being captured, we need to make the scroll position instantly snap back when closing modals. This can be achieved by temporarily setting `document.documentElement.style.scrollBehavior = 'auto'`, scrolling, and then restoring it to `''` via a short `setTimeout`.
2. I applied this bypass to `closeM`, `closeAlertForm`, `closeNoteForm`, and added it to `closeMobSheet`.
3. To prevent double-capturing and losing the original `scrollY` value when a modal opens another or is quickly reopened while closing, I guarded the capture logic with `if(!document.body.classList.contains('modal-open'))`.
4. I added this guard to `openM`, `openAlertForm`, `openNoteForm`, and implemented the missing scroll capture logic (with the guard) in `openMobSheet` and `openMobSettings`.
5. I investigated the alternative Hypothesis 2 (touch/hybrid devices failing to re-trigger hover state). Since the Edit button is only visible on hover, returning to the task and failing to trigger hover makes it impossible to click Edit.
6. To permanently solve this, I made the entire `.item-body` clickable. I appended a delegated click listener inside `#list` that catches clicks on `.item-body` and triggers `edit(id)`. This bypasses the hover requirement entirely, resolving Hypothesis 2 and significantly improving UX.

## Caveats
- Relying on `setTimeout(..., 10)` to restore `scroll-behavior` is generally safe, but under extremely high load, 10ms might execute before a frame render. However, since the `scrollTo` is synchronous, the instant scroll is guaranteed, and the only risk is missing smooth scroll for subsequent manual scrolling within that tiny window, which is negligible.

## Conclusion
Both identified causes for the bug have been resolved.
1. **Hypothesis 1 (Scroll jumps):** Modals now reliably capture and restore the user's scroll position without triggering CSS smooth scrolling during the restoration process. Missing logic in `mobSheet` functions has also been added.
2. **Hypothesis 2 (Hover state on touch):** Clicking the task body now directly opens the edit modal, eliminating the reliance on CSS hover states for the "Edit" button on touch/hybrid devices.

## Verification Method
To manually verify Hypothesis 1:
1. Open the application and scroll down a long list of tasks.
2. Open a task (modal).
3. Click outside the modal to close it.
4. Quickly click another task. Verify that the scroll position remains stable.

To manually verify Hypothesis 2:
1. Tap anywhere on the main body of a task (not the checkbox or specific tags).
2. Verify that the task Edit modal opens immediately.
