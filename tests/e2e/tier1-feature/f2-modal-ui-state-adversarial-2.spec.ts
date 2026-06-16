import { test, expect } from '@playwright/test';

test.describe('Adversarial Feature 2: Modal & UI State Resilience - Double Clicks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      localStorage.setItem('bt-v5', '[]');
      localStorage.setItem('bt-cats', '[]');
      localStorage.setItem('bt-log', '[]');
    });
    
    await page.reload();
    
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

  test('1. Rapid form submission should not create duplicate tasks', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    await page.locator('#fT').fill('Test Duplicate');
    
    // Evaluate multiple submits bypassing the UI button delay
    await page.evaluate(() => {
        document.getElementById('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
        document.getElementById('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
        document.getElementById('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    
    await page.waitForTimeout(500);

    const items = page.locator('.item');
    const count = await items.count();
    
    // Even if we submit 3 times synchronously, the application should defend against this (e.g. by disabling the form on first submit or setting a lock)
    expect(count).toEqual(1);
  });
});
