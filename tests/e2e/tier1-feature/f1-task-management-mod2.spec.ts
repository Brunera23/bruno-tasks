import { test, expect } from '@playwright/test';

test.describe('Feature 1 - Task Management MODIFIED 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#loginScreen');
    
    await page.evaluate(() => {
      const ls = document.getElementById('loginScreen');
      if (ls) ls.style.display = 'none';
      const shell = document.querySelector('.shell');
      if (shell) shell.style.display = '';
      localStorage.setItem('bt-v5', '[]');
      if (typeof window.render === 'function') window.render();
    });

    await page.waitForSelector('#tasksView', { state: 'visible' });
    await page.waitForSelector('#btnAdd', { state: 'visible' });
  });

  test('Update a task', async ({ page }) => {
    const taskName = `Task to Update ${Date.now()}`;
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.open', { state: 'visible' }).catch(() => {});
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]');

    await page.waitForSelector('#modal.open', { state: 'hidden' }).catch(() => {});

    const item = page.locator('.item', { hasText: taskName }).first();
    await expect(item).toBeVisible();

    // Fix: Hover first
    await item.hover();
    const editBtn = item.locator('.a-btn:has(svg use[href="#i-edit"])').first();
    await editBtn.click();
    
    await page.waitForSelector('#modal.open', { state: 'visible' }).catch(() => {});

    const updatedName = `${taskName} Updated`;
    await page.fill('#fT', updatedName);
    await page.click('#form button[type="submit"]');

    const updatedItemTitle = page.locator('.item-title', { hasText: updatedName }).first();
    await expect(updatedItemTitle).toBeVisible();
  });
});
