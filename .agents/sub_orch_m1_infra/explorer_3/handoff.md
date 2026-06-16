# Handoff: E2E Test Infrastructure Setup

## 1. Observation
- The project root `c:\Users\Bruno\Desktop\activities tracker` currently lacks a `package.json`, `playwright.config.ts`, and a `tests/e2e/` directory.
- The `index.html` file serves as the main entry point and its title is "Bruno Tasks".
- The constraints state that no interactive install commands (like `npm init` or ones requiring confirmation) should be run. Instead, configuration files must be created directly.

## 2. Logic Chain
- Because there is no `package.json`, one must be created containing the required `devDependencies` (`@playwright/test` and `http-server`) so that the project can install them via `npm install` (which typically runs non-interactively if `package.json` is well-formed).
- A `playwright.config.ts` must be created in the root directory to configure the `webServer` to serve the root directory (`npx http-server -p 8080`) and configure the test directory as `tests/e2e/`.
- Creating a minimal test file (e.g., `tests/e2e/example.spec.ts`) establishes the `tests/e2e/` directory structure and proves the basic functionality.

## 3. Caveats
- I did not run `npm install` myself due to my read-only investigation mode. The Implementer will need to create the files and then optionally run `npm install` (or the user will) to fetch the dependencies.
- The version numbers for `@playwright/test` and `http-server` provided in `package.json` are standard modern versions, but might resolve to slightly different patched versions upon `npm install`.

## 4. Conclusion
The Implementer agent should create the following three files directly at the exact paths provided, without running interactive init commands:

**File 1: `c:\Users\Bruno\Desktop\activities tracker\package.json`**
```json
{
  "name": "bruno-tasks",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "http-server": "latest"
  }
}
```

**File 2: `c:\Users\Bruno\Desktop\activities tracker\playwright.config.ts`**
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
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

**File 3: `c:\Users\Bruno\Desktop\activities tracker\tests\e2e\example.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Bruno Tasks/);
});
```

## 5. Verification Method
1. The implementer should run `npm install` after writing `package.json`.
2. The implementer should run `npx playwright install --with-deps chromium` to ensure browsers are installed.
3. The implementer should run `npm run test:e2e` to verify that Playwright starts the `http-server`, serves `index.html`, and successfully passes the `example.spec.ts` test.
