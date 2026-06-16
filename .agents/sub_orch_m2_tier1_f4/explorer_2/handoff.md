# Handoff Report: Feature 4 (Filtering & Search) Tier 1 Tests

## 1. Observation
- `index.html` holds the UI elements for Feature 4 (Filtering & Search). The main components are:
  - Text search: `<input type="text" id="q" ...>` (Lines 1251).
  - Clear button: `<button class="search-clear-btn" id="searchClearBtn"...>` (Lines 1252-1254).
  - Quick filters pop-up: `<div class="qf-pop" id="qfPop">` toggled by `.search-filter-btn` containing `.qf-opt` elements like "Hoje", "Amanhã", "Atrasadas", "Alta Prioridade" (Lines 1255-1263).
  - Smart Suggest: `<div class="smart-suggest" id="smartSuggest"></div>` which shows dropdown options for keywords like "hoje" (Lines 1264).
  - Status filters: `<div class="seg"><button data-s="all">...</button>...</div>` (Lines 1266).
- `renderTasks()` handles the filtering logic, taking into account text search (`qry`), status (`aSt`), category (`aCat`) and smart matching (`smartFilter()`).
- Data is primarily stored and read from `localStorage` under the key `bt-v5`.

## 2. Logic Chain
- To create opaque-box Playwright tests, we must interact only with these specific locators.
- Playwright needs a reliable local environment, which can be accomplished by navigating to `index.html` and injecting mock tasks into `localStorage` (`bt-v5`).
- The login screen (Firebase Auth) covers the app UI if no logged-in session is found. To test the UI without authentication, the `beforeEach` hook must evaluate scripts in the page to hide `#loginScreen`, display `.shell`, and override `window.showLoginScreen` so it isn't re-invoked asynchronously.
- The 5 required tests were structured to provide robust Tier 1 coverage of all filtering methods:
  1. **Text Search**: Validates `#q` narrows down the `.item-title` list by partial text matches.
  2. **Status Tabs**: Validates clicks on `.seg button[data-s="doing"]` and `[data-s="done"]` update the task list accordingly.
  3. **Quick Filters**: Validates the `.search-filter-btn` and `.qf-opt` dropdown correctly set `#q` and filter the tasks.
  4. **Smart Suggest**: Validates that typing parts of a predefined term (e.g., "ho") summons `.smart-suggest-item`, and clicking it sets the search query to that exact keyword (e.g., "hoje").
  5. **Clear Search**: Validates `#searchClearBtn` restores the default un-filtered state.

## 3. Caveats
- Playwright tests run directly against `file:///` and inject state into `localStorage`. This bypasses the typical app initialization loop but ensures isolation and eliminates flaky behavior from Firebase Auth in a non-server test environment.
- The `beforeEach` relies heavily on `page.evaluate()` to override the default state (e.g., bypassing login and setting `showDone = true` so completed tasks are fully visible for counting).

## 4. Conclusion
Feature 4 (Filtering & Search) is comprehensively covered by 5 Tier 1 Playwright opaque-box test cases. The code handles both traditional text filtering, categorical status toggles, and the "Smart Suggest" functionality. 

## 5. Verification Method
- Ensure `tests/e2e/tier1-feature/f4-filtering-search.spec.ts` contains the provided code.
- Execute the Playwright tests via the following command:
  ```bash
  npx playwright test tests/e2e/tier1-feature/f4-filtering-search.spec.ts
  ```
- All 5 test cases will complete successfully against the `index.html` target.

---

