import { test, expect } from '@playwright/test';

test.describe('Feature 4: Filtering & Search (Tier 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('bt-v5', '[]');
      localStorage.setItem('bt-ui', JSON.stringify({showDone: true}));
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#loginScreen');
    
    await page.evaluate(() => {
      const ls = document.getElementById('loginScreen');
      if (ls) ls.style.display = 'none';
      const shell = document.querySelector('.shell') as HTMLElement;
      if (shell) shell.style.display = 'flex';
      if (typeof (window as any).render === 'function') (window as any).render();
      if (typeof (window as any).showApp === 'function') (window as any).showApp();
    });

    await page.waitForSelector('#btnAdd', { state: 'visible' });
    
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

    await page.locator('.seg button[data-s="all"]').click();
    
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Gamma' })).toBeVisible();
  });

  test('should filter tasks by text query', async ({ page }) => {
    const searchInput = page.locator('#q');
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
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeVisible();
  });

  test('should filter tasks by smart keyword (e.g., alta priority)', async ({ page }) => {
    await page.locator('.search-filter-btn').click();
    await page.locator('.qf-opt', { hasText: 'Alta Prioridade' }).click();
    await expect(page.locator('#q')).toHaveValue('alta');
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeHidden();
  });

  test('should filter tasks by status (todo, doing, done)', async ({ page }) => {
    await page.locator('.seg button[data-s="done"]').click();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Gamma' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeHidden();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeHidden();
    
    await page.locator('.seg button[data-s="todo"]').click();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Gamma' })).toBeHidden();
  });

  test('should combine text search and status filter', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await page.locator('#fT').fill('SearchableTask Alpha Completed');
    await page.locator('#fS button[data-v="done"]').click();
    await page.locator('form#form button[type="submit"]').click();

    await page.locator('.seg button[data-s="all"]').click();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha Completed' })).toBeVisible();

    await page.locator('#q').fill('Alpha');
    await expect(page.locator('.item-title', { hasText: /^SearchableTask Alpha$/ }).first()).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha Completed' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Beta' })).toBeHidden();
    
    await page.locator('.seg button[data-s="done"]').click();
    await expect(page.locator('.item-title', { hasText: 'SearchableTask Alpha Completed' })).toBeVisible();
    await expect(page.locator('.item-title', { hasText: /^SearchableTask Alpha$/ }).first()).toBeHidden();
  });
});
