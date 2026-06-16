# Challenge Report: Milestone 1 Test Infra

## 1. Observation
- `playwright.config.ts` starts the local webServer using the command `npx http-server -p 8080`.
- The `http-server` package defaults to caching files for 3600 seconds (`Cache-Control: max-age=3600`). No cache-disabling flags (`-c-1`) are present in the Playwright config command.
- `playwright.config.ts` enables `reuseExistingServer: !process.env.CI` and uses a very common port (8080).
- The dummy test (`tests/e2e/dummy.spec.ts`) only navigates to `/` and asserts `expect(true).toBeTruthy()`.

## 2. Logic Chain
- **Caching Issue**: Because `http-server` caches files with `max-age=3600` by default, browser instances will cache `index.html` and other assets. While Playwright clears cache between test runs, within a single test (e.g. testing file modifications or reloads) or during local development using the reused dev server (`reuseExistingServer`), stale files will be served. I empirically proved this by dynamically modifying `index.html` mid-test; `page.reload()` returned the stale, cached HTML instead of the updated one.
- **Weak Verification**: Playwright's `page.goto()` does NOT throw on HTTP 404s or when receiving an HTTP 200 Directory Listing. Because the dummy test only checks `true === true`, it doesn't actually verify that the correct application (`index.html`) is booted and served—only that the server responded with *something*.
- **Port Collision**: Because port 8080 is highly common, and `reuseExistingServer` is enabled, there's a risk that tests will silently run against a completely different application running on port 8080, causing confusing test failures down the line.

## 3. Caveats
- Playwright starts a completely clean browser profile for each test file, so caching across completely distinct test runs via `npm run test:e2e` is mitigated by Playwright's design. The cache issue is primarily a danger during local development with a reused server, or within tests that reload or wait for updates.
- I left temporary test files (`cache-test.spec.ts`, etc.) in `tests/e2e/` as my cleanup commands timed out waiting for user approval. They can be safely ignored or deleted.

## 4. Conclusion
- **Assessment**: HIGH RISK
- The test infrastructure successfully boots the server but contains a critical caching flaw and weak assertion logic that renders the verification unreliable.
- **Mitigation Recommendations**:
  1. Add the `-c-1` flag to the `http-server` command in `playwright.config.ts` to disable caching: `command: 'npx http-server -p 8081 -c-1'`.
  2. Change the server port to something less common (e.g., 8081 or 4173) to avoid dev collisions.
  3. Update `dummy.spec.ts` to assert actual content on the page, such as `expect(page).toHaveTitle(/Activities Tracker/i)`, to ensure the correct HTML is being served.

## 5. Verification Method
- **Cache bug**: Check `http-server` logs or response headers (you will see `Cache-Control: max-age=3600`).
- **Dummy test flaw**: Rename `index.html` to something else and run `npx playwright test`. The dummy test will incorrectly **PASS** because `http-server` returns a 200 OK directory listing, and `goto('/')` does not throw.
