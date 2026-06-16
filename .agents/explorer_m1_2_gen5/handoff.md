# Handoff Report: Double-Click Text Selection Regression

## Observation
- In Iteration 4, a check was added to `#list` `click` event listener: `if(window.getSelection().toString().length>0)return;`
- This successfully prevents the edit modal from opening when text is selected by clicking and dragging.
- However, when double-clicking to select text, the first click event fires before the second click and before native text selection occurs. In this first click event, `window.getSelection().toString().length` is 0.
- Because it's 0, the first click immediately triggers `edit(id)`, opening the modal and stealing focus, which interrupts the double-click sequence and prevents text selection.

## Logic Chain
1. To distinguish between a single click (intended to open the modal) and a double-click (intended to natively select text), we can look at the `UIEvent.detail` property within the click event.
2. For a single click, `e.detail` is `1`.
3. For a double click, the browser fires two click events: the first with `e.detail === 1`, and the second with `e.detail === 2` (shortly after the first).
4. If we defer the `edit()` call on `e.detail === 1` using a `setTimeout` of 250ms, we provide a short window for a potential second click.
5. If a second click occurs (`e.detail === 2`), we cancel the timeout via `clearTimeout()`. This allows the native double-click action (text selection) to proceed unhindered.
6. The `setTimeout` callback should still verify that `window.getSelection().toString().length === 0` before opening the modal, to account for drag selections that might resolve just exactly at the same time.

## Caveats
- A 250ms delay is introduced when opening the edit modal. This is a standard and generally unnoticeable delay for distinguishing clicks from double-clicks on the web.
- If a user clicks exceptionally slowly for a double click (>250ms), the edit modal will open. This matches standard OS/browser double-click speed expectations.

## Conclusion
The bug can be fixed by implementing a short timeout for single clicks (`e.detail === 1`) and cancelling it on double clicks (`e.detail === 2`). 

I have generated two patch files in my working directory containing the proposed fixes:
- `patch_index.patch`: Modifies the `click` listener in `index.html` to defer single clicks and cancel on double clicks.
- `patch_tests.patch`: Adds a new Hypothesis 5 test to `bug_fix_verification.spec.ts` to assert that double-clicking selects text and does NOT open the edit modal.

## Verification Method
1. Apply the patches.
2. Run the Playwright test suite (`bug_fix_verification.spec.ts`) to ensure Hypothesis 5 passes, validating the double-click behavior.
3. Manually open the app, single click a task to verify the modal still opens.
4. Manually double-click a task title to verify that the word is selected and the modal does not open.
5. Manually click-and-drag across text to verify that selection works and the modal does not open.
