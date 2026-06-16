# Milestone 1: Test Infra Setup - Challenge Report

## 1. Observation
- `playwright.config.ts` includes a `webServer` configuration block using the command `npx http-server -p 8080` and pointing Playwright to `port: 8080` and `baseURL: 'http://localhost:8080'`.
- Running `npx playwright test` successfully executes the test.
- The console output during the test run displays `[WebServer]` logs (e.g., `[WebServer] (node:62768) [DEP0066] DeprecationWarning: ...`), which confirms that Playwright spawns the `http-server` process.
- The test `dummy.spec.ts` executes `await page.goto('/')` and passes. Playwright natively waits for the web server to start accepting connections on the specified port before navigating.

## 2. Logic Chain
- The presence of `[WebServer]` in the test output explicitly proves that the `webServer` command configured in `playwright.config.ts` was executed.
- Because Playwright awaits the `port: 8080` availability, the test `page.goto('/')` succeeding and the test passing indicates that `http-server` successfully bound to port 8080 and responded to HTTP requests.
- Since `http-server` returns a 200 OK for the existing `index.html` at the project root, the `goto` completes without throwing a navigation error, further validating that the local server works properly in tandem with the test framework.

## 3. Caveats
- The dummy test only navigates to `/` and asserts `expect(true).toBeTruthy()`. It proves that the server boots and is reachable, but does not yet assert on the DOM content of `index.html`. This is expected given the scope of simply setting up test infrastructure.
- We rely on `http-server` being fast enough to boot before Playwright times out, which is generally not an issue for local development but may fluctuate in resource-constrained CI environments.

## 4. Conclusion
- The test infrastructure for Milestone 1 is functionally correct. Running the Playwright test empirically boots the local `http-server` and correctly resolves the base URL, fulfilling the requirements of the milestone.

## 5. Verification Method
- Execute `npx playwright test` from the workspace root (`c:\Users\Bruno\Desktop\activities tracker`).
- Observe the `[WebServer]` tag in the command output and verify that the test passes, demonstrating the server booted and fulfilled the root request.
