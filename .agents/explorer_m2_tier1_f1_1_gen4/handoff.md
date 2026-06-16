# Handoff Report: Feature 1 Testing Strategy

## Observation
1. The tests for Feature 1 (Iter 3) failed with the Reviewer gate.
   - **Flakiness error**: `TypeError: Cannot read properties of undefined (reading 'auth')` indicating `firebase.auth()` is evaluated before `window.firebase` is defined.
   - **Integrity violation**: The previous test `f1-task-management.spec.ts` bypassed the native application lifecycle by explicitly overriding `signInWithPopup` and manually invoking internal UI functions like `(window as any).showApp()`, `(window as any).render()`, etc., directly circumventing opaque-box testing constraints.
2. In `tests/e2e/tier1-feature/f6-widget-panel-rendering.spec.ts` (Lines 8-38), a similar issue was correctly solved by using `page.addInitScript()` to safely intercept `window.firebase` using `Object.defineProperty`. This allows mocking `firebase.auth().onAuthStateChanged` transparently.
3. In `index.html` (Line 1735, `auth.onAuthStateChanged(user=>{`) and (Line 4161, `// Boot is now handled by auth.onAuthStateChanged`), the application boots itself asynchronously relying solely on the native `onAuthStateChanged` observer firing.

## Logic Chain
1. Since the application natively waits for `auth.onAuthStateChanged` to boot (`showApp`, `render`), manually invoking these functions violates opaque-box testing because real users do not trigger these internal state methods.
2. Because `window.firebase` might not exist immediately at script execution time, we cannot simply reassign `window.firebase.auth`. Instead, using `Object.defineProperty` on `window` inside `page.addInitScript()` safely intercepts when the app script assigns `firebase`.
3. By setting up `onAuthStateChanged` to automatically execute its callback with a mocked user (with a slight delay via `setTimeout` to allow the app's internal variables to initialize synchronously), the app's own listener handles the login transition naturally. The test remains truly end-to-end and opaque-box compliant.
4. Providing `testInfo.workerIndex` coupled with `Date.now()` within the `addInitScript` string prevents state leakage across tests and ensures the database operations correctly use dynamic UIDs. The Service worker block, exact text matching, and dual state assertion are maintained from the previous test iteration.

## Caveats
- It is assumed that the DOM identifiers (`#btnAdd`, `#modal.open`, etc.) remain identical to the previous implementation.
- It is assumed that the 10ms `setTimeout` in the `addInitScript` mock is sufficient for all internal synchronous boot setups (e.g., variable declarations) within `index.html`.

## Conclusion
The application's authentic boot lifecycle must be preserved by mocking `onAuthStateChanged` using an injected script to intercept `window.firebase` definition.

### Proposed Setup and Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature 1 - Task Management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // 1. Service Worker Block
    await page.route('**/sw.js**', route => route.abort());

    // 2. Dynamic UID
    const uniqueUid = \`mock-\${testInfo.workerIndex}-\${Date.now()}\`;

    // 3. Clean mock of firebase.auth() using addInitScript to trigger onAuthStateChanged naturally
    await page.addInitScript(\`
      const uniqueUid = "\${uniqueUid}";
      let fb;
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
                authObj.onAuthStateChanged = (cb) => {
                  setTimeout(() => {
                    cb({ uid: uniqueUid, email: 'test@example.com', displayName: 'Test User' });
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
    \`);

    await page.goto('/');

    // Wait for native app boot via onAuthStateChanged without calling showApp()/render() manually
    await expect(page.locator('.shell')).toBeVisible();
    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });

  test('Create a task', async ({ page }) => {
    const taskName = \`Task Create \${Date.now()}\`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');

    const itemTitle = page.getByText(taskName, { exact: true });
    await expect(itemTitle).toBeVisible();
  });

  test('Update a task', async ({ page }) => {
    const taskName = \`Task Update \${Date.now()}\`;
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

    const updatedName = \`\${taskName} Updated\`;
    await page.fill('#fT', updatedName);
    await page.click('#form button[type="submit"]');
    await page.waitForSelector('#modal.open', { state: 'hidden' });

    const updatedItemTitle = page.getByText(updatedName, { exact: true });
    await expect(updatedItemTitle).toBeVisible();
  });

  test('Change status to Doing', async ({ page }) => {
    const taskName = \`Task Doing \${Date.now()}\`;
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
    const taskName = \`Task Done \${Date.now()}\`;
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
    const taskName = \`Task Delete \${Date.now()}\`;
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

## Verification Method
1. Write the proposed tests into `tests/e2e/tier1-feature/f1-task-management.spec.ts`.
2. Run `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts`.
3. Verify that the `.shell` application interface becomes visible naturally on boot without throwing a `TypeError: Cannot read properties of undefined (reading 'auth')`.
4. Ensure the opaque-box test constraints pass (no direct DOM property overriding or app internal function manipulation).
