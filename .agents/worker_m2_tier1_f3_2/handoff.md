# Handoff Report: Fix f3 test flakiness

## Observation
- The Playwright tests for `f3-categories-projects.spec.ts` were intermittently failing, primarily timing out on `.item` visibility or `#loginBtn` visibility.
- Initial replacement of `shell.style.display` with a proper Firebase `signInWithPopup` mock introduced new race conditions: Firebase's real `onAuthStateChanged` fired asynchronously because `page.evaluate` runs after `app.js` initializes Firebase from IndexedDB.
- Tests also leaked state through `localStorage`, meaning `bt-ui`, `bt-cats`, and `bt-projects` were bleeding into subsequent test runs within the same worker context, causing tasks to be incorrectly hidden if a previous test toggled visibility.

## Logic Chain
- Since tests share a Playwright worker context, `goto('/')` restores `localStorage`. But clearing `localStorage` inside `page.evaluate` happens *after* `app.js` has already loaded the leaked state into JS variables (e.g., `curView`, `tasks`, `projects`).
- To fully isolate tests without racing the DOM, we must force the global JS variables back to their default state inside `page.evaluate` and intentionally skip the `fbInit()` call so Firebase doesn't asynchronously overwrite our local `tasks` array via `onSnapshot`.
- Additionally, because the browser might retain the Firebase Auth IndexedDB session between test runs, `#loginBtn` could be hidden immediately (auto-login) or could wait for `onAuthStateChanged(null)` to be shown. Waiting for *either* `#loginBtn` or `#tasksView` safely resolves the initial page auth state without timing out.

## Caveats
- Firebase sync (`fbInit()`) is completely bypassed in this specific test suite. This guarantees test stability by relying purely on the DOM and local variables, which is sufficient since the test focuses on UI functionality (Categories and Projects) rather than real network sync.
- The `Date.now()` suffix is still appended to task and project names to prevent cross-test ID collision.

## Conclusion
- The test flakiness has been completely resolved. The suite successfully logs in (or auto-bypasses login), clears the JS state cleanly before each run, and isolates data so test cases no longer interfere with each other or timeout due to UI rendering races.

## Verification Method
- Run `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts` 
- Expect 5 tests to pass consistently within ~6 seconds.
