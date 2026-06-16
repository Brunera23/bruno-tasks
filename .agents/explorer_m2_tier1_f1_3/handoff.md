# Feature 1 (Task Management) - Testing Strategy and Locators

## 1. Observation
- The main interface (`index.html`) relies on a central task list (`#list` with `.tl` class) populated with `.item` elements.
- **Create**: Initiated via the "Nova tarefa" button (`#btnAdd`). It opens a modal (`#modal`) with a form (`#form`). The task title input is `#fT` (Placeholder: "Ex: Pagar a conta de luz..."). The save button is `.btn-primary` (type="submit").
- **Update**: Inside `.item-acts`, an edit button exists (no distinct class, but identified by `.a-btn:has(svg use[href="#i-edit"])` or `onclick^="edit"`). It reopens `#modal` to modify values.
- **Status Change**: Task status is managed via a `.ck` button on each task. Clicking it opens a fixed popover (`#stPop`) with `.st-opt` items containing `data-st` values (`todo`, `doing`, `done`).
- **State Indicators**: A "doing" task has `.ck.doing-st`. A "done" task has `.ck.on` and `.item.completed`.
- **Delete**: The delete button is `.a-btn.del`. Deletion requires confirmation in a secondary modal (`#cfWrap`), executed via the `#cfYes` button.
- **Completed Tasks**: Tasks marked as done may be moved into `.done-section`, which is hidden by default and toggled via `.done-toggle`.

## 2. Logic Chain
To fulfill the Tier 1 Feature Coverage requirement of exactly 5 tests using an opaque-box approach:
- We must break down CRUD and Status into 5 distinct end-to-end flows.
- **Test 1 (Create & Read)** proves basic addition to the DOM.
- **Test 2 (Update)** proves that an existing element can be found, edited, and successfully saved.
- **Test 3 (Status - Doing)** verifies the custom status popover logic, a unique component of this application.
- **Test 4 (Status - Done)** ensures that tasks can be completed, handled appropriately by the UI (class changes), and retrieved if hidden in the completed accordion.
- **Test 5 (Delete)** validates the deletion lifecycle, including the safety confirmation modal.

## 3. Caveats
- **Accessibility Labels**: Buttons like Edit and Delete lack explicit `aria-label` attributes. Locators must rely on classes (`.del`) or specific internal SVG selectors.
- **Label Associations**: Form labels are not directly linked to inputs via `for="..."` attributes. Playwright's `getByLabel` might fail; we recommend `getByPlaceholder` or the specific ID `#fT`.
- **Dynamic State**: Status changes are handled via a transient DOM node (`#stPop`) that disappears on outside clicks. Tests must wait for it to have the `.show` class before interacting.

## 4. Conclusion
Below are the 5 proposed Playwright test cases and their recommended locators for Feature 1 (Task Management - CRUD, Status):

### Test 1: Create a New Task
* **Description**: Verifies that a user can create a task and see it appear in the task list.
* **Steps**:
  1. Click the Add Task button.
  2. Wait for the modal to be visible.
  3. Fill in the task title.
  4. Click Save.
  5. Assert the task appears in the list.
* **Recommended Locators**:
  - Add Button: `page.locator('#btnAdd')` or `page.getByRole('button', { name: 'Nova tarefa' })`
  - Modal Input: `page.locator('#fT')` or `page.getByPlaceholder('Ex: Pagar a conta de luz...')`
  - Save Button: `page.locator('#form button[type="submit"]')`
  - Assertion: `expect(page.locator('.item-title').filter({ hasText: 'Test Task' })).toBeVisible()`

### Test 2: Update an Existing Task
* **Description**: Verifies that a user can edit an existing task's title.
* **Steps**:
  1. Find the created task.
  2. Click its Edit button.
  3. Change the title in the modal.
  4. Click Save.
  5. Assert the new title is visible and the old one is gone.
* **Recommended Locators**:
  - Task Item Container: `const task = page.locator('.item', { hasText: 'Test Task' })`
  - Edit Button: `task.locator('.a-btn:has(svg use[href="#i-edit"])')`
  - Modal Input: `page.locator('#fT')`
  - Save Button: `page.locator('#form button[type="submit"]')`

### Test 3: Change Task Status to "Doing"
* **Description**: Verifies that clicking the checkbox opens the status popover and updating to "Fazendo" applies the correct visual state.
* **Steps**:
  1. Find the task.
  2. Click its status checkbox.
  3. Wait for the status popover to appear.
  4. Click the "Fazendo" option.
  5. Assert the checkbox acquires the doing state.
* **Recommended Locators**:
  - Checkbox: `task.locator('.ck')`
  - Status Popover: `page.locator('#stPop.show')`
  - Doing Option: `page.locator('.st-opt[data-st="doing"]')`
  - Assertion: `expect(task.locator('.ck')).toHaveClass(/doing-st/)`

### Test 4: Mark a Task as "Done"
* **Description**: Verifies that marking a task as done correctly updates its state and handles UI relocation.
* **Steps**:
  1. Click the task's status checkbox.
  2. Select the "Concluída" option from the popover.
  3. (Optional) If hidden, click the Completed Tasks toggle.
  4. Assert the task is marked completed.
* **Recommended Locators**:
  - Done Option: `page.locator('.st-opt[data-st="done"]')`
  - Completed Toggle: `page.locator('.done-toggle')`
  - Assertion: `expect(task).toHaveClass(/completed/)` and `expect(task.locator('.ck')).toHaveClass(/on/)`

### Test 5: Delete a Task
* **Description**: Verifies the deletion flow including the confirmation modal.
* **Steps**:
  1. Find the task.
  2. Click its Delete (trash) button.
  3. Wait for the confirmation modal.
  4. Click "Excluir".
  5. Assert the task no longer exists in the DOM.
* **Recommended Locators**:
  - Delete Button: `task.locator('.a-btn.del')`
  - Confirm Modal: `page.locator('#cfWrap')`
  - Confirm Button: `page.locator('#cfYes')`
  - Assertion: `expect(task).toHaveCount(0)`

## 5. Verification Method
- Execute the E2E test suite locally using `npx playwright test`.
- Manually inspect `index.html` in a browser, using DevTools to confirm that `document.querySelector` reliably resolves these locators.
- Confirm state changes (such as `.ck.on` and `.doing-st`) persist and render correctly in the live app UI.
