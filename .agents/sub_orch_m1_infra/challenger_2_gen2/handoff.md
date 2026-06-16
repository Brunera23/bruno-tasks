# Challenge Report: Milestone 1 Test Infra (Gen 2)

## Challenge Summary

**Overall risk assessment**: LOW

The test infrastructure setup has been successfully implemented and verified. The worker addressed the previous caching concern and successfully met all constraints. 

## Challenges

### [Low] Challenge 1: Service Worker Caching Override
- **Assumption challenged**: `-c-1` on the `http-server` completely prevents caching in all layers.
- **Attack scenario**: If Playwright's `BrowserContext` was persistent across tests, the Service Worker (`sw.js`) registered by the application could still cache `index.html` regardless of the HTTP server's cache headers.
- **Blast radius**: End-to-end tests could unknowingly pass against a stale version of the app, hiding real regressions.
- **Mitigation/Result**: Playwright isolates tests by launching fresh, incognito `BrowserContext` instances by default. Thus, the Service Worker cache does not persist between test runs. I verified this by dynamically mutating `index.html` to a wrong title and running the test; it immediately failed, confirming that the test reads the fresh file and no cache interference occurs.

## Stress Test Results

- **Scenario**: Mutating `index.html` title to "Wrong Title" during test execution.
  - **Expected behavior**: Playwright test fails to find the correct title.
  - **Actual behavior**: Test failed exactly at `toHaveTitle(/Bruno Tasks/)`.
  - **Result**: PASS (Confirms the test genuinely hits the actual page and caching is disabled).

- **Scenario**: Inspecting test tier directories.
  - **Expected behavior**: Tier 1 through 4 directories exist with `.gitkeep` files.
  - **Actual behavior**: Directories are created and `.gitkeep` files are successfully tracking them.
  - **Result**: PASS.

## Unchallenged Areas

- None. The scope was strictly to verify the caching fix, the dummy test, and the directory layout.

## Conclusion
The test infrastructure setup is robust. The caching issue is resolved, the dummy test correctly asserts genuine application components, and the required test tier directories are present and tracked via `.gitkeep`. The milestone is correctly executed.
