# F3 Tier 1 Test Fix Strategy

## Observation
- The F3 Tier 1 test (`tests/e2e/tier1-feature/f3-categories-projects.spec.ts`) was using `test.beforeEach` to bypass normal execution flow by directly calling `switchView('tasks')`, `updateSidebarUser()`, and mutating variables like `tasks`, `cats`, `projects`.
- This violated the opaque-box test requirement by bypassing `auth.onAuthStateChanged`.
- The test previously injected `<div id="fmWrap"></div>` because of a bypass calling `switchView()` too early (or masking a bug that doesn't actually exist during normal initialization).

## Logic Chain
- To fix this and maintain opaque-box testing, we can use `page.addInitScript()` to mock the `firebase` network object before the app loads. This is what's used in `f1-task-management.spec.ts`.
- Instead of setting variables `cats` and `projects`, we return them via the mocked `firestore` response for `doc().get()` and `doc().onSnapshot()`:
  `data: () => ({ tasks: "[]", cats: catsJson, log: "[]", projects: projectsJson })`
- We also mock `firebase.auth().onAuthStateChanged` to automatically yield the mock user, triggering the application's natural lifecycle (`updateSidebarUser`, `showApp`, etc).
- By replacing the manual variable mutations with this `addInitScript` mock, the application bootstraps itself properly without throwing exceptions, and the `#fmWrap` injection hack becomes unnecessary.

## Caveats
- Playwright intercepts `**.gstatic.com**` and `**/sw.js*` to avoid offline caching and real Firebase loads. This ensures tests are stable.

## Conclusion
- The test was successfully modified locally and verified to pass. The exact changes involve replacing the entire white-box `page.evaluate()` block with an `addInitScript` block that creates `mockFb`, feeding `initialCats` and `initialProjects` as JSON payload.

## Verification Method
- Ensure the diff for `tests/e2e/tier1-feature/f3-categories-projects.spec.ts` removes all `localStorage.clear()`, `// @ts-ignore` overrides, `switchView` calls, and `$('#fmWrap')` injections.
- Run `npx playwright test tests/e2e/tier1-feature/f3-categories-projects.spec.ts`.
- All 5 test cases will pass.
