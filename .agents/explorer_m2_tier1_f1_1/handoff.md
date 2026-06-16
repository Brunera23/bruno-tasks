# Tier 1 Feature Coverage: Task Management (CRUD, Status)

## 1. Observation
I investigated `index.html` to identify the correct locators and UI flows for task management.
- **Task Creation Modal**: Triggered by `button#btnAdd` (or `#fab` on mobile). The form uses `<form id="form">`. The title input is `<input id="fT">`. The save button is `<button type="submit">` inside the form.
- **Task List**: The list container is `<div id="list">`. Individual tasks are `.item`. The title is in `.item-title`.
- **Edit/Delete Actions**: Inside each `.item`, there are action buttons within `.item-acts`. The edit button is `.a-btn` containing `<use href="#i-edit">`. The delete button has the class `.a-btn.del`.
- **Confirmation Dialog**: Deleting triggers a modal with container `#cfWrap`, and the confirm button is `button#cfYes`.
- **Status Change**: The status checkbox is `button.ck`. Clicking it opens a status popover `.st-pop.show`. The options are `.st-opt[data-st="todo"]`, `[data-st="doing"]`, and `[data-st="done"]`.

## 2. Logic Chain
Based on these locators, we can construct 5 distinct opaque-box Playwright tests that cover the full lifecycle of a task (CRUD + Status):
1. **Create Task**: Verifies that a user can open the modal, input a title, submit the form, and see the task in the list.
2. **Read/Filter Task**: Verifies the list correctly displays tasks and that segment filters (`.seg button`) correctly hide/show the task based on its status.
3. **Update Task**: Verifies that clicking the edit button reopens the modal with the task's current data, and saving it updates the title in the DOM.
4. **Change Status**: Verifies the status popover workflow. Clicking the `.ck` button, selecting "Feita" (done), and ensuring the task receives the `.completed` class or its `.ck` button gets the `.on` class.
5. **Delete Task**: Verifies that clicking the delete button and confirming via the `#cfWrap` dialog permanently removes the task from the list.

## 3. Caveats
- **Viewport dependency**: The `#btnAdd` button is hidden on mobile screens, which use `#fab`. These tests assume a desktop viewport for `#btnAdd`, or Playwright should abstract this by using `getByRole('button', { name: 'Nova tarefa' })` which works universally if accessibility labels are present.
- **State isolation**: It is recommended that each Playwright test uses a fresh browser context or clears local storage, as the app stores tasks locally.

## 4. Conclusion
**Proposed Playwright Tests (5 Cases):**

**Test 1: Create a basic task (Create)**
- Click `locator('#btnAdd')`
- Fill `locator('#fT')` with "Test Create Task"
- Click `locator('#form button[type="submit"]')`
- Expect `locator('#list .item-title', { hasText: 'Test Create Task' })` to be visible.

**Test 2: View and filter tasks (Read)**
- Click `locator('.seg button[data-s="doing"]')`
- Expect the previously created task to NOT be visible.
- Click `locator('.seg button[data-s="all"]')`
- Expect the task to be visible.

**Test 3: Edit an existing task (Update)**
- Locate the task row: `const row = locator('.item', { hasText: 'Test Create Task' })`
- Click `row.locator('.item-acts button:has(use[href="#i-edit"])')`
- Fill `locator('#fT')` with "Test Updated Task"
- Click `locator('#form button[type="submit"]')`
- Expect `locator('#list .item-title', { hasText: 'Test Updated Task' })` to be visible.

**Test 4: Change task status (Status)**
- Click `locator('.item', { hasText: 'Test Updated Task' }).locator('button.ck')`
- Wait for `locator('.st-pop.show')` to be visible.
- Click `locator('.st-pop .st-opt[data-st="done"]')`
- Expect `locator('.item', { hasText: 'Test Updated Task' }).locator('button.ck')` to have class `on` (or the `.item` row to have class `completed`).

**Test 5: Delete a task (Delete)**
- Click `locator('.item', { hasText: 'Test Updated Task' }).locator('button.a-btn.del')`
- Wait for `locator('#cfWrap.open')` to be visible.
- Click `locator('#cfYes')`
- Expect `locator('#list .item-title', { hasText: 'Test Updated Task' })` to have count 0 (not visible).

## 5. Verification Method
To verify, implement these 5 tests in a Playwright spec file (e.g., `tests/e2e/tier1-feature/task-crud.spec.ts`) and run `npx playwright test`. The tests must pass against the local development server serving `index.html`. If any test fails, it indicates either a locator mismatch or an actual UI bug in the application.
