# Test Strategy Fix for Feature 1 (Task Management)

## Observation
- `tests/e2e/tier1-feature/f1-task-management.spec.ts` uses a hardcoded `uid: 'mock123'` in `page.evaluate()` inside `beforeEach`, meaning parallel Playwright workers share the exact same user identity and clobber each other's live Firestore state.
- `index.html` (lines 4034, 4037) contains an aggressive Service Worker auto-update mechanism that triggers `location.reload()` upon controller change, which abruptly destroys Playwright execution contexts and wipes `beforeEach` mocks.
- Test 4 (Change status to Done) uses weak logic: `expect(taskHasCompleted || ckHasOn).toBeTruthy()`, allowing false positives if only one element updates.
- Test 1 (Create a task) uses hardcoded strings (`'New Test Task'`) instead of dynamic names.
- Task finding logic relies on loose text matching (`hasText: taskName`), which can accidentally match substrings of older/other tasks.

## Logic Chain
1. **Dynamic UIDs**: By leveraging Playwright's `testInfo` inside `beforeEach`, we can dynamically generate a unique Firebase UID: `` `mock-${testInfo.workerIndex}-${Date.now()}` ``. Injecting this via `page.evaluate` provides full data isolation across workers and parallel test runs.
2. **Blocking Service Worker Reloads**: Using `await page.route('**/sw.js', route => route.abort());` cleanly prevents the service worker from registering. Adding a supplementary `page.addInitScript()` to safely stub `location.reload` ensures that no stray scripts can force a refresh and kill the test context.
3. **Tightening Assertions**: Instead of JS `.evaluate` OR logic, we use standard Playwright assertions `await expect(item).toHaveClass(/completed/)` AND `await expect(checkbox).toHaveClass(/on/)` to strictly check both conditions.
4. **Strict Targeting**: We enforce dynamic names for all tests (e.g. `` `Test Task ${Date.now()}` ``) and exact Regex matching for locators: `.filter({ has: page.locator('.item-title', { hasText: new RegExp(`^${taskName}$`) }) })`. This guarantees we act only on the intended element.

## Caveats
- Bypassing the service worker via `page.route` means offline capabilities and caching are not tested in this file. This is acceptable for testing Task Management functionality, but a separate test suite should be created to verify offline behavior if needed.
- If Firebase rules require specific UID formats, the `mock-X-Y` pattern might fail; however, the current setup implies it accepts generic string IDs.

## Conclusion
The flakiness and loose assertions in Feature 1 are addressed. The testing strategy enforces unique per-worker test state, prevents environment reloads, tightens success criteria, and uses exact locators to manipulate tasks.

## Proposed Playwright Test Implementation

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature 1 - Task Management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // 1. Block SW and stub location.reload to prevent execution context destruction
    await page.route('**/sw.js', route => route.abort());
    await page.addInitScript(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        enumerable: true,
        value: new Proxy(window.location, {
          get: (target, prop) => {
            if (prop === 'reload') return () => console.log('location.reload blocked for testing');
            return target[prop];
          }
        })
      });
    });

    await page.goto('/');

    // 2. Inject isolated UID per test to avoid parallel execution collisions
    const dynamicUid = `mock-w${testInfo.workerIndex}-${Date.now()}`;

    await page.evaluate((uid) => {
      const authObj = firebase.auth();
      authObj.signInWithPopup = async () => {
        currentUser = { uid, displayName: 'Test Worker', email: 'worker@test.com' };
        updateSidebarUser(currentUser);
        showApp();
        if (typeof _authBooted !== 'undefined') _authBooted = true;
        if (typeof processRecurring === 'function') processRecurring();
        if (typeof setGreeting === 'function') setGreeting();
        if (typeof render === 'function') render();
        if (typeof fbInit === 'function') fbInit();
        return {};
      };
    }, dynamicUid);

    await page.waitForSelector('#loginBtn', { state: 'visible' });
    await page.click('#loginBtn');
    
    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });

  test('Create a task', async ({ page }) => {
    const taskName = `Create Test ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');

    // 3 & 4. Tightened assertions and exact match
    const itemTitle = page.locator('.item-title').filter({ hasText: new RegExp(`^${taskName}$`) }).first();
    await expect(itemTitle).toBeVisible();
  });

  test('Update a task', async ({ page }) => {
    const taskName = `Update Test ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    // Strict exact match for the parent item
    const item = page.locator('.item').filter({ has: page.locator('.item-title', { hasText: new RegExp(`^${taskName}$`) }) }).first();
    await expect(item).toBeVisible();
    await item.hover();
    
    const editBtn = item.locator('.a-btn:has(svg use[href="#i-edit"])').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    await page.waitForSelector('#modal.open', { state: 'visible' });

    const updatedName = `${taskName} Changed`;
    await page.fill('#fT', updatedName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const updatedItemTitle = page.locator('.item-title').filter({ hasText: new RegExp(`^${updatedName}$`) }).first();
    await expect(updatedItemTitle).toBeVisible();
  });

  test('Change status to Doing', async ({ page }) => {
    const taskName = `Doing Test ${Date.now()}`;
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
    const taskName = `Done Test ${Date.now()}`;
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

    // 3. Tightened AND logic for assertion
    await expect(item).toHaveClass(/completed/);
    await expect(checkbox).toHaveClass(/on/);
  });

  test('Delete a task', async ({ page }) => {
    const taskName = `Delete Test ${Date.now()}`;
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

## Verification Method
1. Replace the contents of `tests/e2e/tier1-feature/f1-task-management.spec.ts` with the proposed code block.
2. Run the test suite under parallelism: `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts --workers=4`.
3. Verify that tests pass without flakiness, Service Worker does not disconnect the Playwright execution context, and elements are targeted specifically without collision.
