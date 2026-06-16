# Handoff Report: Feature 1 Testing Strategy

## 1. Observation
- **UID Collision**: In `tests/e2e/tier1-feature/f1-task-management.spec.ts`, the `beforeEach` hook hardcodes `uid: 'mock123'`. Parallel Playwright workers use this identical UID, leading to live Firestore data collisions and flaky state between tests.
- **Service Worker Reloading**: In `index.html` (lines 4030-4040), there is logic that triggers `location.reload()` when a new Service Worker takes control (`controllerchange`) or sends a `SW_UPDATED` message. This reload unexpectedly resets the Playwright page execution context and clears `page.evaluate` mocks mid-test, leading to "element not found" errors.
- **Weak Logic (Test 4)**: The assertion for completing a task is `expect(taskHasCompleted || ckHasOn).toBeTruthy()`. This passes if only the checkbox changes state but the task itself doesn't update (or vice versa), allowing false positives.
- **Loose Matching**: The Create task test hardcodes `'New Test Task'`, meaning parallel runs could theoretically match the wrong test's task. The Update task test uses `.locator('.item', { hasText: taskName })`, which is a substring match and might capture the wrong task if names are similar.

## 2. Logic Chain
- **SW Fix**: Aborting the network request for `sw.js` using Playwright's network interception (`context.route('**/sw.js**', route => route.abort());`) will cleanly prevent the Service Worker from installing. If it never installs, `controllerchange` never fires, `location.reload()` is blocked, and the test context remains intact.
- **UID Isolation**: Dynamically generating a unique ID per test (e.g., `mock_${Date.now()}_${Math.random()}`) and passing it as an argument to `page.evaluate` in the `beforeEach` hook will ensure that each parallel test has an isolated Firestore data space.
- **Strict Matching**: Using `Date.now()` combined with `new RegExp('^' + taskName + '$')` ensures that task lookups match exact, unique task titles rather than substrings.
- **Tightened Assertions**: Splitting the OR logic in Test 4 into two separate assertions using Playwright's `toHaveClass` ensures that the UI state correctly updates in both the container and the checkbox elements.

## 3. Caveats
- Aborting the `sw.js` request means we aren't testing offline or Service Worker functionality here. This is acceptable since this suite is strictly testing Task Management (Feature 1), but SW testing would need a dedicated, isolated test file.

## 4. Conclusion
The testing strategy must update `beforeEach` to intercept and block `sw.js`, inject a unique Firebase UID, and modify the 5 existing Playwright tests to use dynamic names, strict regex text matching, and tightened boolean logic. 

**Proposed Implementation (`tests/e2e/tier1-feature/f1-task-management.spec.ts`):**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature 1 - Task Management', () => {
  test.beforeEach(async ({ page, context }) => {
    // 1. Block SW to prevent location.reload() from destroying test context
    await context.route('**/sw.js**', route => route.abort());
    
    // 2. Generate unique UID per test run to prevent parallel collisions
    const uniqueUid = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await page.goto('/');

    await page.evaluate((uid) => {
      const authObj = firebase.auth();
      authObj.signInWithPopup = async () => {
        currentUser = { uid: uid, displayName: 'Test Worker', email: 'test@worker.com' };
        updateSidebarUser(currentUser);
        showApp();
        if (typeof _authBooted !== 'undefined') _authBooted = true;
        if (typeof processRecurring === 'function') processRecurring();
        if (typeof setGreeting === 'function') setGreeting();
        if (typeof render === 'function') render();
        if (typeof fbInit === 'function') fbInit();
        return {};
      };
    }, uniqueUid);

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

    // 4. Strict exact matching using RegExp
    const itemTitle = page.locator('.item-title', { hasText: new RegExp(`^${taskName}$`) }).first();
    await expect(itemTitle).toBeVisible();
  });

  test('Update a task', async ({ page }) => {
    const taskName = `Task to Update ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    // Strict matching inside the item container
    const item = page.locator('.item').filter({ has: page.locator('.item-title', { hasText: new RegExp(`^${taskName}$`) }) }).first();
    await expect(item).toBeVisible();

    await item.hover();
    
    const editBtn = item.locator('.a-btn:has(svg use[href="#i-edit"])').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    await page.waitForSelector('#modal.open', { state: 'visible' });

    const updatedName = `${taskName} Updated`;
    await page.fill('#fT', updatedName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const updatedItemTitle = page.locator('.item-title', { hasText: new RegExp(`^${updatedName}$`) }).first();
    await expect(updatedItemTitle).toBeVisible();
  });

  test('Change status to Doing', async ({ page }) => {
    const taskName = `Task Doing ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const item = page.locator('.item').filter({ has: page.locator('.item-title', { hasText: new RegExp(`^${taskName}$`) }) }).first();
    await expect(item).toBeVisible();

    const checkbox = item.locator('.ck').first();
    await checkbox.click();
    
    const stPop = page.locator('#stPop');
    await expect(stPop).toHaveClass(/show/);
    
    const optDoing = page.locator('.st-opt[data-st="doing"]').first();
    await optDoing.click();

    await expect(checkbox).toHaveClass(/doing-st/);
  });

  test('Change status to Done', async ({ page }) => {
    const taskName = `Task Done ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const item = page.locator('.item').filter({ has: page.locator('.item-title', { hasText: new RegExp(`^${taskName}$`) }) }).first();
    await expect(item).toBeVisible();

    const checkbox = item.locator('.ck').first();
    await checkbox.click();
    
    const stPop = page.locator('#stPop');
    await expect(stPop).toHaveClass(/show/);
    
    const optDone = page.locator('.st-opt[data-st="done"]').first();
    await optDone.click();

    // 3. Tightened logic: Both assertions MUST be strictly validated (no OR)
    await expect(item).toHaveClass(/completed/);
    await expect(checkbox).toHaveClass(/on/);
  });

  test('Delete a task', async ({ page }) => {
    const taskName = `Task Delete ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const item = page.locator('.item').filter({ has: page.locator('.item-title', { hasText: new RegExp(`^${taskName}$`) }) }).first();
    await expect(item).toBeVisible();

    await item.hover();

    const delBtn = item.locator('.del').first();
    await delBtn.click();
    
    const cfWrap = page.locator('#cfWrap');
    await expect(cfWrap).toHaveClass(/open|show/);
    
    const cfYes = page.locator('#cfYes');
    await cfYes.click();

    await expect(item).toBeHidden();
  });
});
```

## 5. Verification Method
1. Replace the contents of `tests/e2e/tier1-feature/f1-task-management.spec.ts` with the proposed implementation.
2. Run `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts`.
3. Verify that all 5 tests pass successfully without "element(s) not found" flakiness.
