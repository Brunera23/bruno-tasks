import { test, expect } from '@playwright/test';

test.describe('Adversarial Feature 2: Modal Stress', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('bt-v5', '[]');
      localStorage.setItem('bt-cats', '[]');
      localStorage.setItem('bt-log', '[]');
    });
    
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    await page.addStyleTag({ content: `
      #loginScreen { display: none !important; }
      .shell { display: flex !important; }
      #fab { display: flex !important; }
    ` });

    await page.evaluate(() => {
      (window as any).currentUser = { uid: 'test-uid', displayName: 'Test User' };
      (window as any)._fbReady = false;
      (window as any)._fbInitDone = false;
      
      const modal = document.getElementById('modal');
      if (modal) modal.classList.remove('open');
      document.body.classList.remove('modal-open');
    });

    await page.waitForTimeout(500);
  });

  test('Stress test: Rapidly open and close modal many times', async ({ page }) => {
    for (let i = 0; i < 50; i++) {
      await page.locator('#btnAdd').click();
      await page.keyboard.press('Escape');
    }
    const modal = page.locator('#modal');
    await expect(modal).not.toHaveClass(/open/);
    
    // Ensure that modal-open class is removed from body
    const bodyClass = await page.evaluate(() => document.body.className);
    expect(bodyClass).not.toContain('modal-open');
  });

  test('Race condition: Open modal and click overlay simultaneously', async ({ page }) => {
    // Attempt to click add button and overlay very quickly
    await page.locator('#btnAdd').click();
    await page.locator('#ov').dispatchEvent('click');
    
    const modal = page.locator('#modal');
    await expect(modal).not.toHaveClass(/open/);
  });

  test('State corruption: Trigger Escape when modal is not open', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.locator('#btnAdd').click();
    const modal = page.locator('#modal');
    await expect(modal).toHaveClass(/open/);
  });

  test('Input fuzzing: Very long text in title and then close', async ({ page }) => {
    await page.locator('#btnAdd').click();
    const modal = page.locator('#modal');
    await expect(modal).toHaveClass(/open/);
    const longText = 'A'.repeat(10000);
    await page.locator('#fT').fill(longText);
    await page.keyboard.press('Escape');
    await expect(modal).not.toHaveClass(/open/);
  });
});
