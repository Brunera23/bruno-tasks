# Milestone 1: Test Infra Setup - Strategy and Findings

## 1. Observation
- Inspected the directory `c:\Users\Bruno\Desktop\activities tracker` and found no `package.json` exists.
- The project is configured for CODE_ONLY mode, which restricts interactive installations.
- The requirements state we need a local webserver (`npx http-server -p 8080`), a `playwright.config.ts` targeting `tests/e2e/`, and `@playwright/test` + `http-server` in `devDependencies`.

## 2. Logic Chain
- Since no `package.json` exists, a new one must be created containing the `devDependencies` directly. This avoids running `npm i -D` which could require confirmations.
- A basic `playwright.config.ts` must be created in the root directory to define the E2E test directory (`./tests/e2e`) and configure the `webServer` option to spin up `http-server` on port 8080.
- A `tests/e2e` directory must be created to hold future tests.

## 3. Caveats
- The versions for `@playwright/test` and `http-server` are provided as standard stable versions (`^1.40.0` and `^14.1.1` respectively) as we cannot fetch latest version via internet/command execution.
- We cannot verify the configuration through execution without running `npm install` afterwards, but the worker should handle the installation and setup steps safely.

## 4. Conclusion
The worker should execute the following steps:
1. Create `c:\Users\Bruno\Desktop\activities tracker\package.json` with the specified dependencies.
2. Create `c:\Users\Bruno\Desktop\activities tracker\playwright.config.ts` with the specified configuration.
3. Create the directory `c:\Users\Bruno\Desktop\activities tracker\tests\e2e`.

### Proposed Code: `package.json`
```json
{
  "name": "activities-tracker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "http-server": "^14.1.1"
  }
}
```

### Proposed Code: `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx http-server -p 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});
```

## 5. Verification Method
- Ensure the files exist at their specified paths.
- Run `npm install` to confirm package configuration is valid.
- Verify running `npx playwright test` (after adding a dummy test) successfully starts the local web server and executes the test.