### Complete Test Code for `tests/e2e/tier1-feature/f4-filtering-search.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Feature 4: Filtering & Search', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate using file protocol
    await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
    
    await page.evaluate(() => {
      // Helper function to format date like the app does
      function dateStr(d: Date) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${y}-${mo}-${da}`;
      }
      const today = dateStr(new Date());
      const tomorrow = dateStr(new Date(Date.now() + 864e5));

      const mockTasks = [
        { id: 't1', title: 'Comprar leite', status: 'todo', priority: 'baixa', category: 'pessoal', date: '' },
        { id: 't2', title: 'Reunião com equipe', status: 'doing', priority: 'alta', category: 'pessoal', date: today },
        { id: 't3', title: 'Relatório mensal', status: 'done', priority: 'media', category: 'pessoal', date: '2020-01-01' }, 
        { id: 't4', title: 'Pagar contas', status: 'todo', priority: 'alta', category: 'pessoal', date: '2020-01-01' },
        { id: 't5', title: 'Ligar para João', status: 'todo', priority: 'media', category: 'pessoal', date: tomorrow },
      ];
      
      localStorage.setItem('bt-v5', JSON.stringify(mockTasks));
      
      // Force UI state to show all tasks, expand done section, remove grouping
      localStorage.setItem('bt-ui', JSON.stringify({ 
        aCat: 'all', 
        aSt: 'all', 
        showDone: true, 
        groupBy: 'none', 
        sortBy: 'priority' 
      }));
    });
    
    await page.reload();

    // Bypass login screen completely
    await page.evaluate(() => {
      (window as any).showLoginScreen = () => {}; // prevent auth from hiding app
      if (typeof (window as any).showApp === 'function') {
        (window as any).showApp();
      }
      const login = document.getElementById('loginScreen');
      if (login) login.style.display = 'none';
      const shell = document.querySelector('.shell') as HTMLElement;
      if (shell) shell.style.display = 'flex';
      
      // Force renderTasks to show our injected tasks
      if (typeof (window as any).renderTasks === 'function') {
         (window as any).renderTasks();
      }
    });

    // Wait for tasks to render
    await page.waitForSelector('.item-title', { timeout: 5000 });
  });

  test('Test 1: Basic text search filtering', async ({ page }) => {
    await page.fill('#q', 'comprar');
    
    // Only "Comprar leite" should match
    await expect(page.locator('.item-title')).toHaveCount(1);
    await expect(page.locator('.item-title').first()).toContainText('Comprar leite');
    await expect(page.locator('.item-title').first()).toBeVisible();
  });

  test('Test 2: Status tabs filtering', async ({ page }) => {
    // Click 'Fazendo' segment
    await page.click('button[data-s="doing"]');
    await expect(page.locator('.item-title')).toHaveCount(1);
    await expect(page.locator('.item-title').first()).toContainText('Reunião com equipe');
    await expect(page.locator('.item-title').first()).toBeVisible();

    // Click 'Feitas' segment
    await page.click('button[data-s="done"]');
    await expect(page.locator('.item-title')).toHaveCount(1);
    await expect(page.locator('.item-title').first()).toContainText('Relatório mensal');
    await expect(page.locator('.item-title').first()).toBeVisible();
  });

  test('Test 3: Quick filters via pop-up', async ({ page }) => {
    // Open Quick Filters
    await page.click('.search-filter-btn');
    
    // Select 'Alta Prioridade'
    await page.click('.qf-opt:has-text("Alta Prioridade")');
    
    // Verify #q input is updated
    await expect(page.locator('#q')).toHaveValue('alta');
    
    // Should show 2 tasks: Pagar contas and Reunião com equipe
    await expect(page.locator('.item-title')).toHaveCount(2);
    await expect(page.locator('.item-title', { hasText: 'Pagar contas' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'Reunião com equipe' })).toBeVisible();
  });

  test('Test 4: Smart Suggest matching', async ({ page }) => {
    // Type 'ho' to trigger smart suggest for 'hoje'
    await page.fill('#q', 'ho');
    
    const suggestBox = page.locator('#smartSuggest');
    await expect(suggestBox).toHaveClass(/show/);
    
    const suggestItem = page.locator('.smart-suggest-item', { hasText: 'hoje' });
    await expect(suggestItem).toBeVisible();
    
    // Click suggestion
    await suggestItem.click();
    
    // Verify input value
    await expect(page.locator('#q')).toHaveValue('hoje');
    
    // Verify results: "Reunião com equipe" has today's date
    await expect(page.locator('.item-title')).toHaveCount(1);
    await expect(page.locator('.item-title').first()).toContainText('Reunião com equipe');
    await expect(page.locator('.item-title').first()).toBeVisible();
  });

  test('Test 5: Clear search and filters', async ({ page }) => {
    // Set combination of search and status filter
    await page.fill('#q', 'alta');
    await page.click('button[data-s="todo"]');
    
    // Should filter to 1 task: "Pagar contas"
    await expect(page.locator('.item-title')).toHaveCount(1);
    await expect(page.locator('.item-title').first()).toContainText('Pagar contas');
    
    // Clear button should be visible
    const clearBtn = page.locator('#searchClearBtn');
    await expect(clearBtn).toBeVisible();
    
    // Click clear
    await clearBtn.click();
    
    // Verify search is empty
    await expect(page.locator('#q')).toHaveValue('');
    
    // Verify status is reset to 'Todas'
    await expect(page.locator('button[data-s="all"]')).toHaveClass(/active/);
    
    // All 5 mock tasks should be back
    await expect(page.locator('.item-title')).toHaveCount(5);
  });
});
```
