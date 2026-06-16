import { test, expect } from '@playwright/test';

test.describe('Feature 1 - Task Management MODIFIED', () => {
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

  test('Create a task', async ({ page }) => {
    await page.click('#btnAdd', { force: true });
    await page.waitForSelector('#modal.open', { state: 'visible' }).catch(() => {});
    await page.fill('#fT', 'New Test Task');
    await page.click('#form button[type="submit"]', { force: true });

    const itemTitle = page.locator('.item-title', { hasText: 'New Test Task' }).first();
    await expect(itemTitle).toBeVisible();
  });

  test('Update a task', async ({ page }) => {
    const taskName = `Task to Update ${Date.now()}`;
    await page.click('#btnAdd', { force: true });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]', { force: true });

    await page.waitForSelector('#modal.open', { state: 'hidden' }).catch(() => {});

    const item = page.locator('.item', { hasText: taskName }).first();
    await expect(item).toBeVisible();

    const editBtn = item.locator('.a-btn:has(svg use[href="#i-edit"])').first();
    // using hover then click to simulate a real user, or just click() which might fail if not visible
    await editBtn.click();
    
    await page.waitForSelector('#modal.open', { state: 'visible' }).catch(() => {});

    const updatedName = `${taskName} Updated`;
    await page.fill('#fT', updatedName);
    await page.click('#form button[type="submit"]', { force: true });

    const updatedItemTitle = page.locator('.item-title', { hasText: updatedName }).first();
    await expect(updatedItemTitle).toBeVisible();
  });

  test('Delete a task', async ({ page }) => {
    const taskName = `Task to Delete ${Date.now()}`;
    await page.click('#btnAdd', { force: true });
    await page.fill('#fT', taskName);
    await page.click('#form button[type="submit"]', { force: true });
    await page.waitForSelector('#modal.open', { state: 'hidden' }).catch(() => {});

    const item = page.locator('.item', { hasText: taskName }).first();
    await expect(item).toBeVisible();

    const delBtn = item.locator('.a-btn.del').first();
    await delBtn.click();
    
    const cfWrap = page.locator('#cfWrap');
    await expect(cfWrap).toHaveClass(/open|show/);
    
    await page.locator('#cfYes').click();

    await expect(item).toBeHidden();
  });
});
