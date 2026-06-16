# Handoff Report: Feature 4 (Filtering & Search) Tier 1 Playwright Tests

## 1. Observation
- The "Bruno Tasks" application uses `index.html` as the main view.
- The filtering and search features are implemented natively via JavaScript:
  - Search input: `<input type="text" id="q">`.
  - Clear button: `<button id="searchClearBtn">`.
  - Quick filters popup toggled by `.search-filter-btn` revealing options like `Alta Prioridade` (sets search to `alta`).
  - Status segmentation: `.seg button` with `data-s` attributes (`all`, `todo`, `doing`, `done`).
  - Tasks are dynamically rendered in `#list` with the `.item` class, and titles are within `.item-title`.

## 2. Logic Chain
- To achieve Tier 1 coverage for Feature 4, we must test the core filtering capabilities in an opaque-box manner.
- The test file requires setup in `test.beforeEach` to populate predictable tasks since the application uses LocalStorage (isolated per Playwright test). We create three tasks: High Priority (Todo), Low Priority (Todo), and Default Priority (Done).
- The 5 required test cases map directly to the observed capabilities:
  1. Searching by text query.
  2. Clearing the search.
  3. Filtering by smart keyword/quick filters (e.g., 'alta').
  4. Filtering by status segment.
  5. Combining text search and status filters.
- These tests use standard Playwright Locators mapped precisely to the HTML structure discovered (`#q`, `.seg button`, `.item-title`).

## 3. Caveats
- The application may have pre-seeded local storage data (e.g., mock tasks) when opened for the first time. The tests use strict text matching and rely on the newly created tasks, which should not conflict unless pre-seeded tasks have the exact same text ("SearchableTask").
- The test assumes standard application execution (no network latency) because state is managed client-side via LocalStorage.

## 4. Conclusion
- The required 5 Tier 1 test cases for Filtering & Search have been implemented and properly target the UI elements found in `index.html`. The code covers the core functionalities of the Feature 4 requirement.

## 5. Verification Method
- Execute the Playwright test suite using the standard project command: `npx playwright test tests/e2e/tier1-feature/f4-filtering-search.spec.ts`. All 5 tests should pass.

---

### Complete Test Code (`tests/e2e/tier1-feature/f4-filtering-search.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature 4: Filtering & Search (Tier 1)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local application
    await page.goto('/');
    
    // Create Task 1: High Priority
    await page.locator('#btnAdd').click();
    await page.locator('#fT').fill('SearchableTask Alpha');
    await page.locator('#fP button[data-v="alta"]').click();
    await page.locator('form#form button[type="submit"]').click();
    
    // Create Task 2: Low Priority
    await page.locator('#btnAdd').click();
    await page.locator('#fT').fill('SearchableTask Beta');
    await page.locator('#fP button[data-v="baixa"]').click();
    await page.locator('form#form button[type="submit"]').click();
    
    // Create Task 3: Done Status
    await page.locator('#btnAdd').click();
    await page.locator('#fT').fill('SearchableTask Gamma');
    await page.locator('#fS button[data-v="done"]').click();
    await page.locator('form#form button[type="submit"]').click();

    // Ensure we are on the 'Todas' tab to see all created tasks
    await page.locator('.seg button[data-s="all"]').click();
    
    // Verify tasks are present
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Gamma' })).toBeVisible();
  });

  test('should filter tasks by text query', async ({ page }) => {
    const searchInput = page.locator('#q');
    
    // Search for Alpha
    await searchInput.fill('Alpha');
    
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeHidden();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Gamma' })).toBeHidden();
  });

  test('should clear search filter using the clear button', async ({ page }) => {
    const searchInput = page.locator('#q');
    const clearBtn = page.locator('#searchClearBtn');
    
    await searchInput.fill('Alpha');
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeHidden();
    
    // Clear the search
    await clearBtn.click();
    
    // Check if input is empty and tasks are visible again
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeVisible();
  });

  test('should filter tasks by smart keyword (e.g., alta priority)', async ({ page }) => {
    // Click quick filter button
    await page.locator('.search-filter-btn').click();
    
    // Select "Alta Prioridade" option
    await page.locator('.qf-opt', { hasText: 'Alta Prioridade' }).click();
    
    // Check if query is set and tasks are filtered
    await expect(page.locator('#q')).toHaveValue('alta');
    
    // Alpha is high priority
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    // Beta is low priority
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeHidden();
  });

  test('should filter tasks by status (todo, doing, done)', async ({ page }) => {
    // Click "Feitas" status segment
    await page.locator('.seg button[data-s="done"]').click();
    
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Gamma' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeHidden();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeHidden();
    
    // Click "A fazer" status segment
    await page.locator('.seg button[data-s="todo"]').click();
    
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Gamma' })).toBeHidden();
  });

  test('should combine text search and status filter', async ({ page }) => {
    // Add another Done task with the keyword 'Alpha'
    await page.locator('#btnAdd').click();
    await page.locator('#fT').fill('SearchableTask Alpha Completed');
    await page.locator('#fS button[data-v="done"]').click();
    await page.locator('form#form button[type="submit"]').click();

    // Ensure we are on 'Todas' initially
    await page.locator('.seg button[data-s="all"]').click();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha Completed' })).toBeVisible();

    // Search for "Alpha"
    await page.locator('#q').fill('Alpha');
    
    // Both Alphas should be visible on 'Todas'
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' }).first()).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha Completed' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeHidden();
    
    // Switch to "Feitas" (Done)
    await page.locator('.seg button[data-s="done"]').click();
    
    // Only the completed Alpha should remain visible
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha Completed' })).toBeVisible();
    // The regular Alpha is 'A fazer', so it should be hidden
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' }).first()).toBeHidden();
  });
});
```
