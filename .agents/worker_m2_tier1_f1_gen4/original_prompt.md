## 2026-06-05T22:46:45-03:00
Your working directory is c:\Users\Bruno\Desktop\activities tracker\.agents\worker_m2_tier1_f1_gen4.
Your task: Implement exactly 5 Playwright test cases covering Feature 1 (Task Management - CRUD, Status) for Tier 1 in `tests/e2e/tier1-feature/f1-task-management.spec.ts`.

In the previous iteration, tests failed due to Firebase mock flakiness and an opaque-box violation (calling internal functions).
Implement these specific fixes proposed by the Explorers:
1. Use `page.addInitScript()` to cleanly mock `firebase.auth().onAuthStateChanged` before the page loads. The mock should immediately trigger the callback with a mock user (e.g. `{ uid: uniqueUid, displayName: 'Test', email: 't@t.com' }`). This forces the app to boot natively via its own listeners WITHOUT manually calling `showApp()`, `render()`, etc.
2. Keep blocking the Service Worker: `await page.route('**/sw.js**', route => route.abort());`
3. Keep unique Firebase auth UIDs per test using `testInfo`.
4. Keep tightened assertions for Test 4: `expect(taskHasCompleted).toBe(true); expect(ckHasOn).toBe(true);`
5. Keep dynamic task names and strict locators `getByText(taskName, { exact: true })`.
6. Keep native hover interactions `item.hover()` to reveal action buttons before clicking natively. DO NOT use `.evaluate(b => b.click())`.

The 5 tests: Create, Update, Change to Doing, Change to Done, Delete.

- Run `npx playwright test tests/e2e/tier1-feature/f1-task-management.spec.ts --workers=3`.
- Ensure they pass flawlessly without flakiness.
- Write your handoff report to handoff.md in your working directory and send a message back to me when done.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT circumvent the intended task. A Forensic Auditor will independently verify your work.
