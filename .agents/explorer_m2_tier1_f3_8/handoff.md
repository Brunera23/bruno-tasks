# Handoff Report

## 1. Observation
- **Reviewer 3** reported that `localStorage` state is leaking between tests in the Playwright worker, which affects UI state isolation. They suggested clearing `localStorage` (via `await page.evaluate(() => localStorage.clear());`) or explicitly calling `switchView('tasks')` in the `beforeEach` hook.
- **Reviewer 4** reported that the service worker (`sw.js`) unexpectedly triggers `location.reload()` during tests and recommended aborting its route.
- Inspecting `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` (lines 4-8), we can see that the service worker abort is **already present** at line 5: `await page.route('**/*sw.js*', route => route.abort());`. However, `localStorage` is not being cleared.

## 2. Logic Chain
- Playwright workers can sometimes persist `localStorage` between test runs, meaning the UI state left by TC1 could affect TC2.
- Clearing the `localStorage` ensures that the app boots into its default pristine state for every test, guaranteeing isolation.
- The `localStorage.clear()` must be executed after `await page.goto('/')` because `localStorage` is bound to the page's origin. Trying to clear it before navigating might not clear the correct origin's storage.
- The service worker abort prevents background caching/reloads that can disrupt the DOM and test flow. Keeping it is necessary to fulfill Reviewer 4's requirement.

## 3. Caveats
- No caveats. The strategy is straightforward and relies on standard Playwright state isolation practices.

## 4. Conclusion
The fix strategy for the `beforeEach` hook in `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` is to retain the existing service worker route abort and add the `localStorage.clear()` right after page navigation.

**Proposed Structure for `beforeEach`:**
```typescript
  test.beforeEach(async ({ page }) => {
    // 1. Abort service worker to prevent unexpected reloads (Reviewer 4 fix)
    await page.route('**/*sw.js*', route => route.abort());
    
    // 2. Navigate to the app to set the origin
    await page.goto('/');

    // 3. Clear localStorage to prevent UI state leaks (Reviewer 3 fix)
    await page.evaluate(() => localStorage.clear());

    // 4. Proceed with the existing mock data injection and setup
    await page.evaluate(() => { ... });
```

## 5. Verification Method
1. Implement the strategy by adding the `localStorage.clear()` line.
2. Run the specific test file: `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts`.
3. Verify that all 5 tests (TC1 to TC5) pass successfully.
4. Run the tests multiple times in sequence or with `--repeat-each=3` to ensure that there is no flakiness caused by state leakage or service worker reloads.
