# Handoff Report: Modal & UI State Resilience Tests (Tier 1 - Feature 2)

**Summary:** Identified all necessary locators and formulated a strategy for implementing the 5 Playwright test cases for task modal interactions.

## 1. Observation
- The task modal container has the ID `#modal` and gains the class `.open` when visible.
- The overlay/backdrop has the ID `#ov` and also gains `.open`. Clicking it triggers `closeM`.
- The "Cancel" button inside the modal has the ID `#mCancel`.
- The task form is `#form`. Its "Title" input has the ID `#fT`. The save button can be selected via `#form button[type="submit"]`.
- To create a new task, `#btnAdd` (or `#fab` on mobile) can be clicked.
- Tasks are rendered in a list container (`#list`). Each task row contains an element with the class `.item-body`.
- Clicking on a `.item-body` triggers `edit(id)`, which opens the modal and populates the form with the task's existing data.
- Pressing `Escape` key closes the modal (handled via document `keydown` listener).

## 2. Logic Chain
- **Test 1 (Close via button):** Clicking `#btnAdd` reliably opens the `#modal`. Clicking `#mCancel` invokes `closeM()`, which removes the `.open` class.
- **Test 2 (Close via backdrop):** Since `#ov` is positioned behind `#modal`, a direct click on `#ov` must be offset (e.g., `{ position: { x: 10, y: 10 } }`) to avoid interception by the modal. Clicking it invokes `closeM()`.
- **Test 3 (Close via Escape):** `page.keyboard.press('Escape')` fires the event that the app listens to, successfully invoking `closeM()`.
- **Test 4 (Re-open same task):** To test regression R1, we must first create a task (e.g., "Task A"). Clicking `.item-body` with text "Task A" opens the modal. Verifying the input `#fT` has value "Task A" confirms correct state. After closing, re-clicking the same `.item-body` should yield the same state.
- **Test 5 (Open different task):** Creating two tasks ("Task A", "Task B"). Opening "Task A", closing it, and then opening "Task B" allows verifying that the modal state (input `#fT`) updates to "Task B", proving the UI state doesn't leak between tasks.

## 3. Caveats
- The `#ov` element covers the entire screen, but the center is obstructed by `#modal`. Playwright's default `click()` hits the center of the element, so using an offset `click({ position: { x: 10, y: 10 } })` or `click({ force: true })` on `#ov` is required.
- If running on a mobile viewport, the add button is `#fab` instead of `#btnAdd`. Tests should preferably use `#btnAdd` for desktop viewports or `locator('#btnAdd, #fab').first()` for cross-device compatibility.
- Ensure task creations are awaited properly (e.g., waiting for the modal to close and the task to appear in the list) before attempting to click the task items.

## 4. Conclusion
The implementation of `tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts` should proceed using the following locators:
- **Modal Container:** `page.locator('#modal')`
- **Add Task Button:** `page.locator('#btnAdd')`
- **Close Button:** `page.locator('#mCancel')`
- **Backdrop:** `page.locator('#ov')`
- **Task Title Input:** `page.locator('#fT')`
- **Save Button:** `page.locator('#form button[type="submit"]')`
- **Task Item Body:** `page.locator('.item-body', { hasText: '...' })`

## 5. Verification Method
The implementer can verify the locators and logic by creating the test file and running `npx playwright test tests/e2e/tier1-feature/f2-modal-ui-state.spec.ts`. All 5 tests should pass without timeout or element interception errors.
