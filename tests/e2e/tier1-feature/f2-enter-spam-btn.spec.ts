import { test, expect } from '@playwright/test';

test.describe('Feature 2: Modal & UI State Resilience (Tier 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://www.gstatic.com/firebasejs/**', route => route.abort());
    await page.route('**/sw.js**', route => route.abort());

    await page.addInitScript(() => {
      localStorage.setItem('bt-v5', '[]');
      window.firebase = {
        initializeApp: () => {},
        firestore: () => ({ enablePersistence: () => Promise.resolve() }),
        auth: () => ({ onAuthStateChanged: (cb) => setTimeout(() => cb({ uid: 'mock-uid', email: 'mock@mock.com', displayName: 'Mock User' }), 10) }),
        messaging: () => ({ getToken: () => Promise.resolve('mock-token'), onMessage: () => {}, isSupported: () => false })
      };
    });

    await page.goto('/');
    
    await page.addStyleTag({ content: `
      #loginScreen { display: none !important; }
      .shell { display: flex !important; opacity: 1 !important; visibility: visible !important; }
      #fab { display: flex !important; }
    ` });

    await page.waitForSelector('.shell', { state: 'visible' });
    await expect(page.locator('#btnAdd')).toBeVisible();
  });

  test('Focus button and spam Enter test', async ({ page }) => {
    await page.locator('#btnAdd').click();
    await expect(page.locator('#modal')).toHaveClass(/open/);

    await page.locator('#fT').fill('Spam Submit Test');
    
    // Focus the submit button
    const submitBtn = page.locator('#modal button[type="submit"]');
    await submitBtn.focus();

    // Press Enter 3 times rapidly
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await expect(page.locator('#modal')).not.toHaveClass(/open/);

    const itemBodies = page.locator('.item-body');
    await expect(page.locator('#modal')).toHaveCSS('opacity', '0');
    
    const count = await itemBodies.count();
    console.log('ITEMS CREATED:', count);
    expect(count).toBe(1);
  });
});
