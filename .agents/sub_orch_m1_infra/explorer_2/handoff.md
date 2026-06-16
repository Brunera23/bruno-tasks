# Handoff: E2E Test Infra Setup

## Observation
- The project root `c:\Users\Bruno\Desktop\activities tracker` currently does not have a `package.json` or `playwright.config.ts`.
- The `index.html` file exists in the root directory.
- `SCOPE.md` specifies the interface contract: Playwright test files will be in `tests/e2e/tierX/` where X is 1 to 4.
- The user is in CODE_ONLY mode and requested NOT to run installation commands requiring user confirmation, but instead to write configuration files directly.

## Logic Chain
- Since `package.json` does not exist, we must create it from scratch, defining `devDependencies` containing `@playwright/test` and `http-server`.
- The `playwright.config.ts` needs to be created in the root directory, pointing to `./tests/e2e` for tests and defining a local web server (`npx http-server -p 8080`) that serves the root directory (`baseURL: http://127.0.0.1:8080`).
- We need to establish the directory structure: `tests/e2e/` as well as subdirectories for tiers 1 through 4 as outlined in `SCOPE.md`.

## Caveats
- `package.json` is created minimally with just the `devDependencies` and a test script. The developer or a later step may need to run `npm install` (with `--no-fund --no-audit` or similar if automated) to actually download the packages, and `npx playwright install` for browsers.
- No actual tests are written yet; only the folder structure and configuration are established.

## Conclusion
The implementer agent must perform the following actions:

1. **Create `package.json`** at `c:\Users\Bruno\Desktop\activities tracker\package.json` with the following content:
```json
{
  "name": "activities-tracker",
  "version": "1.0.0",
  "description": "Activities Tracker with Playwright E2E Tests",
  "scripts": {
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "http-server": "^14.1.1"
  }
}
```

2. **Create `playwright.config.ts`** at `c:\Users\Bruno\Desktop\activities tracker\playwright.config.ts` with the following content:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npx http-server -p 8080',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

3. **Create the testing directory structure** using these commands (or equivalent):
```powershell
mkdir "c:\Users\Bruno\Desktop\activities tracker\tests\e2e\tier1"
mkdir "c:\Users\Bruno\Desktop\activities tracker\tests\e2e\tier2"
mkdir "c:\Users\Bruno\Desktop\activities tracker\tests\e2e\tier3"
mkdir "c:\Users\Bruno\Desktop\activities tracker\tests\e2e\tier4"
```

## Verification Method
- **Configuration Check**: Ensure `package.json` contains `@playwright/test` and `http-server` as devDependencies. Ensure `playwright.config.ts` contains the webServer definition with `command: 'npx http-server -p 8080'`.
- **Directory Check**: Use `Get-ChildItem -Path "tests\e2e"` to verify the subdirectories exist.
- **Run (Optional/Manual)**: After installing dependencies via `npm install` and `npx playwright install`, running `npm run test:e2e` should start the server and run 0 tests without syntax or configuration errors.
