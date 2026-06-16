# Analysis Report: Playwright Test Strategy for Feature 1 (Task Management)

## Observation
- The previous implementation of `f1-task-management.spec.ts` caused flakiness with `TypeError: Cannot read properties of undefined (reading 'auth')` because it tried to access `firebase.auth()` inside `page.evaluate()` before the Firebase SDK had finished loading and initialized the global `firebase` object.
- The previous implementation also violated the opaque-box testing requirement by manually overwriting `signInWithPopup` and invoking internal application functions like `showApp()`, `render()`, `processRecurring()`, and `fbInit()`.
- The application's `index.html` natively handles initialization inside `auth.onAuthStateChanged(user => { ... })`. When a valid user is provided to this callback, the application automatically populates internal variables, removes the login screen, and renders the app shell natively.
- Another test, `f6-widget-panel-rendering.spec.ts`, successfully mocks Firebase by using `page.addInitScript()` to intercept the `window.firebase` setter. It wraps the `firebase.auth` function so that `onAuthStateChanged` resolves with a mock user after a `10ms` timeout, natively booting the app.

## Logic Chain
1. To solve the `firebase.auth()` undefined error, the test must intercept the `firebase` object the moment it is created on the window, rather than waiting for page load. `page.addInitScript()` executes before the page's scripts, allowing us to safely define a setter for `window.firebase`.
2. To satisfy the opaque-box and integrity requirements, the test must not manually invoke `render()` or `showApp()`. Instead, it should let the application's natural lifecycle handle the boot sequence.
3. By overriding `firebase.auth().onAuthStateChanged` within the `addInitScript` block to return a valid user, the application will naturally observe the authenticated state, configure itself, and render the `.shell` without any manual DOM or function manipulation.
4. The 5 test cases from Iteration 3 already include the requested fixes: dynamic UIDs (using `workerIndex` and `Date.now()`), Service Worker blocking (`page.route('**/sw.js**', ...)`), exact string matching (`exact: true`), and dual state assertion for 'Done'. We only need to replace the `beforeEach` block with the `addInitScript` approach.

## Caveats
- Bypassing the login button entirely means the `signInWithPopup` logic isn't explicitly tested. However, since the goal is to test Feature 1 (Task Management) in a standard authenticated state, bypassing the login button via native auth state mocking is standard practice for E2E testing.
- The `10ms` timeout in the mock is necessary to allow the application to complete synchronous setup before the callback is triggered, avoiding race conditions with undefined internal state variables.

## Conclusion
The test strategy should use `page.addInitScript` to intercept the `window.firebase` object and mock `onAuthStateChanged` so that it returns a valid user object with a dynamic UID. This natively boots the app, satisfying both flakiness and integrity requirements. The existing 5 test cases will work cleanly on top of this authentic boot sequence.

## Verification Method
Apply the proposed `beforeEach` to `f1-task-management.spec.ts`, then run:
`npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts`
The tests should pass without `auth` undefined errors and without needing to click `#loginBtn` or manually call `render()`.

## Proposed Code Structure (Feature 1 - Task Management)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature 1 - Task Management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // 1. Block Service Worker to ensure fresh network requests
    await page.route('**/sw.js**', route => route.abort());

    // 2. Dynamic UID to prevent cross-test state bleed
    const uniqueUid = `mock-${testInfo.workerIndex}-${Date.now()}`;

    // 3. Cleanly mock firebase.auth() before the page loads
    await page.addInitScript((uid) => {
      let fb: any;
      Object.defineProperty(window, 'firebase', {
        get: () => fb,
        set: (v) => {
          fb = v;
          let authFn = fb.auth;
          Object.defineProperty(fb, 'auth', {
            get: () => {
              if (!authFn) return undefined;
              const mockedAuth = function() {
                const authObj = authFn.apply(this, arguments);
                authObj.onAuthStateChanged = (cb: any) => {
                  setTimeout(() => {
                    cb({ uid: uid, email: 't@t.com', displayName: 'Test User' });
                  }, 10);
                  return () => {};
                };
                return authObj;
              };
              mockedAuth.GoogleAuthProvider = authFn.GoogleAuthProvider;
              return mockedAuth;
            },
            set: (val) => {
              authFn = val;
            }
          });
        }
      });
    }, uniqueUid);

    await page.goto('/');

    // Wait for the app to naturally boot and display the main shell
    await expect(page.locator('.shell')).toBeVisible();
    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });

  test('Create a task', async ({ page }) => {
    const taskName = `Task Create ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();
  });

  test('Update a task', async ({ page }) => {
    const taskName = `Task Update ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();

    const item = page.locator('.item').filter({ has: itemTitle });
    await item.hover();
    
    const editBtn = item.locator('.a-btn:has(svg use[href="#i-edit"])').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    await page.waitForSelector('#modal.open', { state: 'visible' });

    const updatedName = `${taskName} Updated`;
    await page.fill('#fT', updatedName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const updatedItemTitle = page.getByText(updatedName, { exact: true });
    await expect(updatedItemTitle).toBeVisible();
  });

  test('Change status to Doing', async ({ page }) => {
    const taskName = `Task Doing ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();

    const item = page.locator('.item').filter({ has: itemTitle });
    const checkbox = item.locator('.ck').first();
    
    await item.hover();
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

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();

    const item = page.locator('.item').filter({ has: itemTitle });
    const checkbox = item.locator('.ck').first();
    
    await item.hover();
    await checkbox.click();
    
    const stPop = page.locator('#stPop');
    await expect(stPop).toHaveClass(/show/);
    
    const optDone = page.locator('.st-opt[data-st="done"]').first();
    await optDone.click();

    await expect(async () => {
      const taskHasCompleted = await item.evaluate(el => el.classList.contains('completed'));
      const ckHasOn = await checkbox.evaluate(el => el.classList.contains('on'));
      expect(taskHasCompleted).toBe(true);
      expect(ckHasOn).toBe(true);
    }).toPass();
  });

  test('Delete a task', async ({ page }) => {
    const taskName = `Task Delete ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();

    const item = page.locator('.item').filter({ has: itemTitle });
    await item.hover();

    const delBtn = item.locator('.del').first();
    await expect(delBtn).toBeVisible();
    await delBtn.click();
    
    const cfWrap = page.locator('#cfWrap');
    await expect(cfWrap).toHaveClass(/open|show/);
    
    const cfYes = page.locator('#cfYes');
    await cfYes.click();

    await expect(itemTitle).toBeHidden();
  });
});
```
