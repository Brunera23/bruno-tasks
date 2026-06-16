# Handoff Report: Fix Strategy for f3-categories-projects.spec.ts

## Observation
In `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`, the `beforeEach` block (lines 4-21) forcefully alters DOM element styles to bypass the login screen:
```typescript
    await page.waitForSelector('#loginScreen');
    await page.evaluate(() => {
      const ls = document.getElementById('loginScreen');
      if (ls) ls.style.display = 'none';
      const shell = document.querySelector('.shell') as HTMLElement;
      if (shell) shell.style.display = '';
      // ...
```
This is vulnerable to a race condition with the actual Firebase authentication state observer (`auth.onAuthStateChanged`), which may eventually trigger and re-hide the app UI if it detects a logged-out state, causing flaky tests.

In `tests/e2e/tier1-feature/f1-task-management.spec.ts` (lines 4-27), the Firebase Auth API is correctly mocked by intercepting `signInWithPopup`:
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

## Logic Chain
1. The DOM hack in `f3-categories-projects.spec.ts` causes test flakiness due to racing with the application's Firebase authentication observer.
2. `f1-task-management.spec.ts` avoids this by properly mocking `firebase.auth().signInWithPopup()` to simulate a successful login, set the mocked current user, and initialize the app state smoothly.
3. By porting the mock implementation from `f1` to `f3`, we can properly trigger the login flow and initialize the app via the `#loginBtn` interaction.
4. The existing `localStorage.removeItem()` lines in `f3-categories-projects.spec.ts` must be preserved in the new `page.evaluate()` block to ensure clean state for the project/category tests.

## Caveats
No caveats. It is assumed the globals modified in the mock (`currentUser`, `updateSidebarUser`, etc.) are readily available in the browser context as they are in `f1`.

## Conclusion
The `beforeEach` hook in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` should be rewritten to mock `firebase.auth().signInWithPopup` like `f1-task-management.spec.ts`, rather than forcing DOM style changes. 

Proposed `beforeEach` replacement for `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`:
```typescript
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

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

      // Keep existing f3 cleanup
      localStorage.removeItem('bt-v5');
      localStorage.removeItem('bt-cats');
      localStorage.removeItem('bt-projects');
    });

    await page.waitForSelector('#loginBtn', { state: 'visible' });
    await page.click('#loginBtn');
    
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });
```

## Verification Method
1. Replace the `beforeEach` hook in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` with the snippet above.
2. Run the Playwright test command targeting the `f3-categories-projects.spec.ts` spec: `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts`
3. Verify that the tests pass reliably without timing out on elements like `#btnAdd`.
