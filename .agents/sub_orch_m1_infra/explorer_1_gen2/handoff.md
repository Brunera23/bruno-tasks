# Handoff Report: Test Infra Setup (Iteration 2)

## 1. Observation
- `index.html` line 12 contains `<title>Bruno Tasks</title>`.
- `tests/e2e/dummy.spec.ts` currently navigates to `/` and runs `expect(true).toBeTruthy();`.
- The required tier directories (`tier1-feature`, `tier2-boundary`, `tier3-pairwise`, `tier4-workload`) are not currently established correctly or are missing in `tests/e2e`.
- `playwright.config.ts` line 17 has `command: 'npx http-server -p 8081'`.

## 2. Logic Chain
- To genuinely verify the application is being served, the `tests/e2e/dummy.spec.ts` must assert that the page title contains "Bruno Tasks" after navigating to `/`. Playwright's `await expect(page).toHaveTitle(/Bruno Tasks/);` directly serves this purpose.
- Reviewer 1 requested disabling caching for `http-server` and using port 8081. The port is already 8081 in `playwright.config.ts`, but the command needs `-c-1` appended to disable caching.
- The project's layout requirements (`TEST_INFRA.md`) require four specific tier directories which must be created to satisfy Reviewer 2.

## 3. Caveats
- No caveats. 

## 4. Conclusion
The worker needs to:
1. Update `tests/e2e/dummy.spec.ts` to assert the correct title.
2. Update `playwright.config.ts` to include `-c-1` in the `webServer` command.
3. Create the missing tier directories under `tests/e2e` with `.gitkeep` files in each so they can be tracked in version control.

## 5. Verification Method
- Run `npx playwright test tests/e2e/dummy.spec.ts` to ensure it passes against the running local server.
- Verify the directories exist.

## Actionable Instructions for the Implementer

1. Replace the contents of `tests/e2e/dummy.spec.ts` with:
```typescript
import { test, expect } from '@playwright/test';

test('basic setup verification', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Bruno Tasks/);
});
```

2. Replace line 17 in `playwright.config.ts` with:
```typescript
    command: 'npx http-server -p 8081 -c-1',
```

3. Execute the following commands in the workspace root to create the directories and their `.gitkeep` files:
```powershell
mkdir -Force "tests\e2e\tier1-feature"; Set-Content "tests\e2e\tier1-feature\.gitkeep" `$null
mkdir -Force "tests\e2e\tier2-boundary"; Set-Content "tests\e2e\tier2-boundary\.gitkeep" `$null
mkdir -Force "tests\e2e\tier3-pairwise"; Set-Content "tests\e2e\tier3-pairwise\.gitkeep" `$null
mkdir -Force "tests\e2e\tier4-workload"; Set-Content "tests\e2e\tier4-workload\.gitkeep" `$null
```
