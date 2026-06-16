# Handoff Report: Widget Panel Rendering Tests (Feature 6)

## 1. Observation
- The previous Playwright tests (e.g., `tests/e2e/tier1-feature/f6-widget-panel-rendering.spec.ts`) bypassed the Firebase authentication improperly by injecting CSS (`.login-screen { display: none !important }`) and executing `window.render()` manually.
- The app's logic in `index.html` implements login via `firebase.auth().signInWithPopup()` and state changes via `firebase.auth().onAuthStateChanged()`.
- The application automatically calls its own initialization functions (`processRecurring()`, `showApp()`, `render()`, `fbInit()`) completely natively whenever a valid user is provided to `onAuthStateChanged()`.
- The user requested excluding the flaky Drag and Drop test and mandated using web-first reactive waiting instead of brittle `waitForTimeout`.

## 2. Logic Chain
- **Authentic Setup Strategy**: Since Playwright does not natively support capturing Firebase's IndexedDB auth state via standard `storageState`, the most robust "standard test state" strategy is to mock the global `firebase.auth()` behavior before the page scripts load, using `page.addInitScript`. By intercepting `firebase.auth()` so that `onAuthStateChanged` instantly triggers with a mock user object, the application will *authentically* hide the login screen and fully boot up on its own. No CSS injection or manual `render()` calls are needed.
- **Reactive Waiting**: Instead of using `waitForTimeout(600)` to wait for animations, tests should wait for specific DOM state changes, e.g., `await expect(panel).toHaveClass(/open/)` or `await expect(widget).toHaveClass(/compact/)`, relying on Playwright's built-in retrying assertions.
- **Test Cases**: To reach the required 5 distinct Tier 1 test cases while excluding Drag and Drop, the proposed suite covers core features: Panel Visibility Toggling, Widget Expand/Collapse, Widget State Persistence across reloads, Widget Context Filtering, and Week Widget Day Filter. 

## 3. Caveats
- The Firebase SDK is loaded synchronously via `<script>` tags, so the `addInitScript` defines a getter/setter on `window.firebase` to seamlessly intercept the `.auth()` method precisely when the `firebase-app-compat.js` script assigns it.
- The "State Persistence" test case requires a `page.reload()`, so the mock login injected via `addInitScript` will execute again cleanly, persisting the mocked authentication naturally.

## 4. Conclusion
**Proposed Setup Strategy:**
```typescript
test.beforeEach(async ({ page }) => {
  // Use addInitScript to establish a standard test state authentically
  await page.addInitScript(() => {
    let fb;
    Object.defineProperty(window, 'firebase', {
      get: () => fb,
      set: (v) => {
        fb = v;
        const origAuth = fb.auth;
        fb.auth = function() {
          const authObj = origAuth.apply(this, arguments);
          authObj.onAuthStateChanged = (cb) => {
            // Authentically trigger the app boot sequence
            cb({ uid: 'playwright-test', email: 'test@example.com', displayName: 'Test User' });
            return () => {};
          };
          return authObj;
        };
        fb.auth.GoogleAuthProvider = origAuth.GoogleAuthProvider;
      }
    });
  });
  
  await page.goto('/');
  
  // Wait for the app to authentically render the main shell (no CSS hacks)
  await expect(page.locator('.shell')).toBeVisible();
});
```

**Proposed 5 Tier 1 Test Cases (Feature 6):**
1. **Toggle Widget Panel Visibility**: Action: Click `#wkToggle`. Assertion: Expect `#wdgPanel` to dynamically receive the `.open` class. Action: Click again. Assertion: Expect `.open` class to be removed.
2. **Expand and Collapse a Widget Card**: Action: Click the header (`[data-wdg-expand="foco"]`) of the "Foco do Dia" widget. Assertion: Expect the widget locator to have the `.compact` class. Action: Click again. Assertion: Expect `.compact` to be removed.
3. **Widget State Persistence on Reload**: Action: Collapse a widget (e.g., "Próximas Prioridades"). Action: Reload the page (`await page.reload()`) and open the panel. Assertion: Verify the widget remains collapsed, verifying standard DOM API `localStorage` integration.
4. **Filter Tasks by Widget Context**: Action: Click the filter button (`[data-wdg-filter="next"]`) on the "Próximas Prioridades" widget. Assertion: Verify the main page title `#pageTitle` changes to "Próximas Prioridades", and the clear button `.wdg-filter-x` becomes visible.
5. **Week Widget Specific Filtering**: Action: Click the current day element (`.wk-day.is-today`) specifically within the Week widget. Assertion: Verify the main page title `#pageTitle` updates to "Hoje" and the `.wdg-filter-x` clear filter button appears.

## 5. Verification Method
1. The implementer writes the Playwright test using the proposed suite in `tests/e2e/tier1-feature/f6-widget-panel-rendering.spec.ts`.
2. Run `npx playwright test tests/e2e/tier1-feature/f6-widget-panel-rendering.spec.ts`.
3. Success conditions: The tests authenticate purely without CSS/DOM injection, execute smoothly without `waitForTimeout` calls, and specifically cover the 5 Tier 1 behaviors while entirely avoiding Drag and Drop.
