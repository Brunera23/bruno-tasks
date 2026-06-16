# Observation
In `tests/e2e/tier1-feature/f1-task-management.spec.ts`, Firebase Auth is mocked correctly within `test.beforeEach` by overriding `firebase.auth().signInWithPopup`. It sets a mock `currentUser`, calls `showApp()`, updates the UI, and initializes variables:
```typescript
    await page.evaluate(() => {
      const authObj = firebase.auth();
      authObj.signInWithPopup = async () => {
        currentUser = { uid: 'mock123', displayName: 'Test', email: 't@t.com' };
        updateSidebarUser(currentUser);
        showApp();
        if (typeof _authBooted !== 'undefined') _authBooted = true;
        if (typeof processRecurring === 'function') processRecurring();
        if (typeof setGreeting === 'function') setGreeting();
        if (typeof render === 'function') render();
        if (typeof fbInit === 'function') fbInit();
        return {};
      };
    });

    await page.waitForSelector('#loginBtn', { state: 'visible' });
    await page.click('#loginBtn');
    
    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
```

Conversely, in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`, the `test.beforeEach` block attempts to manually modify DOM elements:
```typescript
    await page.waitForSelector('#loginScreen');
    await page.evaluate(() => {
      const ls = document.getElementById('loginScreen');
      if (ls) ls.style.display = 'none';
      const shell = document.querySelector('.shell') as HTMLElement;
      if (shell) shell.style.display = '';
      
      localStorage.removeItem('bt-v5');
      // ... (other local storage resets)
      if (typeof (window as any).render === 'function') (window as any).render();
      if (typeof (window as any).renderSidebar === 'function') (window as any).renderSidebar();
    });
```
This fails when `auth.onAuthStateChanged(null)` fires asynchronously and overrides the forced inline styles.

# Logic Chain
1. The manual DOM manipulation in `f3-categories-projects.spec.ts` causes test flakiness due to the race condition with the actual auth state listener resetting the UI.
2. The `f1-task-management.spec.ts` test demonstrates a successful pattern by modifying `firebase.auth().signInWithPopup()` to execute initialization functions synchronously upon logging in and then simulating a click on the login button.
3. Replacing the DOM hacks in `f3-categories-projects.spec.ts` with the pattern established in `f1-task-management.spec.ts` will resolve the race condition. We also should retain the `localStorage.removeItem` cleanup since f3 relies on a fresh project/category state.

# Caveats
No caveats. The fix aligns exactly with reviewer feedback and existing working test patterns.

# Conclusion
The `beforeEach` block in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` must be updated to use the mock Firebase Auth approach instead of forcing DOM elements to hide/show.

**Proposed Strategy for `f3-categories-projects.spec.ts`:**
```typescript
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      // Retain the localStorage cleanup needed for Feature 3 tests
      localStorage.removeItem('bt-v5');
      localStorage.removeItem('bt-cats');
      localStorage.removeItem('bt-projects');

      // Use the proper Firebase Auth mock from f1
      const authObj = firebase.auth();
      authObj.signInWithPopup = async () => {
        currentUser = { uid: 'mock123', displayName: 'Test', email: 't@t.com' };
        updateSidebarUser(currentUser);
        showApp();
        if (typeof _authBooted !== 'undefined') _authBooted = true;
        if (typeof processRecurring === 'function') processRecurring();
        if (typeof setGreeting === 'function') setGreeting();
        if (typeof render === 'function') render();
        if (typeof fbInit === 'function') fbInit();
        return {};
      };
    });

    await page.waitForSelector('#loginBtn', { state: 'visible' });
    await page.click('#loginBtn');
    
    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });
```

# Verification Method
Run the Playwright test using `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts`. The flaky timeouts at `#btnAdd` and other interactive elements will not occur.
