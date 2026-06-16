# Handoff Report: Milestone 1 Test Infra Fixes

**Summary**: Identified the correct app title (`Bruno Tasks`) from `index.html` to be used for the playwright assertion, and structured the steps for the worker to fix `dummy.spec.ts` and create the required test layout directories.

## 1. Observation
- `index.html` at the project root contains `<title>Bruno Tasks</title>` on line 12.
- `tests/e2e/dummy.spec.ts` currently navigates to `/` and asserts `expect(true).toBeTruthy();` on line 5.
- `TEST_INFRA.md` requires four specific directories under `tests/e2e/` which are currently missing.

## 2. Logic Chain
- Reviewer 2 rejected the test setup because `expect(true).toBeTruthy();` is a tautological assert that doesn't prove the app is actually served.
- Updating the test to `await expect(page).toHaveTitle(/Bruno Tasks/);` directly asserts against the actual app content in `index.html`.
- Creating `tests/e2e/tier1-feature/`, `tests/e2e/tier2-boundary/`, `tests/e2e/tier3-pairwise/`, and `tests/e2e/tier4-workload/` resolves the layout requirements violation.

## 3. Caveats
- No caveats. The exact required fix was straightforwardly derived from `index.html` and the reviewer's feedback.

## 4. Conclusion
The worker should implement the following changes:

**Step 1. Update `tests/e2e/dummy.spec.ts`:**
Replace the contents of `tests/e2e/dummy.spec.ts` with:
```typescript
import { test, expect } from '@playwright/test';

test('basic setup verification', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Bruno Tasks/);
});
```

**Step 2. Create the missing test directories:**
Create the following directories, adding a `.gitkeep` file in each so they are tracked by version control:
- `tests/e2e/tier1-feature/.gitkeep`
- `tests/e2e/tier2-boundary/.gitkeep`
- `tests/e2e/tier3-pairwise/.gitkeep`
- `tests/e2e/tier4-workload/.gitkeep`

## 5. Verification Method
- Execute the test command: `npx playwright test tests/e2e/dummy.spec.ts` and ensure it passes.
- Use `ls tests/e2e/` to verify the four tier directories are present and contain `.gitkeep` files.
