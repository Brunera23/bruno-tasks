# Handoff Report: Feature 1 (Task Management) Playwright Tests

## Observation
I investigated `index.html` to identify the appropriate locators for creating, reading, updating, deleting tasks, and changing their status.
- **Create**: The button to add a task is `<button class="btn-add" id="btnAdd">` (line 1267). This opens a modal with `<form id="form">` containing `<input id="fT">` for the title and a save button (`.m-btns button[type="submit"]`).
- **Read**: Tasks are dynamically rendered inside `<div class="tl" id="list">`. The view filters are located at `<div class="seg">` with buttons containing `data-s` attributes (e.g., `data-s="all"`, `data-s="todo"`, `data-s="done"`).
- **Update**: Each rendered task item (`.item`) has an edit button inside `.item-acts` identifiable by the edit icon (`<use href="#i-edit"/>`). Editing re-opens `#modal` where fields like priority (`#fP button[data-v="alta"]`) can be updated.
- **Status Change**: The status checkbox `.ck` on a task opens a popover `#stPop` when clicked. The popover contains status options `.st-opt[data-st="todo|doing|done"]`.
- **Delete**: Task items contain a delete button `.del` with the trash icon. Deleting prompts a confirmation dialog `#cfWrap` with a confirm button `#cfYes`.

## Logic Chain
1. To test **Create**, we must trigger `#btnAdd`, wait for the `#modal`, fill the title `#fT`, and submit `#form`. The task should then appear in `#list` with the `.item-title` matching our input.
2. To test **Read**, we switch the view filters using `.seg button[data-s="*"]` and verify the created task appears under "Todas" and "A fazer" but not under "Feitas".
3. To test **Update**, we click the edit button on the specific task, change properties (like title and priority `#fP button[data-v="alta"]`), and verify the DOM reflects the changes (e.g., presence of `.pdot.alta`).
4. To test **Status Change**, we click the `.ck` checkbox to invoke `#stPop`, select 'Fazendo' (`[data-st="doing"]`), then check for the `.tag-meta.doing` badge. Doing it again for 'Concluída' (`[data-st="done"]`) will append the `.completed` class to the `.item`.
5. To test **Delete**, we click the `.del` button on the task, confirm via `#cfYes`, and verify the task disappears from the list.

## Caveats
- Playwright tests will need to handle the dynamic creation and destruction of the `#stPop` popover and wait for the CSS transitions (e.g., `opacity`, `transform`) used for modals (`#modal` and `#cfWrap`).
- The task list might have staggered animations (`animation: taskSlideIn`), so Playwright's auto-waiting should handle it, but assertions on visibility might need to accommodate animation delays.
- Mobile views use different buttons (e.g., `#fab` instead of `#btnAdd`). These tests are designed using the desktop locators.

## Conclusion
Based on the structure of `index.html`, here are the exactly 5 Playwright opaque-box test scenarios for Tier 1 Feature Coverage:

1. **Test 1: Create a Task**
   - Click `page.locator('#btnAdd')`
   - Fill `page.locator('#fT')` with "Test Task"
   - Click `page.locator('#form button[type="submit"]')`
   - Assert `page.locator('#list .item .item-title').filter({ hasText: 'Test Task' })` is visible.
2. **Test 2: View and Filter Tasks**
   - Click `page.locator('.seg button[data-s="done"]')`
   - Assert "Test Task" is NOT visible in `#list`.
   - Click `page.locator('.seg button[data-s="todo"]')`
   - Assert "Test Task" IS visible.
3. **Test 3: Edit Task Details**
   - Click `page.locator('.item').filter({ hasText: 'Test Task' }).locator('.item-acts button').filter({ has: page.locator('use[href="#i-edit"]') })`
   - Fill `page.locator('#fT')` with "Updated Task"
   - Click `page.locator('#fP button[data-v="alta"]')`
   - Click `page.locator('#form button[type="submit"]')`
   - Assert the task title changed to "Updated Task" and it contains `page.locator('.pdot.alta')`.
4. **Test 4: Change Task Status**
   - Click `page.locator('.item').filter({ hasText: 'Updated Task' }).locator('.ck')`
   - Wait for `#stPop` and click `page.locator('#stPop .st-opt[data-st="doing"]')`
   - Assert the task has the doing tag: `page.locator('.item').filter({ hasText: 'Updated Task' }).locator('.tag-meta.doing')`
   - Click the `.ck` checkbox again and click `page.locator('#stPop .st-opt[data-st="done"]')`
   - Assert the task row has the completed class: `page.locator('.item.completed').filter({ hasText: 'Updated Task' })`.
5. **Test 5: Delete Task**
   - Click `page.locator('.item').filter({ hasText: 'Updated Task' }).locator('.item-acts button.del')`
   - Wait for `#cfWrap` and click `page.locator('#cfYes')`
   - Assert the task is no longer visible in `#list`.

## Verification Method
1. Ensure the `TEST_INFRA.md` guidelines are followed by integrating these exact locators into a Playwright test file (e.g., `tests/e2e/tier1-feature/task-management.spec.ts`).
2. Run `npx playwright test` locally against `index.html` via webServer to confirm all 5 test cases pass successfully.
