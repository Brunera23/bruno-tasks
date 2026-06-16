# Handoff Report

## 1. Observation
- Target File: `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`
- Line 4-60: The `beforeEach` hook intercepts and aborts service worker requests (`await page.route('**/*sw.js*', route => route.abort());`) at line 5, which satisfies Reviewer 4's feedback.
- Inside `beforeEach`, `page.evaluate(...)` is used to mock initial state (`tasks`, `cats`, `projects`, `curView = 'tasks'`), but it does not clear `localStorage`. 
- Reviewer 3 noted that shared `localStorage` in the Playwright worker leaks UI state between tests, requiring isolation.

## 2. Logic Chain
1. Playwright workers can share browser context, meaning `localStorage` persists between tests within the same worker.
2. If a previous test modified the view state or local storage (e.g., saving a different active tab/project), the mock variable assignment `curView = 'tasks'` in `page.evaluate()` might be overridden when the app initializes and reads from `localStorage`.
3. To resolve this (Reviewer 3's feedback), we must clear `localStorage` prior to injecting our test state, or explicitly invoke `switchView('tasks')`.
4. Reviewer 4's feedback about the service worker is already partially present (`await page.route(...)`), but we must ensure it remains in the `beforeEach` as part of the integrated fix.

## 3. Caveats
- `localStorage.clear()` must be executed *after* navigating to the page origin (i.e. after `await page.goto('/')`), otherwise it will throw an error since `localStorage` is inaccessible on `about:blank`.
- The fix is strictly contained to `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`.

## 4. Conclusion
**Proposed Fix Strategy for `beforeEach` in `f3-categories-projects.spec.ts`:**
1. **Maintain Reviewer 4's fix:** Ensure `await page.route('**/*sw.js*', route => route.abort());` stays as the first line of the `beforeEach` hook (before `page.goto('/')`).
2. **Implement Reviewer 3's fix:** Immediately after `page.goto('/')`, run a new `await page.evaluate(() => localStorage.clear());` (or add `localStorage.clear();` as the first line inside the existing `page.evaluate` block starting at line 8).
3. **Double Isolation:** Also explicitly call `if (typeof switchView === 'function') switchView('tasks');` inside the `page.evaluate` block alongside the `render()` call to guarantee the view is correctly set.

**Proposed code snippet for `beforeEach`:**
```typescript
  test.beforeEach(async ({ page }) => {
    // 1. Abort service worker (Reviewer 4)
    await page.route('**/*sw.js*', route => route.abort());
    await page.goto('/');

    // 2. Clear localStorage to prevent state leakage (Reviewer 3)
    await page.evaluate(() => {
      localStorage.clear();
      
      // @ts-ignore
      tasks = [];
      // ... (existing mock data) ...
      // @ts-ignore
      curView = 'tasks'; aCat = 'all'; aSt = 'all'; showDone = false; activeProject = 'all';
      
      // @ts-ignore
      if (typeof saveUI === 'function') saveUI();
      // @ts-ignore
      if (typeof render === 'function') render();
      // @ts-ignore
      if (typeof switchView === 'function') switchView('tasks');
      
      // ... (existing auth mock) ...
    });
    // ... (rest of beforeEach)
  });
```

## 5. Verification Method
- **Inspection:** Verify that `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` incorporates both the `route.abort()` for `sw.js` and `localStorage.clear()` + `switchView('tasks')` in its `beforeEach` hook.
- **Testing:** Run the specific test file using Playwright: `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts`. The tests should pass reliably without state bleeding across TC1 to TC5.
