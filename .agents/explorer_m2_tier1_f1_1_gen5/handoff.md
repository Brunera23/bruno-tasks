# Handoff Report: Feature 1 (Task Management) Testing Strategy

## 1. Observation
- The `.modal` CSS class uses multiple CSS transitions: `transition: transform var(--dur-spring) var(--ease-spring), opacity var(--dur-smooth) var(--ease-expo)`.
- The CSS variables defining duration are: `--dur-fast: 150ms`, `--dur-norm: 250ms`, `--dur-smooth: 350ms`, and `--dur-spring: 500ms`.
- The modal's opening/closing animation takes up to 500ms to complete. During this time, elements may visually obscure the modal or vice versa, causing pointer interception (e.g. `<main class="main">` blocking clicks) or failing Playwright's strict actionability checks.
- Modal state is managed by the `.open` class on `#modal` and `#cfWrap`. While `#cfWrap` uses `display: none` / `flex` (no transition), `#modal` uses CSS transform/opacity transitions.
- Previous tests failed due to race conditions: `await page.click('#btnAdd')` triggered the modal, but typing occurred before it settled, and after closing, clicks on task items were blocked by the fading out modal.

## 2. Logic Chain
1. **Wait for state + Timeout for Transition:** Playwright can synchronously wait for `.open` to be added or removed (`await page.waitForSelector('#modal.open', { state: 'visible' | 'hidden' })`), but it does NOT wait for the subsequent CSS transition. We must add `await page.waitForTimeout(500)` immediately after the state change to allow the `--dur-spring` animation to fully settle.
2. **Force Clicks:** To prevent sporadic timeouts when Playwright's actionability engine deems elements unclickable because they are technically still in a fading/sliding frame, we should use `{ force: true }` on interactions that occur near modal transitions (like clicking `#btnAdd` or the modal's `submit` button).
3. **Preserving Previous Fixes:** We will retain the robust Firebase `addInitScript` mock with dynamic `uid` generation, the `sw.js` route block, exact string matching for titles (`getByText(taskName, { exact: true })`), and the `toPass` dual state assertion for the "Done" state.

## 3. Caveats
- Using fixed timeouts (`500ms`) is generally discouraged in E2E tests, but it is necessary here because the web app relies purely on CSS transitions without JavaScript animation-end events that Playwright could hook into. 500ms exactly matches the maximum CSS variable duration (`--dur-spring`).
- No caveats regarding the previous iteration's mock logic — it is solid and isolates the test from the network.

## 4. Conclusion
The testing strategy will strictly wrap any modal interaction with three steps:
1. Trigger the action (using `{ force: true }`).
2. Wait for the class state (`#modal.open` to be visible or hidden).
3. Wait for the CSS transition (`waitForTimeout(500)`).

Below are the 5 proposed Playwright test cases incorporating these steps:

### Proposed Playwright Test Cases & Steps

#### Test 1: Create a task
1. Click `#btnAdd` `{ force: true }`.
2. Wait for `#modal.open` to be `visible`.
3. Wait `500ms` for animation.
4. Fill `#fT` with a unique task name.
5. Click `#form button[type="submit"]` `{ force: true }`.
6. Wait for `#modal.open` to be `hidden`.
7. Wait `500ms` for animation.
8. Assert `page.getByText(taskName, { exact: true })` is visible.

#### Test 2: Update a task
1. Create a task (following steps 1-7 above).
2. Hover over the created `.item`.
3. Click the edit button (`.a-btn:has(svg use[href="#i-edit"])`) `{ force: true }`.
4. Wait for `#modal.open` to be `visible`.
5. Wait `500ms` for animation.
6. Fill `#fT` with an updated name.
7. Click `#form button[type="submit"]` `{ force: true }`.
8. Wait for `#modal.open` to be `hidden`.
9. Wait `500ms` for animation.
10. Assert the updated task name is visible.

#### Test 3: Change status to Doing
1. Create a task (following steps 1-7 above).
2. Hover over the created `.item` and click its checkbox (`.ck`) `{ force: true }`.
3. Wait for `#stPop` to be visible (or have `.show`).
4. Click the "doing" option (`.st-opt[data-st="doing"]`) `{ force: true }`.
5. Wait `500ms` for the task animation to run.
6. Assert the checkbox has the `doing-st` class.

#### Test 4: Change status to Done
1. Create a task (following steps 1-7 above).
2. Hover over the created `.item` and click its checkbox (`.ck`) `{ force: true }`.
3. Wait for `#stPop` to be visible.
4. Click the "done" option (`.st-opt[data-st="done"]`) `{ force: true }`.
5. Wait `500ms` for the task animation.
6. Use `await expect(async () => { ... }).toPass()` to assert that the `.item` has the `completed` class AND the `.ck` has the `on` class.

#### Test 5: Delete a task
1. Create a task (following steps 1-7 above).
2. Hover over the created `.item`.
3. Click the delete button (`.del`) `{ force: true }`.
4. Wait for `#cfWrap.open` to be `visible` (confirmation dialog).
5. Click `#cfYes` `{ force: true }`.
6. Wait for `#cfWrap.open` to be `hidden`.
7. Wait `500ms` for the task removal animation.
8. Assert the task title is hidden.

## 5. Verification Method
1. The implementer should create/update `tests/e2e/tier1-feature/f1-task-management.spec.ts` using the steps outlined above.
2. Run `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts --repeat-each=10 --workers=4` to stress test the modal animations.
3. If it passes without Flaky or Failed runs, the modal animation race condition is completely solved.
