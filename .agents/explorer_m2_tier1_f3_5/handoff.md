# Handoff Report: F3 Test Flakiness Fix Strategy

## 1. Observation
In `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` lines 8-12, the `test.beforeEach` block uses a DOM override to show the app shell and hide the login screen:
```typescript
      const ls = document.getElementById('loginScreen');
      if (ls) ls.style.display = 'none';
      const shell = document.querySelector('.shell') as HTMLElement;
      if (shell) shell.style.display = '';
```
In `tests/e2e/tier1-feature/f1-task-management.spec.ts` lines 7-23, the `test.beforeEach` block properly mocks Firebase Authentication by overriding `signInWithPopup`, and then triggers the login flow via `#loginBtn`:
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
```

## 2. Logic Chain
- The F3 test attempts to bypass login by directly toggling `display` styles.
- As noted in the review, this races with the app's internal Firebase Auth state (`onAuthStateChanged(null)`), which resets the app shell back to `display: none` and the login screen to `display: flex`.
- When this happens mid-test, the elements the test expects to interact with (like `#addProjBtn`) are no longer visible, causing the Playwright test to time out waiting for them.
- F1 avoids this race condition by properly injecting a mock user and simulating a successful sign-in popup. This sets up the correct internal application state (`currentUser`, etc.) and calls the app's initialization functions (`showApp`, `fbInit`, `render`), avoiding any adverse side-effects from `onAuthStateChanged(null)`.

## 3. Caveats
- `f3-categories-projects.spec.ts` also clears `localStorage` keys specific to its feature (`bt-v5`, `bt-cats`, `bt-projects`). This cleanup is important and must be preserved alongside the updated auth logic.
- We must ensure we wait for an appropriate element in the app shell to become visible after the mocked login before proceeding with F3 tests (similar to waiting for `#tasksView` in F1).

## 4. Conclusion
To fix the flakiness in `f3-categories-projects.spec.ts`, replace the fragile DOM style overrides in `test.beforeEach` with the Firebase Auth mock strategy used in `f1-task-management.spec.ts`.

**Recommended Changes to `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`**:
Update `test.beforeEach` to match this logic:
```typescript
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      // Mock Firebase Auth
      const authObj = (window as any).firebase.auth();
      authObj.signInWithPopup = async () => {
        (window as any).currentUser = { uid: 'mock123', displayName: 'Test', email: 't@t.com' };
        if (typeof (window as any).updateSidebarUser === 'function') (window as any).updateSidebarUser((window as any).currentUser);
        if (typeof (window as any).showApp === 'function') (window as any).showApp();
        if (typeof (window as any)._authBooted !== 'undefined') (window as any)._authBooted = true;
        if (typeof (window as any).processRecurring === 'function') (window as any).processRecurring();
        if (typeof (window as any).setGreeting === 'function') (window as any).setGreeting();
        if (typeof (window as any).render === 'function') (window as any).render();
        if (typeof (window as any).fbInit === 'function') (window as any).fbInit();
        return {};
      };

      // Clear local storage for fresh state
      localStorage.removeItem('bt-v5');
      localStorage.removeItem('bt-cats');
      localStorage.removeItem('bt-projects');
    });

    // Trigger Login
    await page.waitForSelector('#loginBtn', { state: 'visible' });
    await page.click('#loginBtn');

    // Wait for main app to be ready
    await page.waitForSelector('.shell', { state: 'visible' });
  });
```

## 5. Verification Method
- Make the suggested change in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`.
- Run `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts --repeat-each=10` to ensure no flakiness occurs and it passes reliably.
