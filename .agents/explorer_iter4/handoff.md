# Handoff Report: F3 Tier 1 Tests Integrity Violations

## Observation
The F3 tests (`tests/e2e/tier1-feature/f3-categories-projects.spec.ts`) suffer from two main integrity violations:
1. The test uses `page.evaluate` to manually override internal state (`tasks`, `cats`, `projects`) and invokes internal lifecycle methods (`updateSidebarUser`, `showApp`, `render`).
2. A DOM cheat (`fmWrap` injected into the test's `page.evaluate` block) is used to bypass a genuine application null reference bug.

Through source code exploration:
- `index.html` initializes the app using `firebase.auth().onAuthStateChanged`. The proper way to authenticate an opaque-box E2E test without manual global variable override is to mock `firebase.auth().onAuthStateChanged` using `page.addInitScript()`.
- Default values for projects (`DEF_PROJECTS`) and categories (`DEF_CATS`) are handled automatically by `index.html`. For F3 tests, no manual overrides in `tasks`, `cats`, or `projects` are necessary if we use a clean LocalStorage and mock Firestore adequately.
- The `fmWrap` bug in `index.html` was already fixed in a previous iteration (the obsolete ID is no longer queried inside `switchView`).

## Logic Chain
1. To address the first integrity violation (white-box overrides), we must drop the `page.evaluate` block from `beforeEach`.
2. The application expects `firebase.auth().onAuthStateChanged` to resolve with a user object. A transparent hook applied via `page.addInitScript()` before the app scripts execute will properly mimic Firebase behavior. This forces the application to load `showApp()` natively.
3. The application attempts to load data from Firestore after logging in. Mocking `firebase.firestore().collection().doc().onSnapshot()` via `page.addInitScript()` ensures the application's natural sync process executes completely, fetching `tasks`, `cats`, and `projects` through its natural API layer.
4. To address the second integrity violation (DOM cheat), we must remove the `fmWrap` element injection entirely from the test suite. The underlying issue in `index.html` was previously addressed, so the test should run cleanly.

## Caveats
- No caveats. The F6 tests already successfully apply an authentic Firestore mock. We can replicate its `addInitScript` pattern.

## Conclusion
We need to refactor `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`'s `beforeEach` hook. We must replace the hacky `page.evaluate()` block with an authentic setup using `page.addInitScript()`.

## Actionable Steps for the Worker
1. Edit `tests/e2e/tier1-feature/f3-categories-projects.spec.ts`.
2. Delete the `page.evaluate` block that modifies global variables and injects `#fmWrap`.
3. Add a `page.addInitScript()` block to establish a clean, standard test state. Mock the `firebase` object to handle authentication and Firestore `onSnapshot`.
4. Ensure the mocked Firebase Firestore returns `DEF_CATS` and `DEF_PROJECTS` correctly so the application can render them autonomously.

**Verification Method**:
Run the tests locally: `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts`. Verify no global state mutations occur inside `page.evaluate()`.
