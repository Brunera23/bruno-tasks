# Handoff Report: Adversarial Challenge on Feature 2 (Modal & UI State)

## Observation
I created two adversarial test suites to stress-test `tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts` and the underlying modal logic.

**Test 1: `f2-modal-ui-state-adversarial.spec.ts`**
- Tested state leakage by typing into the modal, cancelling (via Escape, Cancel button, and Click Outside), and reopening the modal to check if the state persisted.
- Tested state pollution by opening an existing task modal, closing it, and then opening a *new* task modal to ensure the form was empty.
- **Result:** All passed. The UI successfully resets the form on every reopen.

**Test 2: `f2-modal-ui-state-adversarial-2.spec.ts`**
- Tested race conditions on task creation by rapidly submitting the form using synchronous JavaScript events (bypassing button debouncing, to simulate fast interactions or event duplicates).
- **Result:** Failed.
```
Error: expect(received).toEqual(expected) // deep equality
Expected: 1
Received: 3
```

## Logic Chain
1. The modal implementation correctly resets form states on close, preventing state leakage and pollution between new and existing tasks.
2. However, the submit handler in `index.html` (line 3827) lacks an `isSubmitting` lock or UI freeze.
3. If multiple `submit` events are dispatched rapidly (e.g., via rapid Enter presses with `Ctrl+Enter` or laggy UI clicks triggering multiple submit events before `closeM()` can destroy the modal), the app creates multiple tasks. 
4. The app contains a title deduplication logic (`while(others.some(t=>t.title===title)){title=base+' ('+n+')';n++}`) which actually renames the duplicates instead of preventing them, thus resulting in "Task", "Task (1)", and "Task (2)" being created simultaneously.

## Caveats
- Playwright's `.click({force: true})` on the Save button was too slow to trigger the race condition, so I used `page.evaluate` to trigger synchronous submit events, simulating a laggy environment where events queue up.
- Standard `Enter` press does not submit the form due to an intentional block in the app's `keydown` listener (only `Ctrl+Enter` is allowed), which is arguably a feature, not a bug, though it initially caused a test to fail due to timeout expecting the modal to close.

## Conclusion
The modal UI state is largely resilient and handles clearing data perfectly upon various close methods. However, **there is a race condition vulnerability on task submission**. Rapid sequential submit events will bypass the modal closing sequence and spawn duplicate tasks with incremented names. Verdict: **Fail**.

## Verification Method
1. Run the project tests using Playwright.
2. Run my adversarial test suite: `npx playwright test "c:\Users\Bruno\Desktop\activities tracker\tests\e2e\tier1-feature\f2-modal-ui-state-adversarial-2.spec.ts"` to see the duplicate task creation failure.
3. Inspect `index.html` at `$('#form').addEventListener('submit'...)` to verify the lack of state locking before `closeM()` and `render()`.
