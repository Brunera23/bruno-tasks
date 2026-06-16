import { test, expect } from '@playwright/test';

test.describe('Feature 2: Form double-submit race condition challenge', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('bt-v5', '[]');
      localStorage.setItem('bt-cats', '[]');
      localStorage.setItem('bt-log', '[]');

      (window as any).currentUser = { uid: 'test-uid', displayName: 'Test User' };
      (window as any)._fbReady = false;
      (window as any)._fbInitDone = false;
    });

    await page.goto('/');
    
    // Force CSS to bypass login screen
    await page.addStyleTag({ content: `
      #loginScreen { display: none !important; }
      .shell { display: flex !important; }
      #fab { display: flex !important; }
    ` });

    await page.evaluate(() => {
      const modal = document.getElementById('modal');
      if (modal) modal.classList.remove('open');
      document.body.classList.remove('modal-open');
    });

    await page.waitForTimeout(500);
  });

  test('Calling requestSubmit() multiple times synchronously', async ({ page }) => {
    await page.locator('#btnAdd').click();
    const modal = page.locator('#modal');
    await expect(modal).toHaveClass(/open/);

    await page.locator('#fT').fill('Race Task');
    
    await page.evaluate(() => {
      const form = document.getElementById('form') as HTMLFormElement;
      form.requestSubmit();
      form.requestSubmit();
      form.requestSubmit();
    });

    await page.waitForTimeout(500);

    const taskElements = await page.locator('.item').count();
    expect(taskElements).toBe(1);
    
    // Ensure that after one submission, we can still open the modal and submit another task.
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);
    await page.locator('#fT').fill('Second Task');
    await page.locator('#modal button[type="submit"]').click();
    
    await page.waitForTimeout(500);
    const updatedTaskElements = await page.locator('.item').count();
    expect(updatedTaskElements).toBe(2);
  });

  test('Clicking submit button multiple times fast', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);
    await page.locator('#fT').fill('Race Task Click');
    
    const submitBtn = page.locator('#modal button[type="submit"]');
    
    // Force click multiple times to bypass Playwright's wait for actionability
    await submitBtn.click({ force: true });
    await submitBtn.click({ force: true });
    await submitBtn.click({ force: true });

    await page.waitForTimeout(500);

    const taskElements = await page.locator('.item').count();
    expect(taskElements).toBe(1);
  });
  
  test('Keyboard double submit via enter on input', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);
    
    await page.locator('#fT').fill('Keyboard Race');
    await page.locator('#fT').focus();
    
    // According to index.html line 4029: 
    // "if(!e.ctrlKey){e.preventDefault();$('#form').querySelector('[type=submit]')?.focus();return}"
    // But what if we spam Ctrl+Enter?
    await page.keyboard.press('Control+Enter');
    await page.keyboard.press('Control+Enter');
    await page.keyboard.press('Control+Enter');
    
    await page.waitForTimeout(500);

    const taskElements = await page.locator('.item').count();
    expect(taskElements).toBe(1);
  });
});
