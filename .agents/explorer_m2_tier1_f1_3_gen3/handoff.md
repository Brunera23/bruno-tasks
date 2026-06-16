# Handoff Report

## 1. Observation
- **Service Worker Flakiness**: In `index.html` (lines 4030-4050), the application registers a Service Worker (`sw.js`). Upon update or controller change, it forcefully triggers `location.reload()`. During Playwright tests, this asynchronously destroys the execution context and wipes out `beforeEach` mocks.
- **Data Collisions**: `tests/e2e/tier1-feature/f1-task-management.spec.ts` mocks the Firebase UID using a hardcoded string `uid: 'mock123'`. Parallel test workers simultaneously read/write to the same Firebase database nodes under this UID, causing data overwrite and race conditions.
- **Weak Assertions**: Test 4 (Change status to Done) asserts success using `expect(taskHasCompleted || ckHasOn).toBeTruthy()`. This allows false positives where only one UI element reflects the completed state.
- **Loose Matching**: Tests use `.locator('.item', { hasText: taskName })` and `.locator('.item-title', { hasText: taskName })`. With hardcoded or overlapping test names (e.g., "Task to Update" vs "Task to Update Updated"), this can match multiple elements or the wrong element entirely.

## 2. Logic Chain
1. To prevent the Service Worker from reloading the page mid-test, we must stop its registration. Since Playwright starts with a clean context (no pre-installed SW) per test, we can cleanly block it by intercepting and aborting the network request to the SW script (`page.route('**/sw.js**', route => route.abort());`). The app catches SW registration errors gracefully, so it won't crash.
2. To prevent data collisions across parallel workers, we must inject a unique UID per test. We can utilize `testInfo.workerIndex` and `Date.now()` within `test.beforeEach` to generate a dynamic UID (e.g., `mock-${testInfo.workerIndex}-${Date.now()}`), and pass it into `page.evaluate`.
3. To eliminate false positives in state verification, the assertion in Test 4 must use an `AND` approach. Replacing the logical `OR` with explicit `.toBe(true)` checks for both `taskHasCompleted` and `ckHasOn` ensures both visual indicators are verified.
4. To ensure precise element targeting, test tasks must have dynamically generated names (e.g., `Task ${Date.now()}`). Additionally, locators must enforce exact string matching using `page.getByText(taskName, { exact: true })` and `.filter({ has: ... })` to avoid partial string overlaps.

## 3. Caveats
- Aborting the `sw.js` route ensures the application functions as a standard web page without offline capabilities. If offline functionality or caching behavior ever needs to be tested explicitly, a separate test file with SW enabled (and properly mocked backend) would be required.

## 4. Conclusion
The testing strategy for Feature 1 must be refactored as follows:
- Block SW registration using `page.route` in `beforeEach`.
- Use a dynamic Firebase UID injection combining `workerIndex` and a timestamp.
- Tighten test assertions to independently verify all DOM classes instead of using logical OR.
- Target elements using strict locators and exactly matching dynamically generated task names.

Below are the 5 proposed test cases matching this strategy:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature 1 - Task Management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // 1. Block Service Worker to prevent auto-reloads
    await page.route('**/sw.js**', route => route.abort());

    await page.goto('/');

    // 2. Inject unique Firebase auth UID per test
    const uniqueUid = `mock-${testInfo.workerIndex}-${Date.now()}`;

    await page.evaluate(({ uid }) => {
      const authObj = firebase.auth();
      authObj.signInWithPopup = async () => {
        currentUser = { uid, displayName: 'Test', email: 't@t.com' };
        updateSidebarUser(currentUser);
        showApp();
        if (typeof _authBooted !== 'undefined') _authBooted = true;
        if (typeof processRecurring === 'function') processRecurring();
        if (typeof setGreeting === 'function') setGreeting();
        if (typeof render === 'function') render();
        if (typeof fbInit === 'function') fbInit();
        return {};
      };
    }, { uid: uniqueUid });

    await page.waitForSelector('#loginBtn', { state: 'visible' });
    await page.click('#loginBtn');
    
    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });

  test('Create a task', async ({ page }) => {
    const taskName = `New Task ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');

    // Strict match
    const itemTitle = page.getByText(taskName, { exact: true }).first();
    await expect(itemTitle).toBeVisible();
  });

  test('Update a task', async ({ page }) => {
    const taskName = `Task to Update ${Date.now()}`;
    await page.click('#btnAdd');
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    // Strict locator
    const item = page.locator('.item').filter({ has: page.getByText(taskName, { exact: true }) }).first();
    await expect(item).toBeVisible();

    await item.hover();
    const editBtn = item.locator('.a-btn:has(svg use[href="#i-edit"])').first();
    await editBtn.click();
    
    await page.waitForSelector('#modal.open', { state: 'visible' });

    const updatedName = `${taskName} Updated`;
    await page.fill('#fT', updatedName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const updatedItemTitle = page.getByText(updatedName, { exact: true }).first();
    await expect(updatedItemTitle).toBeVisible();
  });

  test('Change status to Doing', async ({ page }) => {
    const taskName = `Task Doing ${Date.now()}`;
    await page.click('#btnAdd');
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const item = page.locator('.item').filter({ has: page.getByText(taskName, { exact: true }) }).first();
    await expect(item).toBeVisible();

    const checkbox = item.locator('.ck').first();
    await checkbox.click();
    
    const optDoing = page.locator('.st-opt[data-st="doing"]').first();
    await optDoing.click();

    await expect(checkbox).toHaveClass(/doing-st/);
  });

  test('Change status to Done', async ({ page }) => {
    const taskName = `Task Done ${Date.now()}`;
    await page.click('#btnAdd');
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const item = page.locator('.item').filter({ has: page.getByText(taskName, { exact: true }) }).first();
    await expect(item).toBeVisible();

    const checkbox = item.locator('.ck').first();
    await checkbox.click();
    
    const optDone = page.locator('.st-opt[data-st="done"]').first();
    await optDone.click();

    await expect(async () => {
      const taskHasCompleted = await item.evaluate(el => el.classList.contains('completed'));
      const ckHasOn = await checkbox.evaluate(el => el.classList.contains('on'));
      // 3. Tightened assertion: verify both conditions are strictly true
      expect(taskHasCompleted).toBe(true);
      expect(ckHasOn).toBe(true);
    }).toPass();
  });

  test('Delete a task', async ({ page }) => {
    const taskName = `Task Delete ${Date.now()}`;
    await page.click('#btnAdd');
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const item = page.locator('.item').filter({ has: page.getByText(taskName, { exact: true }) }).first();
    await expect(item).toBeVisible();

    await item.hover();
    const delBtn = item.locator('.del').first();
    await delBtn.click();
    
    const cfYes = page.locator('#cfYes');
    await cfYes.click();

    await expect(page.getByText(taskName, { exact: true })).toBeHidden();
  });
});
```

## 5. Verification Method
- Execute the Playwright tests across multiple workers using `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts --workers=4`.
- The tests should pass cleanly without flakiness or cross-talk between tests (confirming unique UIDs).
- No `firebase is not defined` errors or execution context crashes should occur (confirming SW interception works).
- Intentionally modify the app to only check the box (`ckHasOn` = true) but NOT mark the row completed (`taskHasCompleted` = false) to ensure Test 4 properly fails (confirming the tightened `expect` logic).
